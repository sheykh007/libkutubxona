import re
import difflib
from collections import Counter
from django.db.models import Q, Count
from core.models import Book, BookItem, BookIssue, Member, Branch

# Transliteration mappings (Cyrillic <-> Latin) for Uzbek and Russian
CYR_TO_LAT = {
    'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'yo', 'ж':'j',
    'з':'z', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o',
    'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'x', 'ц':'ts',
    'ч':'ch', 'ш':'sh', 'щ':'sh', 'ъ':'', 'ы':'i', 'ь':'', 'э':'e', 'ю':'yu',
    'я':'ya', 'ў':'o\'', 'ғ':'g\'', 'қ':'q', 'ҳ':'h'
}

LAT_TO_CYR = {
    'yo':'ё', 'ch':'ч', 'sh':'ш', 'yu':'ю', 'ya':'я', 'ts':'ц',
    "o'":'ў', "g'":'ғ', "o`":'ў', "g`":'ғ', "o’":'ў', "g’":'ғ',
    'a':'а', 'b':'б', 'v':'в', 'g':'г', 'd':'д', 'e':'е', 'j':'ж',
    'z':'з', 'i':'и', 'y':'й', 'k':'к', 'l':'л', 'm':'м', 'n':'н',
    'o':'о', 'p':'п', 'r':'р', 's':'с', 't':'т', 'u':'у', 'f':'ф',
    'x':'х', 'h':'ҳ', 'q':'қ'
}

def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    # Normalize various apostrophe and quote characters
    text = re.sub(r"[\'’`ʻʼ‘\"]", "'", text)
    # Remove excessive punctuation
    text = re.sub(r"[,\.?!:;\(\)\[\]\{\}\-_+=/\\]", " ", text)
    return " ".join(text.split())

def cyrillic_to_latin(text):
    res = ''
    for char in text.lower():
        res += CYR_TO_LAT.get(char, char)
    return res

def latin_to_cyrillic(text):
    text = text.lower()
    # Replace two-character compounds first
    for lat, cyr in [('yo','ё'), ('ch','ч'), ('sh','ш'), ('yu','ю'), ('ya','я'), ('ts','ц'), ("o'",'ў'), ("g'",'ғ'), ("o’",'ў'), ("g’",'ғ'), ("o`",'ў'), ("g`",'ғ')]:
        text = text.replace(lat, cyr)
    res = ''
    for char in text:
        res += LAT_TO_CYR.get(char, char)
    return res

def stem_uzbek(word):
    # Common Uzbek and Russian suffixes
    suffixes = [
        'larning', 'laridan', 'lariga', 'larida', 'larni', 'lardan', 'larda', 'larga',
        'ning', 'dagi', 'dan', 'lar', 'ni', 'ga', 'da', 'im', 'ing', 'imiz', 'ingiz',
        'lari', 'si', 'i', 'dek', 'day', 'cha',
        'ов', 'ева', 'ова', 'ев', 'ский', 'ская', 'ского', 'ских', 'ий', 'ая', 'ое', 'ые'
    ]
    for s in sorted(suffixes, key=len, reverse=True):
        if word.endswith(s) and len(word) > len(s) + 2:
            return word[:-len(s)]
    return word

STOP_WORDS = {
    'kerak', 'topib', 'ber', 'menga', 'uchun', 'iltimos', 'kitob', 'kitoblar',
    'adabiyot', 'adabiyotlar', 'haqida', 'bering', 'mumkinmi', 'qidirmoqdaman',
    'qidiryapman', 'bormi', 'yo\'qmi', 'va', 'yoki', 'bilan', 'esa', 'men',
    'qanday', 'qanaqa', 'qaysi', 'top', 'bor', 'yoq', 'qidir', 'izla', 'qani',
    'qayerda', 'bolsa', 'bormikan', 'kitobi', 'kitobini', 'asari', 'asarlari',
    'adabiyoti', 'bormi', 'qiling', 'boladimi', 'boladi', 'kitoblaridan',
    'книга', 'книги', 'найти', 'ищу', 'есть', 'для', 'меня', 'пожалуйста'
}

