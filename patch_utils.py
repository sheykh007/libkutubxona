import re

with open('core/utils.py', 'r', encoding='utf-8') as f:
    c = f.read()

# Membership requirements
c = c.replace(
    "Kutubxonamizga a'zo bo'lish mutlaqo <b>BEPUL</b> va barcha fuqarolar uchun ochiq!<br><br>",
    "Kutubxonamizga a'zo bo'lish 1 kishi uchun yillik obuna 5000 so'm va barcha fuqarolar uchun ochiq!<br><br>"
)
c = c.replace(
    "yoki o'quvchi guvohnomasi",
    ""
)
c = c.replace(
    "Kitoblarni 15-30 kunga bepul",
    "Kitoblarni 15 kunga bepul"
)
c = c.replace(
    "Kitobxon Kabineti",
    "Kitobxon kabineti"
)
c = c.replace(
    "Ro'yxatdan O'tish",
    "Ro'yxatdan o'tish"
)
# Fix capitalization
c = c.replace(
    "Urgut tuman Axborot-Kutubxona Markaziga",
    "Urgut tuman axborot-kutubxona markaziga"
)

# Contact
c = c.replace("@urgut_akm_admin", "@liburgutchatbot")
c = c.replace("Bog'lanish va Aloqa", "Bog'lanish va aloqa")
c = c.replace("Ish Tartibi va Vaqtlari", "Ish tartibi va vaqtlari")

# Stats
stats_orig = '''        return (
            f"?? <b>Kutubxona Haqida Qisqacha Statistika:</b><br><br>"
            f"• ?? <b>Jami kitob turlari:</b> {total_books} ta nomda<br>"
            f"• ?? <b>Jami kitob nusxalari:</b> {total_items} ta (Hozirda {avail_items} tasi mavjud)<br><br>"
            f"?? <b>Eng ko'p o'qilayotgan / Tavsiya etilgan kitoblar:</b><br>{pop_str}"
        )'''
stats_new = '''        return (
            f"?? <b>Kutubxona haqida qisqacha statistika:</b><br><br>"
            f"• ?? <b>Kutubxona kitoblari soni:</b> 29324 ta (Fond-29324)<br>"
            f"• ?? <b>Kitobxonlar qatnovi soni:</b> 13910 ta<br>"
            f"• ?? <b>Umumiy foydalanuvchilar soni:</b> 18966 ta<br><br>"
            f"?? <b>Eng ko'p o'qilayotgan / tavsiya etilgan kitoblar:</b><br>{pop_str}"
        )'''

c = c.replace(stats_orig, stats_new)

with open('core/utils.py', 'w', encoding='utf-8') as f:
    f.write(c)

print("utils.py patched successfully")
