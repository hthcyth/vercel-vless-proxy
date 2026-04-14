/**
 * VLESS Proxy for Vercel Serverless Functions
 * 注意：Vercel 不支持 WebSocket，仅支持 HTTP 路由和订阅生成
 */

// --- CONFIGURATION ---
const getConfig = () => ({
    userID: process.env.UUID || '',
    proxyHost: process.env.PROXYIP?.split(':')[0] || '',
    proxyPort: parseInt(process.env.PROXYIP?.split(':')[1]) || 443,
    adminPassword: process.env.ADMIN || '',
    subscribeKey: process.env.KEY || ''
});

// --- HANDLER ---
export default async function handler(req, res) {
    const config = getConfig();
    const url = req.url;
    const pathname = new URL(url, `https://${req.headers.host}`).pathname;
    const host = req.headers.host?.split(':')[0] || 'localhost';
    const method = req.method;
    
    console.log(`[${method}] ${pathname}`);
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 1. Debug Endpoint
    if (pathname === '/debug') {
        const debugText = `=== VLESS Vercel Debug ===

Environment Variables:
  UUID: ${config.userID ? '✅ Set (' + config.userID.substring(0, 8) + '...)' : '❌ Not set'}
  ADMIN: ${config.adminPassword ? '✅ Set (' + config.adminPassword + ')' : '❌ Not set'}
  PROXYIP: ${config.proxyHost ? '✅ Set (' + config.proxyHost + ')' : '❌ Not set'}
  KEY: ${config.subscribeKey ? '✅ Set (' + config.subscribeKey + ')' : '❌ Not set'}

Test Login:
  Visit: https://${host}/api/vless/admin/login?password=${config.adminPassword || 'Imacuser01'}

Test Subscription:
  Visit: https://${host}/${config.subscribeKey || 'KEY_NOT_SET'}
`;
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(debugText);
    }
    
    // 2. Homepage (Fake)
    if (pathname === '/' || pathname === '/index.html') {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
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
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        return res.status(200).send(html);
    }
    
    // 3. Admin Login Page
    if (pathname === '/admin') {
        const html = `<!DOCTYPE html>
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
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        return res.status(200).send(html);
    }
    
    // 4. Admin Login Verify
    if (pathname === '/api/vless/admin/login') {
        const inputPassword = new URL(url, `https://${host}`).searchParams.get('password');
        console.log('[Login] Input:', inputPassword, 'Expected:', config.adminPassword);
        
        if (inputPassword && config.adminPassword && inputPassword === config.adminPassword) {
            console.log('[Login] Success');
            res.setHeader('Location', '/api/vless/admin?logged=1');
            return res.status(302).end();
        } else {
            console.log('[Login] Failed');
            res.setHeader('Location', '/admin?error=1');
            return res.status(302).end();
        }
    }
    
    // 5. Admin Dashboard
    if (pathname === '/api/vless/admin') {
        const logged = new URL(url, `https://${host}`).searchParams.get('logged');
        
        if (logged !== '1') {
            res.setHeader('Location', '/admin');
            return res.status(302).end();
        }
        
        const links = generateLinks(config, host);
        const subUrl = config.subscribeKey ? `https://${host}/${config.subscribeKey}` : `https://${host}/sub`;
        
        const html = `<!DOCTYPE html>
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
        textarea { width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎛️ VLESS Admin Dashboard</h1>
        <div class="success">✅ Logged in as Administrator</div>
        
        <div class="card">
            <h2>📊 Server Status</h2>
            <div class="info">
                <strong>Host:</strong> ${host}<br>
                <strong>Status:</strong> ✅ Active<br>
                <strong>Platform:</strong> Vercel Serverless<br>
                <strong>UUID:</strong> ${config.userID ? config.userID.substring(0, 8) + '...' : 'Not configured'}<br>
                <strong>Proxy:</strong> ${config.proxyHost || 'Not configured'}:${config.proxyPort}
            </div>
        </div>
        
        <div class="card">
            <h2>🔗 Subscription</h2>
            <p>Subscribe URL:</p>
            <textarea readonly onclick="this.select()">${subUrl}</textarea>
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
                • Vercel does NOT support WebSocket (proxy won't work)<br>
                • Use this for subscription generation only
            </div>
        </div>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        return res.status(200).send(html);
    }
    
    // 6. Subscription
    if (pathname === '/sub' || pathname === '/api/vless/sub') {
        if (config.subscribeKey && !pathname.includes(config.subscribeKey)) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(403).send('Access Denied: Invalid subscription key');
        }
        
        const links = generateLinks(config, host);
        const base64Links = Buffer.from(links.join('\n')).toString('base64');
        res.setHeader('Content-Type', 'text/plain;charset=utf-8');
        return res.status(200).send(base64Links);
    }
    
    // 7. Direct subscription with KEY
    if (config.subscribeKey && pathname === '/' + config.subscribeKey) {
        const links = generateLinks(config, host);
        const base64Links = Buffer.from(links.join('\n')).toString('base64');
        res.setHeader('Content-Type', 'text/plain;charset=utf-8');
        return res.status(200).send(base64Links);
    }
    
    // 8. 404
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('Not Found');
}

// --- HELPERS ---
function generateLinks(config, host) {
    if (!config.userID) return [];
    return [
        `vless://${config.userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#Vercel-VLESS`,
        `vmess://${config.userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#Vercel-VMess`
    ];
}
