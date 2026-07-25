import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_sys.settings')
django.setup()

from core.models import Branch, Member

with open('branches_members.txt', 'w', encoding='utf-8') as f:
    for b in Branch.objects.all():
        f.write(f"{b.id}: {b.name} (Members: {Member.objects.filter(branch=b).count()})\n")
