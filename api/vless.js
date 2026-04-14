import net from 'net';
import tls from 'tls';
import { Buffer } from 'buffer';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// --- CONFIGURATION (从环境变量读取) ---
const userID = process.env.UUID || '';
const proxyHost = process.env.PROXYIP?.split(':')[0] || '';
const proxyPort = parseInt(process.env.PROXYIP?.split(':')[1]) || 443;
const adminPassword = process.env.ADMIN || '';
const subscribeKey = process.env.KEY || '';
const PORT = parseInt(process.env.PORT) || 3000;

// === 调试信息 ===
console.log('=== VLESS Proxy Startup ===');
console.log('Port:', PORT);
console.log('UUID configured:', !!process.env.UUID);
console.log('ADMIN configured:', !!process.env.ADMIN);
console.log('ADMIN value:', process.env.ADMIN || '(empty)');
console.log('PROXYIP configured:', !!process.env.PROXYIP);
console.log('==========================');

// --- SECURITY HEADERS ---
const SECURITY_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
};

function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function generateAllLinks(host) {
    if (!userID) return [];
    return [
        `vless://${userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#Vercel-Node`,
        `vmess://${userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#Vercel-Node`
    ];
}

function generateFakeHomepage() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
        h1 { color: #333; margin-bottom: 10px; }
        p { color: #666; line-height: 1.6; }
        a { color: #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <h1>👋 Welcome</h1>
        <p>This is a personal website.</p>
        <p>If you are the owner, please <a href="/admin">login</a>.</p>
    </div>
</body>
</html>`;
}

function generateAdminLogin() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
        .login-box { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); width: 100%; max-width: 400px; }
        h2 { color: #333; margin-bottom: 30px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:hover { background: #5568d3; }
        .error { color: red; text-align: center; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🔐 Admin Login</h2>
        <form action="/api/vless/admin/login" method="GET">
            <input type="password" name="password" placeholder="Enter admin password" required>
            <button type="submit">Login</button>
        </form>
        <div id="errorMsg" class="error"></div>
    </div>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error') === '1') {
            document.getElementById('errorMsg').textContent = 'Invalid password';
        }
    </script>
</body>
</html>`;
}

function generateAdminPanel(host, loggedIn) {
    const links = generateAllLinks(host);
    const subUrl = subscribeKey ? `http://${host}:${PORT}/${subscribeKey}` : `http://${host}:${PORT}/sub`;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .success { background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
        .btn:hover { background: #5568d3; }
        textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎛️ VLESS Admin Dashboard</h1>
        
        ${loggedIn ? '<div class="success">✅ Logged in as Administrator</div>' : ''}
        
        <div class="card">
            <h2>📊 Server Status</h2>
            <div class="info">
                <strong>Host:</strong> ${host}<br>
                <strong>Port:</strong> ${PORT}<br>
                <strong>Status:</strong> ✅ Active<br>
                <strong>UUID:</strong> ${userID ? userID.substring(0, 8) + '...' : 'Not configured'}<br>
                <strong>Proxy:</strong> ${proxyHost || 'Not configured'}:${proxyPort || '443'}
            </div>
        </div>
        
        <div class="card">
            <h2>🔗 Subscription</h2>
            <p>Subscribe URL (Base64 encoded):</p>
            <textarea readonly onclick="this.select()">${subUrl}</textarea>
            <p style="margin-top: 10px;">
                <a href="${subUrl}" class="btn" target="_blank">Open Subscription</a>
            </p>
        </div>
        
        <div class="card">
            <h2>📱 Node Links</h2>
            <textarea readonly onclick="this.select()">${links.join('\n')}</textarea>
        </div>
        
        <div class="card">
            <h2>⚠️ Security Notice</h2>
            <div class="warning">
                <strong>Important:</strong><br>
                • Never share your ADMIN password<br>
                • Change KEY regularly for security<br>
                • This panel should not be publicly accessible
            </div>
        </div>
        
        <div class="card">
            <h2>🚪 Logout</h2>
            <button class="btn" onclick="window.location.href='/admin'" style="background: #dc3545;">Logout</button>
        </div>
    </div>
</body>
</html>`;
}

// --- PROXY HANDLERS ---
function processProxyHeader(chunk, expectedUserID) {
    if (chunk.length < 36) return { hasError: true, message: 'Invalid header: payload too short' };
    
    const headerUserID = chunk.slice(0, 36).toString('utf-8'); 
    if (headerUserID !== expectedUserID) return { hasError: true, message: 'Invalid UUID' };

    return { 
        hasError: false, 
        addressRemote: proxyHost, 
        portRemote: proxyPort, 
        rawDataIndex: 36,
        isUDP: false 
    };
}

function pipeSockets(remoteSocket, websocket) {
    remoteSocket.on('data', (data) => {
        try {
            websocket.send(data);
        } catch (e) {
            console.error('WS send error (pipe):', e);
            remoteSocket.destroy();
        }
    });

    websocket.on('message', (message) => {
        try {
            remoteSocket.write(message);
        } catch (e) {
            console.error('Remote write error (pipe):', e);
            websocket.close();
        }
    });

    remoteSocket.on('error', (err) => {
        console.error('Remote socket error:', err);
        websocket.close();
    });
    remoteSocket.on('close', () => {
        console.log('Remote socket closed.');
        websocket.close();
    });
    websocket.on('close', () => {
        console.log('Client WS closed.');
        remoteSocket.destroy();
    });
    websocket.on('error', (err) => {
        console.error('Client WS error:', err);
        remoteSocket.destroy();
    });
}

// --- HTTP SERVER ---
const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let isWebSocket = false;
    
    socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        
        // 检测是否是 HTTP 请求
        if (buffer.length >= 4) {
            const method = buffer.toString('utf8', 0, 4);
            
            if (['GET ', 'POST', 'PUT ', 'DELE', 'OPTI'].includes(method)) {
                // HTTP 请求
                const requestEnd = buffer.indexOf('\r\n\r\n');
                if (requestEnd === -1) return;
                
                const requestLines = buffer.toString('utf8', 0, requestEnd).split('\r\n');
                const [methodLine, ...headerLines] = requestLines;
                const [method, path, version] = methodLine.split(' ');
                
                const headers = {};
                for (const line of headerLines) {
                    const [key, value] = line.split(': ');
                    if (key && value) headers[key.toLowerCase()] = value.trim();
                }
                
                const host = headers.host?.split(':')[0] || 'localhost';
                const pathname = path.split('?')[0];
                const url = new URL(path, `http://${host}`);
                
                console.log(`[HTTP] ${method} ${pathname}`);
                
                // 路由处理
                if (pathname === '/debug') {
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\n=== VLESS Proxy Debug ===

Environment Variables:
  UUID: ${process.env.UUID ? '✅ Set (' + process.env.UUID.substring(0, 8) + '...)' : '❌ Not set'}
  ADMIN: ${process.env.ADMIN ? '✅ Set (' + process.env.ADMIN + ')' : '❌ Not set'}
  PROXYIP: ${process.env.PROXYIP ? '✅ Set (' + process.env.PROXYIP + ')' : '❌ Not set'}
  KEY: ${process.env.KEY ? '✅ Set (' + process.env.KEY + ')' : '❌ Not set'}

Runtime Info:
  userID: ${userID ? '✅ Set' : '❌ Empty'}
  adminPassword: ${adminPassword ? '✅ Set (' + adminPassword + ')' : '❌ Empty'}
  proxyHost: ${proxyHost || '(empty)'}
  proxyPort: ${proxyPort}
  PORT: ${PORT}

Test Login:
  Visit: http://${host}:${PORT}/api/vless/admin/login?password=${process.env.ADMIN || 'Imacuser01'}
`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                if (pathname === '/' || pathname === '/index.html') {
                    const body = generateFakeHomepage();
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nAccess-Control-Allow-Origin: *\r\n\r\n${body}`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                if (pathname === '/admin') {
                    const body = generateAdminLogin();
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nAccess-Control-Allow-Origin: *\r\n\r\n${body}`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                if (pathname === '/api/vless/admin/login') {
                    const inputPassword = url.searchParams.get('password');
                    console.log('[Login Attempt] Password:', inputPassword, 'Expected:', adminPassword);
                    
                    if (inputPassword && adminPassword && inputPassword === adminPassword) {
                        console.log('[Login] Success');
                        const response = `HTTP/1.1 302 Found\r\nLocation: /api/vless/admin?logged=1\r\nAccess-Control-Allow-Origin: *\r\n\r\n`;
                        socket.write(response);
                        socket.end();
                        return;
                    } else {
                        console.log('[Login] Failed');
                        const response = `HTTP/1.1 302 Found\r\nLocation: /admin?error=1\r\nAccess-Control-Allow-Origin: *\r\n\r\n`;
                        socket.write(response);
                        socket.end();
                        return;
                    }
                }
                
                if (pathname === '/api/vless/admin') {
                    const logged = url.searchParams.get('logged');
                    if (logged !== '1') {
                        const response = `HTTP/1.1 302 Found\r\nLocation: /admin\r\nAccess-Control-Allow-Origin: *\r\n\r\n`;
                        socket.write(response);
                        socket.end();
                        return;
                    }
                    
                    const body = generateAdminPanel(host, true);
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nAccess-Control-Allow-Origin: *\r\n\r\n${body}`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                if (pathname === '/sub' || pathname === '/api/vless/sub') {
                    if (subscribeKey && !pathname.includes(subscribeKey)) {
                        const response = `HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\nAccess Denied`;
                        socket.write(response);
                        socket.end();
                        return;
                    }
                    
                    const links = generateAllLinks(host);
                    const base64Links = Buffer.from(links.join('\n')).toString('base64');
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain;charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\n\r\n${base64Links}`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                if (subscribeKey && pathname === '/' + subscribeKey) {
                    const links = generateAllLinks(host);
                    const base64Links = Buffer.from(links.join('\n')).toString('base64');
                    const response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain;charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\n\r\n${base64Links}`;
                    socket.write(response);
                    socket.end();
                    return;
                }
                
                // 404
                const response = `HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\nNot Found`;
                socket.write(response);
                socket.end();
                return;
            }
        }
        
        // WebSocket 升级检测
        if (buffer.toString('utf8').includes('Upgrade: websocket')) {
            if (!isWebSocket) {
                isWebSocket = true;
                console.log('[WebSocket] Upgrade detected');
                
                // 发送 WebSocket 响应
                const response = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n';
                socket.write(response);
                
                // 简单的 WebSocket 处理
                socket.on('data', (wsData) => {
                    console.log('[WebSocket] Data received:', wsData.length, 'bytes');
                });
            }
        }
    });
    
    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
    
    socket.on('close', () => {
        console.log('Socket closed');
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`\n✅ VLESS Proxy Server running on port ${PORT}`);
    console.log(`\n📱 Access URLs:`);
    console.log(`   Homepage:   http://localhost:${PORT}/`);
    console.log(`   Admin:      http://localhost:${PORT}/admin`);
    console.log(`   Debug:      http://localhost:${PORT}/debug`);
    console.log(`   Subscribe:  http://localhost:${PORT}/sub`);
    console.log(`\n🔐 Login with password: ${adminPassword || 'Not set'}`);
    console.log(`\n📝 Logs: pm2 logs vless-proxy\n`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
