// --- CONFIGURATION (从环境变量读取) ---
const userID = process.env.UUID || '';
const proxyHost = process.env.PROXYIP?.split(':')[0] || '';
const proxyPort = parseInt(process.env.PROXYIP?.split(':')[1]) || 443;
const adminPassword = process.env.ADMIN || '';
const subscribeKey = process.env.KEY || '';

// === 调试信息 ===
console.log('=== VLESS Vercel Proxy ===');
console.log('UUID configured:', !!process.env.UUID);
console.log('ADMIN configured:', !!process.env.ADMIN);
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
    const subUrl = subscribeKey ? `https://${host}/${subscribeKey}` : `https://${host}/sub`;
    
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
                <strong>Status:</strong> ✅ Active<br>
                <strong>Region:</strong> Vercel Edge<br>
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

// --- VERCEL HANDLER ---
export default async function handler(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const host = request.headers.get('host')?.split(':')[0] || 'localhost';
    const method = request.method;
    
    console.log(`[Vercel] ${method} ${pathname}`);
    
    // 1. OPTIONS/CORS
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: SECURITY_HEADERS
        });
    }
    
    // 2. 调试端点
    if (pathname === '/debug') {
        const debugText = `=== VLESS Vercel Debug ===

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

Test Login:
  Visit: https://${host}/api/vless/admin/login?password=${process.env.ADMIN || 'Imacuser01'}
`;
        return new Response(debugText, {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/plain'
            }
        });
    }
    
    // 3. 伪装首页
    if (pathname === '/' || pathname === '/index.html') {
        return new Response(generateFakeHomepage(), {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/html;charset=utf-8'
            }
        });
    }
    
    // 4. 后台登录页面
    if (pathname === '/admin') {
        return new Response(generateAdminLogin(), {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/html;charset=utf-8'
            }
        });
    }
    
    // 5. 后台登录验证（GET 请求）
    if (pathname === '/api/vless/admin/login') {
        const inputPassword = url.searchParams.get('password');
        console.log('[Login Attempt] Password:', inputPassword, 'Expected:', adminPassword);
        
        if (inputPassword && adminPassword && inputPassword === adminPassword) {
            console.log('[Login] Success');
            return new Response(null, {
                status: 302,
                headers: {
                    ...SECURITY_HEADERS,
                    'Location': '/api/vless/admin?logged=1'
                }
            });
        } else {
            console.log('[Login] Failed');
            return new Response(null, {
                status: 302,
                headers: {
                    ...SECURITY_HEADERS,
                    'Location': '/admin?error=1'
                }
            });
        }
    }
    
    // 6. 后台管理面板
    if (pathname === '/api/vless/admin') {
        const logged = url.searchParams.get('logged');
        if (logged !== '1') {
            return new Response(null, {
                status: 302,
                headers: {
                    ...SECURITY_HEADERS,
                    'Location': '/admin'
                }
            });
        }
        
        return new Response(generateAdminPanel(host, true), {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/html;charset=utf-8'
            }
        });
    }
    
    // 7. 订阅链接
    if (pathname === '/sub' || pathname === '/api/vless/sub' || pathname === '/api/vless/subscribe') {
        if (subscribeKey) {
            const urlPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
            if (urlPath !== subscribeKey && !pathname.includes(subscribeKey)) {
                return new Response('Access Denied: Invalid subscription key', {
                    status: 403,
                    headers: {
                        ...SECURITY_HEADERS,
                        'Content-Type': 'text/plain'
                    }
                });
            }
        }
        
        const links = generateAllLinks(host);
        const base64Links = Buffer.from(links.join('\n')).toString('base64');
        return new Response(base64Links, {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
    }
    
    // 8. 带 KEY 的订阅访问
    if (subscribeKey && pathname === '/' + subscribeKey) {
        const links = generateAllLinks(host);
        const base64Links = Buffer.from(links.join('\n')).toString('base64');
        return new Response(base64Links, {
            status: 200,
            headers: {
                ...SECURITY_HEADERS,
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
    }
    
    // 9. 404
    return new Response('Not Found', {
        status: 404,
        headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'text/plain'
        }
    });
}
