import re

with open('core/views.py', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. monthly_issues
old_monthly = '''            monthly_issues.append({
                'month': month_label,
                'year': m_date.year,
                'issued': m_issued if m_issued > 0 else (120 + (i * 14) % 75),
                'returned': m_returned if m_returned > 0 else (90 + (i * 11) % 60)
            })'''
new_monthly = '''            monthly_issues.append({
                'month': month_label,
                'year': m_date.year,
                'issued': m_issued,
                'returned': m_returned
            })'''
c = c.replace(old_monthly, new_monthly)

# 2. activity_6m
old_act = '''            activity_6m.append({
                'month': month_label,
                'count': act_count if act_count > 0 else (350 + (i * 90) % 300)
            })'''
new_act = '''            activity_6m.append({
                'month': month_label,
                'count': act_count
            })'''
c = c.replace(old_act, new_act)

# 3. category_stats
old_cat = '''        category_stats = [
            {'name': 'Badiiy adabiyot', 'percent': 32, 'color': '#2563EB'},
            {'name': 'Ilmiy adabiyot', 'percent': 18, 'color': '#0EA5E9'},
            {'name': 'Tarixiy adabiyot', 'percent': 12, 'color': '#10B981'},
            {'name': 'Diniy adabiyot', 'percent': 10, 'color': '#F59E0B'},
            {'name': 'Bolalar adabiyoti', 'percent': 8, 'color': '#8B5CF6'},
            {'name': 'Boshqa', 'percent': 20, 'color': '#94A3B8'}
        ]'''
new_cat = '''        cat_counts = Book.objects.values('category').annotate(c=Count('id')).order_by('-c')
        total_cat_books = sum(item['c'] for item in cat_counts)
        category_stats = []
        colors = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8']
        if total_cat_books > 0:
            for idx, item in enumerate(cat_counts[:6]):
                pct = round(item['c'] * 100 / total_cat_books)
                color = colors[idx % len(colors)]
                category_stats.append({'name': item['category'] or 'Boshqa', 'percent': pct, 'color': color})
        else:
            category_stats = [{'name': 'Ma\\'lumot yo\\'q', 'percent': 100, 'color': '#94A3B8'}]'''
c = c.replace(old_cat, new_cat)

with open('core/views.py', 'w', encoding='utf-8') as f:
    f.write(c)

print('Success')
