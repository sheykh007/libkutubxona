import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_sys.settings')
django.setup()

from core.models import Branch, BookItem

# 2 = Bibliografiya, 8 = Abonement xizmat xonasi
target_branch = Branch.objects.get(id=2)

branches_to_keep = [2, 8]

# Move items from other branches to target_branch
for b in Branch.objects.exclude(id__in=branches_to_keep):
    items = BookItem.objects.filter(branch=b)
    count = items.count()
    if count > 0:
        items.update(branch=target_branch)
        print(f"Moved {count} items from branch {b.id} to branch 2")

# Delete the other branches
deleted_count, _ = Branch.objects.exclude(id__in=branches_to_keep).delete()
print(f"Deleted {deleted_count} branches.")
