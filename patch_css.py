with open('static/css/style.css', 'a', encoding='utf-8') as f:
    f.write('''
/* View Switcher */
.view-switcher {
  display: flex;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  padding: 4px;
  gap: 4px;
}
.view-switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}
.view-switcher-btn:hover {
  color: var(--text-primary);
  background: rgba(0,0,0,0.05);
}
.view-switcher-btn.active {
  background: var(--bg-card);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
[data-theme="dark"] .view-switcher-btn:hover {
  background: rgba(255,255,255,0.05);
}
''')
