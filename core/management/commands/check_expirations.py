import os
import sys
import django
from datetime import date, timedelta
from django.core.management.base import BaseCommand

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_sys.settings')
django.setup()

from core.models import Member, Subscription
import asyncio
from aiogram import Bot

BOT_TOKEN = "8545699860:AAHJoD9ckF6mkannYjh3DqRX7YgPzSVbXrk"

async def send_alert(chat_id, message):
    if not chat_id: return
    async with Bot(token=BOT_TOKEN) as bot:
        try:
            await bot.send_message(chat_id=chat_id, text=message)
            print(f"Sent to {chat_id}: {message}")
        except Exception as e:
            print(f"Failed to send to {chat_id}: {e}")

class Command(BaseCommand):
    help = 'Checks for expiring subscriptions and sends Telegram alerts'

    def handle(self, *args, **options):
        today = date.today()
        three_days = today + timedelta(days=3)
        one_day = today + timedelta(days=1)

        # 1. Update status for actually expired ones
        expired_count = Subscription.objects.filter(is_active=True, end_date__lt=today).update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f"Updated {expired_count} expired subscriptions to inactive"))

        # 2. Get alerts
        from asgiref.sync import sync_to_async

        async def process_alerts():
            # Already expired today
            new_expired = await sync_to_async(lambda: list(Subscription.objects.filter(member__chat_id__isnull=False, end_date=today)))()
            for sub in new_expired:
                msg = f"⚠️ Hurmatli {sub.member.familiya}, sizning a'zolik muddatingiz BUGUN tugadi. Iltimos, uni yangilang."
                await send_alert(sub.member.chat_id, msg)

            # 1 day left
            one_day_subs = await sync_to_async(lambda: list(Subscription.objects.filter(member__chat_id__isnull=False, is_active=True, end_date=one_day)))()
            for sub in one_day_subs:
                msg = f"🔔 Hurmatli {sub.member.familiya}, sizning a'zolik muddatingiz ertaga tugaydi."
                await send_alert(sub.member.chat_id, msg)

            # 3 days left
            three_day_subs = await sync_to_async(lambda: list(Subscription.objects.filter(member__chat_id__isnull=False, is_active=True, end_date=three_days)))()
            for sub in three_day_subs:
                msg = f"ℹ️ Hurmatli {sub.member.familiya}, sizning a'zolik muddatingiz 3 kundan keyin tugaydi."
                await send_alert(sub.member.chat_id, msg)

        asyncio.run(process_alerts())
