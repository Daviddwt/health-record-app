import re

with open('/home/ubuntu/.openclaw/workspace/healthapp/frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# CSS 修复：可能悬浮按钮被 tab-bar 遮挡或者层级不够，增加 z-index
html = html.replace('.float-btn {', '.float-btn { z-index: 9999;')
html = html.replace('.float-menu {', '.float-menu { z-index: 9998;')
html = html.replace('.modal-overlay {', '.modal-overlay { z-index: 10000;')

# JS 修复：确保 toggleFloatMenu 生效
new_js = """
        function toggleFloatMenu() {
            console.log('Float button clicked!');
            const btn = document.getElementById('floatBtn');
            const menu = document.getElementById('floatMenu');
            if (btn && menu) {
                btn.classList.toggle('active');
                menu.classList.toggle('active');
                console.log('Classes toggled:', btn.className, menu.className);
            } else {
                console.error('Cannot find floatBtn or floatMenu');
            }
        }
"""
html = re.sub(r'function toggleFloatMenu\(\)\s*\{[\s\S]*?\}', new_js, html)

# 确保直接点击也能唤起 modal
html = html.replace('<button class="float-btn" id="floatBtn" onclick="toggleFloatMenu()">+</button>', '<button class="float-btn" id="floatBtn" onclick="showAddModal()">+</button>')

with open('/home/ubuntu/.openclaw/workspace/healthapp/frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Button patch applied")