def ai_smart_search(query):
    if not query:
        return []
    norm = normalize_text(query)
    lat_norm = cyrillic_to_latin(norm)
    cyr_norm = latin_to_cyrillic(norm)
    
    words = norm.split()
    stems = {stem_uzbek(w) for w in words if w not in STOP_WORDS and len(w) > 2}
    for w in list(stems):
        stems.add(cyrillic_to_latin(w))
        stems.add(latin_to_cyrillic(w))
        
    q_filter = Q()
    for s in stems:
        q_filter |= Q(title__icontains=s) | Q(author__icontains=s)
        
    books = Book.objects.filter(q_filter).distinct()
    return list(books[:20])

def ai_recommendations(member_id):
    try:
        member = Member.objects.get(id=member_id)
        issues = BookIssue.objects.filter(member=member)
        if issues.exists():
            read_book_names = issues.values_list('book_name', flat=True)
            popular = Book.objects.annotate(issue_count=Count('items__issues')).exclude(title__in=read_book_names).order_by('-issue_count')[:10]
            return popular
        else:
            popular = Book.objects.annotate(issue_count=Count('items__issues')).order_by('-issue_count')[:10]
            return popular
    except Member.DoesNotExist:
        return []

def chat_bot_response(message):
    if not message or not message.strip():
        return "Assalomu alaykum! Men Kutubxona AI yordamchisiman. Sizga qanday kitob yoki ma'lumot kerak?"

    raw_msg = message.strip()
    norm_msg = normalize_text(raw_msg)
    lat_msg = cyrillic_to_latin(norm_msg)
    cyr_msg = latin_to_cyrillic(norm_msg)

    words = norm_msg.split()
    cleaned_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]

    # 1. GREETINGS & INTRO
    greetings = ['salom', 'assalomu alaykum', 'assalom', 'qalay', 'hi', 'hello', 'start', '/start', 'privet', 'zdravstvuyte', 'qandaysiz', 'qalaysiz', 'kimsan', 'kim bu', 'yordam', 'help']
    if any(norm_msg == g or norm_msg.startswith(g + ' ') for g in greetings) and len(cleaned_words) <= 2:
        return (
            "<b>Assalomu alaykum!</b> Men Kutubxona boshqaruv tizimining <b>aqlli AI yordamchisiman</b>. 🤖✨<br><br>"
            "Men sizga quyidagi amallarda yordam bera olaman:<br>"
            "• 📚 <b>Kitob qidirish</b> (masalan: <i>\"Shavkat Mirziyoyev kitoblari\"</i> yoki <i>\"Tarixiy asarlar bormi?\"</i>)<br>"
            "• 🔍 <b>Muallif yoki mavzu bo'yicha saralash</b> (masalan: <i>\"O'tkir Hoshimov asarlari\"</i>)<br>"
            "• 🏢 <b>Kutubxona bo'limlari</b> va <b>kitobning mavjudligi</b>ni tekshirish<br>"
            "• 🕒 <b>Ish vaqti va qoidalar</b> haqida ma'lumot olish<br><br>"
            "Sizga aynan qanday kitob yoki ma'lumot kerak?"
        )

    # 1.1 RECOMMENDATIONS & GENERAL CATALOG
    if any(k in lat_msg for k in ['tavsiya', 'maslahat', 'qaysi kitoblar bor', 'qanday kitoblar bor', 'eng yaxshi', 'oqishga nima', 'nimani oqiy', 'yangi kitoblar']):
        popular = Book.objects.all().order_by('-created_at')[:5]
        res = "🌟 <b>Sizga quyidagi eng yaxshi va ommabop kitoblarni tavsiya qilaman:</b><br><br>"
        for idx, b in enumerate(popular, 1):
            avail = b.items.filter(status='available').count()
            avail_tag = f"<span style='color:#10b981;font-size:11px;font-weight:700;'>🟢 Mavjud ({avail} ta)</span>" if avail > 0 else "<span style='color:#ef4444;font-size:11px;font-weight:700;'>🔴 Band</span>"
            res += (
                f"<div style='background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.03);'>"
                f"<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:8px;'>"
                f"<div style='font-weight:700;color:#0f172a;font-size:14px;'>{idx}. {b.title}</div>"
                f"{avail_tag}"
                f"</div>"
                f"<div style='color:#475569;font-size:12px;margin-top:6px;'>✍️ Muallif: <b>{b.author}</b>" + (f" | 📅 {b.published_year}-yil" if b.published_year else "") + f"</div>"
                f"</div>"
            )
        res += "<p style='margin-top:8px;font-size:12px;color:#64748b;'>Aniq bir muallif yoki janr (masalan: <i>\"Tarix\"</i>, <i>\"Badiiy\"</i>) bo'yicha qidirish uchun nomini yozishingiz mumkin.</p>"
        return res

    # 2. LIBRARY RULES, WORKING HOURS, BRANCHES & FAQ
    if any(k in lat_msg for k in ['ish vaqti', 'qachon ochiq', 'qachon ishlaydi', 'soat nechada', 'grafik', 'ish tartibi']):
        return (
            "🕒 <b>Kutubxona Ish Tartibi:</b><br><br>"
            "• <b>Dushanba - Shanba:</b> 09:00 dan 18:00 gacha<br>"
            "• <b>Tushlik tanaffusi:</b> 13:00 - 14:00<br>"
            "• <b>Yakshanba:</b> Dam olish kuni<br><br>"
            "Kitob buyurtma qilish va qaytarish bo'yicha xizmatlar ish vaqtida amalga oshiriladi."
        )

    if any(k in lat_msg for k in ['qanday azo', 'azolik', 'royxatdan', 'a\'zo bolish', 'qanaqa azo']):
        return (
            "👤 <b>Kutubxonaga a'zo bo'lish tartibi:</b><br><br>"
            "1. Tizimda <b>Kitobxon Kabineti</b> orqali onlayn ro'yxatdan o'tishingiz mumkin.<br>"
            "2. Ro'yxatdan o'tgach, sizga noyob <b>Sigla raqami</b> (masalan: <code>FEA000123</code>) va shaxsiy QR-kodli elektron kitobxonlik kartasi taqdim etiladi.<br>"
            "3. Operator so'rovingizni tasdiqlagach, to'liq kitob olish imkoniyatiga ega bo'lasiz."
        )

    if any(k in lat_msg for k in ['jarima', 'kechikish', 'tolov', 'muddat uzaytirish', 'necha kun']):
        return (
            "📖 <b>Kitob olish va muddat qoidalari:</b><br><br>"
            "• Kitoblar odatda <b>10 kundan 30 kungacha</b> muddatga beriladi.<br>"
            "• Muddatni shaxsiy kabinet orqali uzaytirish uchun so'rov yuborish mumkin.<br>"
            "• Belgilangan muddatdan kechiktirilgan har bir kun uchun <b>500 so'm</b> jarima hisoblanadi."
        )

    if any(k in lat_msg for k in ['bolim', 'filial', 'qaysi xona', 'qayerda joylashgan']):
        branches = Branch.objects.all()
        branch_list = "".join([f"• 🏛️ <b>{b.name}</b>" + (f" - <i>{b.address}</i>" if b.address else "") + "<br>" for b in branches])
        return (
            f"🏢 <b>Kutubxonamizdagi xizmat bo'limlari:</b><br><br>"
            f"{branch_list if branch_list else '• 🏛️ Bibliografiya<br>• 🏛️ Abonement xizmat xonasi<br>'}<br>"
            "Kitoblar ushbu bo'limlarda saqlanadi va inventar raqami orqali beriladi."
        )

    if any(k in lat_msg for k in ['statistika', 'eng kop oqilgan', 'mashhur kitoblar', 'trend']):
        total_books = Book.objects.count()
        total_items = BookItem.objects.count()
        avail_items = BookItem.objects.filter(status='available').count()
        popular_issues = BookIssue.objects.values('book_name').annotate(c=Count('id')).order_by('-c')[:5]
        
        pop_str = ""
        if popular_issues:
            for idx, p in enumerate(popular_issues, 1):
                pop_str += f"{idx}. <b>{p['book_name']}</b> ({p['c']} marta olingan)<br>"
        else:
            sample_books = Book.objects.all()[:4]
            for idx, b in enumerate(sample_books, 1):
                pop_str += f"{idx}. <b>{b.title}</b> ({b.author})<br>"

        return (
            f"📊 <b>Kutubxona Haqida Qisqacha Statistika:</b><br><br>"
            f"• 📚 <b>Jami kitob turlari:</b> {total_books} ta nomda<br>"
            f"• 📖 <b>Jami kitob nusxalari:</b> {total_items} ta (Hozirda {avail_items} tasi mavjud)<br><br>"
            f"🔥 <b>Eng ko'p o'qilayotgan / Tavsiya etilgan kitoblar:</b><br>{pop_str}"
        )

    # 3. ADVANCED SEARCH ACROSS BOOKS
    words = norm_msg.split()
    cleaned_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    
    # Extract search terms and variants
    search_terms = set()
    for w in cleaned_words:
        stem = stem_uzbek(w)
        search_terms.add(w)
        search_terms.add(stem)
        search_terms.add(cyrillic_to_latin(w))
        search_terms.add(cyrillic_to_latin(stem))
        search_terms.add(latin_to_cyrillic(w))
        search_terms.add(latin_to_cyrillic(stem))

    # Extract year if specified (e.g. 2021, 2023, 2024, 2025)
    year_match = re.search(r'\b(19\d\d|20\d\d)\b', raw_msg)
    target_year = int(year_match.group(1)) if year_match else None

    # Construct intelligent Q filters
    query_q = Q()
    for term in search_terms:
        if len(term) >= 2:
            query_q |= Q(title__icontains=term) | Q(author__icontains=term)
            
    if target_year:
        query_q |= Q(published_year=target_year)

    # Fallback thematic keywords
    thematic_categories = {
        'tarix': ['tarix', 'temur', 'bobur', 'manguberdi', 'amirlik', 'xonlik', 'qadimgi', 'otmish', 'urush', 'войны', 'история', 'давлат'],
        'badiiy': ['roman', 'qissa', 'hikoya', 'doston', 'she\'r', 'asar', 'ertak', 'badiiy', 'adabiyot', 'роман', 'рассказ', 'повесть', 'navoiy', 'qodiriy', 'cholpon', 'hoshimov'],
        'ilmiy': ['ilmiy', 'fan', 'tadqiqot', 'fizika', 'matematika', 'kimyo', 'biologiya', 'iqtisod', 'falsafa', 'наука', 'исследования'],
        'oquv': ['darslik', 'qollanma', 'maktab', 'talaba', 'til', 'grammatika', 'tilshunoslik', 'учебник', 'пособие', 'язык'],
        'ensiklopediya': ['ensiklopediya', 'lugat', 'qomus', 'энциклопедия', 'словарь'],
        'siyosat': ['prezident', 'strategiya', 'islohot', 'qonun', 'davlat', 'jamiyat', 'murojaatnoma', 'реформы', 'послание']
    }

    matched_themes = []
    for theme, kw_list in thematic_categories.items():
        if any(kw in lat_msg or kw in cyr_msg for kw in kw_list):
            matched_themes.append(theme)
            for kw in kw_list[:4]:
                query_q |= Q(title__icontains=kw) | Q(author__icontains=kw)

    found_books = Book.objects.filter(query_q).distinct() if query_q else Book.objects.none()

    # Calculate smart scoring for ranking
    scored_results = []
    all_books_cache = list(Book.objects.all())

    for book in found_books:
        score = 0
        b_title_lat = cyrillic_to_latin(normalize_text(book.title))
        b_author_lat = cyrillic_to_latin(normalize_text(book.author))
        
        # Check matching words
        for term in search_terms:
            t_lat = cyrillic_to_latin(term)
            if t_lat in b_title_lat:
                score += 35
            if t_lat in b_author_lat:
                score += 30

        if target_year and book.published_year == target_year:
            score += 25

        for theme in matched_themes:
            if any(kw in b_title_lat for kw in thematic_categories[theme]):
                score += 15

        scored_results.append((book, score))

    # If no direct Q matches, attempt fuzzy matching across all books
    if not scored_results:
        for book in all_books_cache:
            b_text = f"{cyrillic_to_latin(book.title)} {cyrillic_to_latin(book.author)}".lower()
            ratio = difflib.SequenceMatcher(None, lat_msg, b_text).ratio()
            # Check individual word similarity
            word_ratios = [difflib.SequenceMatcher(None, w, b_text).ratio() for w in cleaned_words] if cleaned_words else [0]
            max_word_ratio = max(word_ratios) if word_ratios else 0
            
            if ratio > 0.35 or max_word_ratio > 0.7:
                scored_results.append((book, int(max(ratio, max_word_ratio) * 100)))

    # Sort results by score descending
    scored_results.sort(key=lambda x: x[1], reverse=True)
    top_books = [item[0] for item in scored_results[:6]]

    # If still nothing found, provide helpful recommendations
    if not top_books:
        latest = Book.objects.order_by('-created_at')[:4]
        res = f"Kechirasiz, <b>\"{raw_msg}\"</b> so'rovi bo'yicha aynan mos keluvchi kitob topilmadi. 🧐<br><br>"
        res += "💡 <b>Kutubxonamizdagi eng yangi va mashhur kitoblardan tavsiyalar:</b><br><br>"
        for idx, b in enumerate(latest, 1):
            avail = b.items.filter(status='available').count()
            avail_tag = f"<span style='color:#10b981;font-size:12px;font-weight:600;'>● {avail} ta mavjud</span>" if avail > 0 else "<span style='color:#ef4444;font-size:12px;font-weight:600;'>● Hozirda band</span>"
            res += (
                f"<div style='background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:10px 14px;margin-bottom:8px;'>"
                f"<div style='font-weight:700;color:#1e293b;font-size:14px;'>{idx}. {b.title}</div>"
                f"<div style='color:#64748b;font-size:12px;margin-top:2px;'>✍️ {b.author} " + (f" | 📅 {b.published_year}-yil" if b.published_year else "") + f" | {avail_tag}</div>"
                f"</div>"
            )
        res += "<br><i style='font-size:12px;color:#64748b;'>Muallif ismini yoki kitob nomining bir qismini kiritib qayta qidirib ko'ring.</i>"
        return res

    # Format beautiful response cards for the matched books
    response = f"🔍 So'rovingiz tahlil qilindi. <b>Quyidagi kitoblar topildi:</b><br><br>"
    for idx, book in enumerate(top_books, 1):
        # Calculate availability & branch
        items = book.items.all()
        avail_count = items.filter(status='available').count()
        total_items = items.count()
        
        # Get branches where copies exist
        branches_found = set(items.values_list('branch__name', flat=True))
        branch_str = ", ".join([b for b in branches_found if b]) if branches_found else "Abonement xizmat xonasi"

        if avail_count > 0:
            status_html = f"<span style='color:#10b981;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;'>🟢 Mavjud ({avail_count} ta)</span>"
        else:
            status_html = f"<span style='color:#ef4444;background:rgba(239,68,68,0.12);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;'>🔴 Band ({total_items} ta olingan)</span>"

        year_str = f" | 📅 <b>{book.published_year}</b>-yil" if book.published_year else ""

        response += (
            f"<div style='background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.03);'>"
            f"<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:8px;'>"
            f"<div style='font-weight:700;color:#0f172a;font-size:14px;line-height:1.3;'>{idx}. {book.title}</div>"
            f"{status_html}"
            f"</div>"
            f"<div style='color:#475569;font-size:12px;margin-top:6px;'>"
            f"✍️ Muallif: <b>{book.author}</b>{year_str}"
            f"</div>"
            f"<div style='color:#64748b;font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;'>"
            f"📍 Bo'lim: <i>{branch_str}</i>"
            f"</div>"
            f"</div>"
        )

    response += "<p style='margin-top:10px;font-size:12px;color:#64748b;'>💡 <i>Kitobni olish uchun <b>Kitob Berish</b> bo'limida a'zo sigla raqami orqali rasmiylashtirishingiz mumkin.</i></p>"
    return response
