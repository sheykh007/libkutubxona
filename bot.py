import os
import sys
import django
import logging
from datetime import date
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from asgiref.sync import sync_to_async

# --- Django Setup ---
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_sys.settings')
django.setup()

from core.models import Member, Subscription, Payment, BookIssue
from django.db.models import Sum, Count

# --- Bot Setup ---
TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"
bot = Bot(token=TOKEN)
dp = Dispatcher()

logging.basicConfig(level=logging.INFO)

# --- Handlers ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "📚 **Kutubxona Boshqaruv Botiga xush kelibsiz!**\n\n"
        "Buyruqlar:\n"
        "/check <sigla> - A'zo ma'lumotlarini ko'rish\n"
        "/link <sigla> - Akkauntingizni botga ulash (Parolni tiklash uchun)\n"
        "/stats - Umumiy statistika\n"
        "/id - O'z Telegram ID ni ko'rish"
    )

@dp.message(Command("link"))
async def cmd_link(message: types.Message):
    parts = message.text.split()
    if len(parts) < 2:
        return await message.answer("Iltimos, sigla raqamini kiriting: `/link 1001`", parse_mode="Markdown")
    
    sigla = parts[1]
    member = await sync_to_async(Member.objects.filter(sigla=sigla).first)()
    
    if not member:
        return await message.answer("❌ Bunday sigla raqamli a'zo topilmadi.")
        
    member.chat_id = str(message.chat.id)
    await sync_to_async(member.save)()
    await message.answer("✅ Akkauntingiz muvaffaqiyatli botga ulandi! Endi parolingizni unutgan bo'lsangiz, bot orqali tiklashingiz mumkin.")

@dp.message(Command("id"))
async def cmd_id(message: types.Message):
    await message.answer(f"Sizning Telegram ID: `{message.from_user.id}`", parse_mode="Markdown")

@dp.message(Command("check"))
async def cmd_check(message: types.Message):
    parts = message.text.split()
    if len(parts) < 2:
        return await message.answer("Iltimos, sigla raqamini kiriting: `/check 1001`", parse_mode="Markdown")
    
    sigla = parts[1]
    member = await sync_to_async(Member.objects.filter(sigla=sigla).first)()
    
    if not member:
        return await message.answer("❌ Bunday sigla raqamli a'zo topilmadi.")

    # Get active sub
    sub = await sync_to_async(Subscription.objects.filter(member=member, is_active=True).first)()
    debt = await sync_to_async(lambda: sum(i.jarima_summa for i in BookIssue.objects.filter(member=member, qaytarildi=False)))()

    status_emoji = "✅" if member.holati == 'faol' else "❌"
    text = (
        f"👤 **Ism:** {member.familiya}\n"
        f"🆔 **Sigla:** {member.sigla}\n"
        f"📊 **Holati:** {status_emoji} {member.get_holati_display()}\n"
        f"📅 **A'zolik tugashi:** {sub.end_date if sub else 'Mavjud emas'}\n"
        f"💰 **Qarzdorlik (jarima):** {int(debt or 0):,} so'm\n"
    )
    await message.answer(text, parse_mode="Markdown")

@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    total_members = await sync_to_async(Member.objects.count)()
    active_subs = await sync_to_async(Subscription.objects.filter(is_active=True).count)()
    today_income = await sync_to_async(lambda: Payment.objects.filter(created_at__date=date.today()).aggregate(Sum('amount'))['amount__sum'] or 0)()
    overdue_books = await sync_to_async(lambda: sum(1 for i in BookIssue.objects.filter(qaytarildi=False) if i.kechikish_kunlar > 0))()

    text = (
        f"📊 **Kutubxona Statistikasi**\n\n"
        f"👥 Jami a'zolar: {total_members}\n"
        f"✅ Faol obunalar: {active_subs}\n"
        f"💰 Bugungi tushum: {int(today_income):,} so'm\n"
        f"⚠️ Kechikkan kitoblar: {overdue_books} ta"
    )
    await message.answer(text, parse_mode="Markdown")

async def main():
    print("Bot ishga tushdi...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
