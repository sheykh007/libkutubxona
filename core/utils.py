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
        return "Assalomu alaykum! Men kutubxonangizning sun'iy intellekt yordamchisiman. Sizga qanday kitoblar kerak? (Masalan: Badiiy, Tarixiy, Ilmiy yoki O'quv adabiyotlari)"

    # Define robust category keywords
    categories = {
        'tarixiy': ['tarix', 'temur', 'bobur', 'manguberdi', 'xonlik', 'amirlik', 'sulton', 'qadimiy', 'o\'tmish', 'qodiriy', 'navoiy', 'yassaviy', 'o\'tkan kunlar', 'tarixiy', 'biografiya', 'shajara', 'hukmdor', 'urush', 'qahramon'],
        'badiiy': ['roman', 'qissa', 'hikoya', 'she\'r', 'doston', 'adabiyot', 'badiiy', 'ertak', 'asar', 'cho\'lpon', 'qahhor', 'hoshimov', 'detektiv', 'sarguzasht', 'fantastika', 'sevgi', 'muhabbat'],
        'ilmiy': ['ilmiy', 'fan', 'fizika', 'matematika', 'kimyo', 'biologiya', 'texnologiya', 'tibbiyot', 'qonun', 'nazariya', 'ensiklopediya', 'lug\'at', 'akademiya', 'tadqiqot', 'oliy', 'falsafa', 'astronomiya'],
        'oquv': ['darslik', 'qollanma', 'qo\'llanma', 'sinf', 'maktab', 'universitet', 'mashq', 'test', 'grammatika', 'o\'quv', 'talaba', 'metodika', 'pedagogika', 'lug\'at', 'abituriyent', 'masalalar', 'yechimlar']
    }

    # Clean message from common punctuation
    for p in ['.', ',', '?', '!', ':', ';', '"', "'"]:
        message = message.replace(p, ' ')
        
    words = message.split()
    
    # Stop words to ignore
    stop_words = {'kerak', 'topib', 'ber', 'menga', 'uchun', 'iltimos', 'kitob', 'kitoblar', 'adabiyot', 'adabiyotlar', 'haqida', 'bering', 'mumkinmi', 'qidirmoqdaman', 'qidiryapman', 'bormi', 'yo\'qmi', 'va', 'yoki', 'bilan', 'esa'}

    # Suffix stripping helper for Uzbek
    def stem_uzbek(word):
        for suffix in ['larni', 'ning', 'dagi', 'dan', 'lar', 'ni', 'ga', 'da', 'im', 'ing']:
            if word.endswith(suffix) and len(word) > len(suffix) + 2:
                return word[:-len(suffix)]
        return word

    cleaned_words = [stem_uzbek(w) for w in words if w not in stop_words and len(w) > 2]

    # Identify user intent based on cleaned words
    target_categories = []
    for w in cleaned_words:
        if 'tarix' in w or 'o\'tmish' in w: target_categories.append('tarixiy')
        elif 'badiiy' in w or 'roman' in w or 'hikoya' in w or 'ertak' in w: target_categories.append('badiiy')
        elif 'ilmiy' in w or 'fan' in w or 'olim' in w: target_categories.append('ilmiy')
        elif 'o\'quv' in w or 'oquv' in w or 'dars' in w or 'qollanma' in w: target_categories.append('oquv')

    books = Book.objects.all()
    results = []
    
    for book in books:
        score = 0
        title = book.title.lower()
        author = book.author.lower()
        
        # Auto-classify the book by keywords in its title/author
        book_categories = []
        for cat, keywords in categories.items():
            if any(kw in title or kw in author for kw in keywords):
                book_categories.append(cat)
                
        # Base score if book is in target category
        for tc in target_categories:
            if tc in book_categories:
                score += 30
            
        # Keyword matching from user's cleaned words against title and author
        for w in cleaned_words:
            if w in title: 
                score += 25
            if w in author: 
                score += 20
                
        if score > 0:
            cat_labels = []
            if 'badiiy' in book_categories: cat_labels.append('🎭 Badiiy')
            if 'tarixiy' in book_categories: cat_labels.append('🏛 Tarixiy')
            if 'ilmiy' in book_categories: cat_labels.append('🔬 Ilmiy')
            if 'oquv' in book_categories: cat_labels.append('📚 O\'quv')
            
            label_str = f" <span style='font-size:11px; color:#4F46E5;'>[{', '.join(cat_labels)}]</span>" if cat_labels else ""
            
            results.append({
                'book': book, 
                'score': score,
                'label': label_str
            })
            
    if not results:
        return "Kechirasiz, so'rovingizga mos yoki bu mavzudagi kitoblarni bazadan topa olmadim. Boshqacharoq qidirib ko'ring, yoki kitob nomini/muallifini aniqroq yozing."
        
    # Sort and return top 6
    results.sort(key=lambda x: x['score'], reverse=True)
    top_books = results[:6]
    
    response = "So'rovingiz tahlil qilinib, quyidagi kitoblar mos deb topildi:\n<br><br>"
    for i, item in enumerate(top_books, 1):
        book = item['book']
        response += f"{i}. <b>{book.title}</b> (<i>{book.author}</i>){item['label']}<br>"
        
    response += "<br>Boshqa yana qanday asarlar sizni qiziqtiradi?"
    return response
