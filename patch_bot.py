with open('core/utils.py', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. 'Kitoblarni 15 kunga bepul mutolaaga olish.' -> 'Kitoblarni 15 kunga mutolaaga olish.'
c = c.replace('Kitoblarni 15 kunga bepul mutolaaga olish.', 'Kitoblarni 15 kunga mutolaaga olish.')

# 2. Extract stats from 'mashhur kitoblar' and move to 'kutubxona haqida'
# Current kutubxona haqida block:
old_haqida = '''        return (
            "?? <b>Urgut Tuman Axborot-Kutubxona Markazi (AKM) haqida ma'lumot:</b><br><br>"
            "Urgut tuman AKM — tuman aholisi, yoshlar, talaba va ilmiy tadqiqotchilar uchun mo'ljallangan zamonaviy axborot va ma'naviyat maskanidir.<br><br>"
            "?? <b>Fond:</b> 1,100 dan ortiq ilmiy, badiiy, mumtoz, tibbiyot va o'quv qo'llanmalari fondi;<br>"
            "?? <b>Raqamli xizmatlar:</b> QR-kodli elektron kitobxonlik bileti, onlayn kitob band qilish va shaxsiy kabinet;<br>"
            "?? <b>AI texnologiyalari:</b> Sun'iy intellekt asosida tezkor kitob tavsiya qilish va aqlli qidiruv;<br>"
            "??? <b>Sharoitlar:</b> Bepul Wi-Fi, shinam mutolaa zali, tadbirlar maydoni va kompyuterlashtirilgan xonalar.<br><br>"
            "?? <b>Manzil:</b> Samarqand viloyati, Urgut tumani markazi."
        )'''

new_haqida = '''        return (
            "?? <b>Urgut Tuman Axborot-Kutubxona Markazi (AKM) haqida ma'lumot:</b><br><br>"
            "Urgut tuman AKM — tuman aholisi, yoshlar, talaba va ilmiy tadqiqotchilar uchun mo'ljallangan zamonaviy axborot va ma'naviyat maskanidir.<br><br>"
            "?? <b>Kutubxona haqida qisqacha statistika:</b><br>"
            "• ?? <b>Kutubxona kitoblari soni:</b> 29324 ta (Fond-29324)<br>"
            "• ?? <b>Kitobxonlar qatnovi soni:</b> 13910 ta<br>"
            "• ?? <b>Umumiy foydalanuvchilar soni:</b> 18966 ta<br><br>"
            "?? <b>Raqamli xizmatlar:</b> QR-kodli elektron kitobxonlik bileti, onlayn kitob band qilish va shaxsiy kabinet;<br>"
            "?? <b>AI texnologiyalari:</b> Sun'iy intellekt asosida tezkor kitob tavsiya qilish va aqlli qidiruv;<br>"
            "??? <b>Sharoitlar:</b> Bepul Wi-Fi, shinam mutolaa zali, tadbirlar maydoni va kompyuterlashtirilgan xonalar.<br><br>"
            "?? <b>Manzil:</b> Samarqand viloyati, Urgut tumani markazi."
        )'''

if '?? <b>Fond:</b> 1,100 dan' in c:
    c = c.replace('?? <b>Fond:</b> 1,100 dan', '?? <b>Kutubxona kitoblari soni:</b> 29324 dan')

# I will just write a regex or explicit replace.

