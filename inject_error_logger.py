import re

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

logger_script = '''
<script>
window.onerror = function(msg, url, line, col, error) {
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.top = '0';
    errDiv.style.left = '0';
    errDiv.style.width = '100%';
    errDiv.style.padding = '20px';
    errDiv.style.background = 'red';
    errDiv.style.color = 'white';
    errDiv.style.zIndex = '999999';
    errDiv.innerHTML = '<h3>JS Error</h3><p>' + msg + '</p><pre>' + (error ? error.stack : '') + '</pre>';
    document.body.appendChild(errDiv);
    return false;
};
const oldError = console.error;
console.error = function(...args) {
    oldError.apply(console, args);
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.top = '100px';
    errDiv.style.left = '0';
    errDiv.style.width = '100%';
    errDiv.style.padding = '20px';
    errDiv.style.background = 'darkred';
    errDiv.style.color = 'white';
    errDiv.style.zIndex = '999999';
    errDiv.innerHTML = '<h3>Console Error</h3><pre>' + args.map(a => (a && a.stack) ? a.stack : a).join(' ') + '</pre>';
    document.body.appendChild(errDiv);
};
</script>
'''

if 'window.onerror = function(msg' not in content:
    content = content.replace('<head>', '<head>\\n' + logger_script)
    with open('templates/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Logger injected")
else:
    print("Already injected")
