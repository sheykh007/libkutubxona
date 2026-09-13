import re
import sys

def patch_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        print(f"Skipping {filepath}")
        return

    # 1. Replace b.items?.filter(i=>i.status==='available').length with getBookAvailableCount(b)
    content = re.sub(r'([a-zA-Z0-9_]+)\.items\?\.filter\(i=>i\.status===\'available\'\)\.length', r'getBookAvailableCount(\1)', content)
    
    # 2. Replace b.items?.length with getBookTotalCount(b)
    content = re.sub(r'([a-zA-Z0-9_]+)\.items\?\.length', r'getBookTotalCount(\1)', content)
    
    # 3. Replace Array.from(new Set((b.items || []).map(item => item.branch_name).filter(Boolean))) with getUniqueBranches(b)
    content = re.sub(r'Array\.from\(new Set\(\(([a-zA-Z0-9_]+)\.items \|\| \[\]\)\.map\(item => item\.branch_name\)\.filter\(Boolean\)\)\)', r'getUniqueBranches(\1)', content)
    
    # 4. Replace ?? with ||
    content = content.replace('??', '||')
    
    # 5. Remove ?. where used for properties
    content = content.replace('dashStats?.', '(dashStats || {}).')
    content = content.replace('aiStats?.', '(aiStats || {}).')
    content = content.replace('libraryCardMember?.', '(libraryCardMember || {}).')
    
    # 6. Remove <template v-if="isLoggedIn">
    content = content.replace('<template v-if="isLoggedIn">', '')
    content = content.replace('</template>\n  <script src="/static/js/app.js?v=7"></script>', '\n  <script src="/static/js/app.js?v=7"></script>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Patched {filepath}")

patch_file('templates/index.html')
patch_file('templates/cabinet.html')
