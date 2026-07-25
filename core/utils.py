from collections import Counter
from django.db.models import Count
from core.models import Book, BookIssue, Member

def ai_smart_search(query):
    query = query.lower()
    books = Book.objects.all()
    results = []
    
    # Very basic heuristics for NLP-like smart search
    # This simulates AI search without external APIs
    for book in books:
        score = 0
        title = book.title.lower()
        author = book.author.lower()
        
        # Exact keyword match
        words = query.split()
        for w in words:
            if len(w) > 3:
                if w in title: score += 10
                if w in author: score += 8
        
        if 'ertak' in query or 'bolalar' in query:
            if 'ertak' in title or 'bolalar' in title:
                score += 15
                
        if score > 0:
            results.append({
                'book': book,
                'score': score
            })
            
    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return [r['book'] for r in results[:20]]


def ai_recommendations(member_id):
    try:
        member = Member.objects.get(id=member_id)
        # Find which categories the member reads most
        issues = BookIssue.objects.filter(member=member)
        if issues.exists():
            read_book_names = issues.values_list('book_name', flat=True)
            popular = Book.objects.annotate(issue_count=Count('items__issues')).exclude(title__in=read_book_names).order_by('-issue_count')[:10]
            return popular
        else:
            # New user, recommend popular books
            popular = Book.objects.annotate(issue_count=Count('items__issues')).order_by('-issue_count')[:10]
            return popular
    except Member.DoesNotExist:
        return []

def chat_bot_response(message):
    message = message.lower()
    
    # Generic greetings
    if message in ['salom', 'qalay', 'assalomu alaykum', 'hi', 'start', '/start']:
        return "Assalomu alaykum! Men Kutubxona sun'iy intellekt yordamchisiman. 🤖<br><br>Sizga kerakli kitob yoki adabiyotni topishda yordam bera olaman. Masalan: <i>\"Menga O'tkir Hoshimovning kitoblarini topib ber\"</i> yoki <i>\"Fizikaga oid qanday kitoblar bor?\"</i> deb yozishingiz mumkin."

    # Clean message from common punctuation
    for p in ['.', ',', '?', '!', ':', ';', '"', "'"]:
        message = message.replace(p, ' ')
        
    words = message.split()
    
    # Stop words to ignore
    stop_words = {'kerak', 'topib', 'ber', 'menga', 'uchun', 'iltimos', 'kitob', 'kitoblar', 'adabiyot', 'adabiyotlar', 'haqida', 'bering', 'mumkinmi', 'qidirmoqdaman', 'qidiryapman', 'bormi', 'yo\'qmi', 'va', 'yoki', 'bilan', 'esa', 'men', 'qanday', 'qanaqa', 'qaysi', 'top'}

    # Suffix stripping helper for Uzbek
    def stem_uzbek(word):
        for suffix in ['larni', 'ning', 'dagi', 'dan', 'lar', 'ni', 'ga', 'da', 'im', 'ing']:
            if word.endswith(suffix) and len(word) > len(suffix) + 2:
                return word[:-len(suffix)]
        return word

    cleaned_words = [stem_uzbek(w) for w in words if w not in stop_words and len(w) > 2]

    if not cleaned_words:
        return "Sizning so'rovingiz tushunarsiz. Iltimos, kitob nomi, muallifi yoki janrini (masalan: <i>\"Tarixiy kitoblar bormi?\"</i>) aniqroq kiritib qidiring."

    from django.db.models import Q
    
    # Create a dynamic search query
    query = Q()
    for w in cleaned_words:
        query |= Q(title__icontains=w) | Q(author__icontains=w)
    
    # Base fallback categories logic for general queries
    if any(w in ['tarix', 'o\'tmish'] for w in cleaned_words):
        query |= Q(title__icontains='tarix') | Q(title__icontains='temur') | Q(title__icontains='bobur') | Q(author__icontains='qodiriy')
    if any(w in ['badiiy', 'roman', 'hikoya'] for w in cleaned_words):
        query |= Q(title__icontains='roman') | Q(title__icontains='qissa') | Q(title__icontains='hikoya')
    if any(w in ['ilmiy', 'fan', 'olim'] for w in cleaned_words):
        query |= Q(title__icontains='ilmiy') | Q(title__icontains='fizika') | Q(title__icontains='matematika')
    if any(w in ['o\'quv', 'oquv', 'darslik'] for w in cleaned_words):
        query |= Q(title__icontains='darslik') | Q(title__icontains='qollanma') | Q(title__icontains='sinf')

    books = Book.objects.filter(query).distinct()
    
    results = []
    for book in books:
        score = 0
        title = book.title.lower()
        author = book.author.lower()
        
        # Calculate relevance score based on matched words
        for w in cleaned_words:
            if w in title: score += 25
            if w in author: score += 20
        
        if score > 0:
            results.append({'book': book, 'score': score})
            
    if not results:
        return f"Kechirasiz, <b>\"{', '.join(cleaned_words)}\"</b> so'roviga mos kitoblarni bazadan topa olmadim. Boshqacharoq nom yoki muallifni qidirib ko'ring."
        
    # Sort and return top 5
    results.sort(key=lambda x: x['score'], reverse=True)
    top_books = results[:5]
    
    response = "Sizning so'rovingizga asosan quyidagi kitoblarni topdim:<br><ul>"
    for item in top_books:
        book = item['book']
        response += f"<li style='margin-bottom:8px'><b>{book.title}</b> <br><i style='color:#64748b; font-size:13px;'>Mualif: {book.author}</i></li>"
        
    response += "</ul><p style='margin-top:12px; font-size:13px;'>Bu kitoblardan birini o'qib ko'rishni xohlaysizmi?</p>"
    return response
