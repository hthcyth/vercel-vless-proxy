/**
 * VLESS Config Manager - Vercel Frontend
 * 用途：订阅生成、配置管理、前端展示
 * 注意：不包含代理转发功能，仅生成配置
 */

// --- CONFIGURATION ---
const getConfig = () => ({
    userID: process.env.UUID || '',
    proxyHost: process.env.PROXYIP?.split(':')[0] || '',
    proxyPort: parseInt(process.env.PROXYIP?.split(':')[1]) || 443,
    adminPassword: process.env.ADMIN || '',
    subscribeKey: process.env.KEY || '',
    remark: process.env.REMARK || 'VLESS-Vercel'
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
        const debugText = `=== VLESS Config Manager ===

Environment Variables:
  UUID: ${config.userID ? '✅ Set (' + config.userID.substring(0, 8) + '...)' : '❌ Not set'}
  ADMIN: ${config.adminPassword ? '✅ Set (' + config.adminPassword + ')' : '❌ Not set'}
  PROXYIP: ${config.proxyHost ? '✅ Set (' + config.proxyHost + ')' : '❌ Not set'}
  KEY: ${config.subscribeKey ? '✅ Set (' + config.subscribeKey + ')' : '❌ Not set'}
  REMARK: ${config.remark}

Subscription URLs:
  Base64: https://${host}/${config.subscribeKey || 'KEY_NOT_SET'}
  JSON: https://${host}/api/config/json

Test Login:
  https://${host}/admin?password=${config.adminPassword || 'ADMIN_NOT_SET'}
`;
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(debugText);
    }
    
    // 2. Homepage (Beautiful Landing Page)
    if (pathname === '/' || pathname === '/index.html') {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Services</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            text-align: center;
        }
        h1 { color: #333; margin-bottom: 20px; font-size: 2.5em; }
        p { color: #666; line-height: 1.8; margin-bottom: 30px; }
        .features { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 20px; 
            margin: 30px 0;
        }
        .feature {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .feature-icon { font-size: 2em; margin-bottom: 10px; }
        .feature-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .feature-desc { font-size: 0.9em; color: #666; }
        .btn {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            margin: 10px;
            transition: transform 0.3s;
        }
        .btn:hover { transform: translateY(-3px); }
        .footer { margin-top: 40px; color: #999; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 Network Services</h1>
        <p>Professional network configuration and management platform</p>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Fast</div>
                <div class="feature-desc">Low latency</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div class="feature-title">Secure</div>
                <div class="feature-desc">Encrypted</div>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <div class="feature-title">Multi-Platform</div>
                <div class="feature-desc">All devices</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🛠️</div>
                <div class="feature-title">Easy Setup</div>
                <div class="feature-desc">One-click</div>
            </div>
        </div>
        
        <div style="margin-top: 40px;">
            <a href="/admin" class="btn">🔐 Admin Panel</a>
            <a href="/debug" class="btn" style="background: #6c757d;">🔍 Debug</a>
        </div>
        
        <div class="footer">
            <p>© 2026 Network Services. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        return res.status(200).send(html);
    }
    
    // 3. Admin Login
    if (pathname === '/admin') {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
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
        <form action="/api/admin/verify" method="GET">
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
    
    // 4. Admin Verify
    if (pathname === '/api/admin/verify') {
        const inputPassword = new URL(url, `https://${host}`).searchParams.get('password');
        
        if (inputPassword && config.adminPassword && inputPassword === config.adminPassword) {
            res.setHeader('Location', '/dashboard');
            return res.status(302).end();
        } else {
            res.setHeader('Location', '/admin?error=1');
            return res.status(302).end();
        }
    }
    
    // 5. Dashboard
    if (pathname === '/dashboard') {
        const links = generateLinks(config, host);
        const subUrl = config.subscribeKey ? `https://${host}/${config.subscribeKey}` : 'Not configured';
        
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .info-box { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .warning { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .btn { display: inline-block; padding: 12px 25px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        textarea { width: 100%; height: 100px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace; font-size: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎛️ Configuration Dashboard</h1>
            <p>Manage your network configuration</p>
        </div>
        
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-value">✅</div>
                <div class="stat-label">Status: Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${config.proxyHost ? '✅' : '❌'}</div>
                <div class="stat-label">Backend Configured</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${config.subscribeKey ? '✅' : '❌'}</div>
                <div class="stat-label">Subscription Active</div>
            </div>
        </div>
        
        <div class="card">
            <h2>📊 Server Information</h2>
            <div class="info-box">
                <strong>Platform:</strong> Vercel Edge Network<br>
                <strong>Host:</strong> ${host}<br>
                <strong>Backend:</strong> ${config.proxyHost || 'Not configured'}:${config.proxyPort}<br>
                <strong>Remark:</strong> ${config.remark}
            </div>
        </div>
        
        <div class="card">
            <h2>🔗 Subscription</h2>
            <p style="margin-bottom: 10px;">Subscribe URL (Base64 encoded):</p>
            <textarea readonly onclick="this.select()">${subUrl}</textarea>
            <div style="margin-top: 15px;">
                <a href="${subUrl}" class="btn" target="_blank">📥 Download Subscription</a>
                <a href="/${config.subscribeKey}" class="btn" target="_blank">🔗 Direct Link</a>
            </div>
        </div>
        
        <div class="card">
            <h2>📱 Node Configuration</h2>
            <textarea readonly onclick="this.select()">${links.join('\n')}</textarea>
            <div style="margin-top: 15px;">
                <button class="btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.value)">📋 Copy</button>
            </div>
        </div>
        
        <div class="card">
            <h2>⚠️ Important Notice</h2>
            <div class="warning">
                <strong>⚠️ This is a frontend configuration manager only</strong><br><br>
                • Actual proxy backend should be deployed separately<br>
                • Supported backends: Your server, Railway, Hugging Face Spaces, etc.<br>
                • This platform generates configuration only, does not forward traffic<br>
                • Keep your ADMIN password secure
            </div>
        </div>
        
        <div class="card">
            <h2>🚪 Logout</h2>
            <a href="/" class="btn" style="background: #dc3545;">Logout</a>
        </div>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        return res.status(200).send(html);
    }
    
    // 6. Subscription
    if (pathname === '/sub' || pathname === '/api/sub') {
        if (config.subscribeKey) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(403).send('Access Denied: Use your subscription key');
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
    
    // 8. JSON Config API
    if (pathname === '/api/config/json') {
        const jsonData = {
            uuid: config.userID,
            proxy: config.proxyHost,
            port: config.proxyPort,
            remark: config.remark,
            subscription: config.subscribeKey ? `https://${host}/${config.subscribeKey}` : null
        };
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(JSON.stringify(jsonData, null, 2));
    }
    
    // 9. 404
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('Not Found');
}

// --- HELPERS ---
function generateLinks(config, host) {
    if (!config.userID) return [];
    return [
        `vless://${config.userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#${config.remark}-VLESS`,
        `vmess://${config.userID}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&path=/api/vless#${config.remark}-VMess`
    ];
}
