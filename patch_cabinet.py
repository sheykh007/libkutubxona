import re

with open('templates/cabinet.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('selectedBookForReserve?.title', '(selectedBookForReserve || {}).title')
c = c.replace('selectedIssueForExt?.book_name', '(selectedIssueForExt || {}).book_name')

with open('templates/cabinet.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("cabinet.html patched successfully")
