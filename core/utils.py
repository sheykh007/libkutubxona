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
