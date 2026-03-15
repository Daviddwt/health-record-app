import re

with open('/home/ubuntu/.openclaw/workspace/healthapp/frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# iOS Safari 有时会对未经转义的特殊字符在 script 标签内严格校验，导致解析崩溃
# 但更可能的原因是：我们的 http 服务器 (Python http.server) 对某些 iOS 请求头处理不够健壮，或者是有无限重定向/内存泄漏
# 让我们检查一下前端是否有会导致 iOS 崩溃的代码，比如不兼容的 CSS 或 JS

# 修复：移除一些在老版本 iOS 可能引起崩溃的写法
# 我们将检查 fetch 调用，iOS Safari 在非 HTTPS 环境下对某些特性可能有限制，但这通常不会导致“页面闪退”，而是控制台报错。
# 闪退（意外终止连接）可能是 Python 的 http.server 挂了，或者是 iOS Safari 的渲染引擎崩溃。

# 让我们先看看 http.server 的日志
