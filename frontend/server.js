const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8888;

const server = http.createServer((req, res) => {
    // 解析 URL，忽略查询参数（如 ?v=10）
    const parsedUrl = url.parse(req.url);
    let filePath = parsedUrl.pathname;
    
    // 根路径返回 index.html
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }
    
    const fullPath = path.join(__dirname, filePath);
    
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            console.error(`Error reading ${fullPath}:`, err.message);
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('文件不存在：' + filePath);
            return;
        }
        
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.json': 'application/json; charset=utf-8',
            '.txt': 'text/plain; charset=utf-8'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // 添加 iOS 和微信兼容的安全头
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 前端服务器已启动 http://0.0.0.0:${PORT}/`);
    console.log(`📁 服务目录：${__dirname}`);
});
