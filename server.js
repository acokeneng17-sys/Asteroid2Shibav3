import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check endpoint for cloud monitoring / reverse proxy
  if (pathname === '/health' || pathname === '/_healthz' || pathname === '/ping') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Dynamic TonConnect Manifest matching the exact request host and protocol
  if (pathname === '/tonconnect-manifest.json') {
    const proto = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'https');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const manifest = {
      url: baseUrl,
      name: "Asteroid2 Shiba Staking Wallet",
      iconUrl: `${baseUrl}/ast2-icon.svg`,
      termsOfServiceUrl: baseUrl,
      privacyPolicyUrl: baseUrl
    };

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(manifest, null, 2));
    return;
  }

  // Live TON Blockchain Jetton Balance Proxy
  if (pathname === '/api/ton/balance') {
    const targetAddress = parsedUrl.searchParams.get('address') || '';
    if (!targetAddress) {
      res.writeHead(400, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ success: false, error: 'Alamat dompet TON diperlukan' }));
      return;
    }

    try {
      const response = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(targetAddress)}/jettons`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Asteroid2Bot/1.0)' },
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        const data = await response.json();
        // Locate AST2 Jetton balance
        const ast2Item = (data.balances || []).find(b => 
          b.jetton?.symbol?.toUpperCase() === 'AST2' ||
          b.jetton?.name?.toLowerCase().includes('asteroid2') ||
          b.jetton?.address?.includes('8ef9a403c43318f34c9132548695037f79c245574b1d03c53b4564d76c0d2fb9')
        );

        let parsedBalance = 0;
        let decimals = 9;
        let rawBalance = '0';

        if (ast2Item) {
          decimals = ast2Item.jetton?.decimals ?? 9;
          rawBalance = ast2Item.balance || '0';
          parsedBalance = Number(BigInt(rawBalance)) / Math.pow(10, decimals);
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({
          success: true,
          address: targetAddress,
          ast2Balance: parsedBalance,
          rawBalance: rawBalance,
          decimals: decimals,
          symbol: 'AST2',
          onChain: true,
          timestamp: Date.now()
        }));
        return;
      }
    } catch (err) {
      console.warn('TON API balance proxy warning:', err.message);
    }

    // Graceful fallback response
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      success: false,
      address: targetAddress,
      ast2Balance: 0,
      error: 'Gagal mengambil data dari blockchain TON'
    }));
    return;
  }

  // Dynamic TON Connect Manifest matching exact host and protocol
  if (pathname === '/tonconnect-manifest.json') {
    const proto = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'http');
    const host = req.headers.host || 'localhost:3000';
    const origin = `${proto}://${host}`;
    const manifest = {
      url: origin,
      name: "Asteroid2 Shiba Staking Wallet",
      iconUrl: "https://wallet.tg/images/logo-288.png",
      termsOfServiceUrl: origin,
      privacyPolicyUrl: origin
    };
    const body = JSON.stringify(manifest, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(body);
    }
    return;
  }

  // Admin Backend API Engine (Supports withdrawals approval, user directory, and task management)
  if (pathname === '/api/admin_api.php' || pathname === '/admin_api.php' || pathname === '/api/admin' || pathname === '/api/admin/data') {
    const action = parsedUrl.searchParams.get('action') || '';
    const withdrawalsPath = path.join(__dirname, 'api', 'withdrawals.json');
    const usersPath = path.join(__dirname, 'api', 'users.json');
    const tasksPath = path.join(__dirname, 'api', 'tasks.json');
    const referralsPath = path.join(__dirname, 'api', 'referrals.json');

    const readJson = (p, fallback) => {
      try {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {}
      return fallback;
    };

    const writeJson = (p, data) => {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {}
    };

    if (req.method === 'GET' && (action === 'raw_php' || parsedUrl.searchParams.get('raw') === '1')) {
      const phpPath = path.join(__dirname, 'api', 'admin_api.php');
      if (fs.existsSync(phpPath)) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
        res.end(fs.readFileSync(phpPath, 'utf8'));
        return;
      }
    }

    if (req.method === 'GET' && action === 'ping') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ status: 'ok', message: 'Asteroid2 Admin API Online & Ready!' }));
      return;
    }

    if (req.method === 'GET' && action === 'get_tasks') {
      const tasks = readJson(tasksPath, readJson(path.join(__dirname, 'tasks.json'), []));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ status: 'success', data: tasks }));
      return;
    }

    if (req.method === 'GET' && (action === 'get_all_admin_data' || action === 'get_data' || !action)) {
      let currentWithdrawals = readJson(withdrawalsPath, null);
      if (!currentWithdrawals || currentWithdrawals.length === 0) {
        currentWithdrawals = [
          {
            id: "WD-1730628001",
            userName: "alex_shiba_ton",
            userId: "839102441",
            walletAddress: "EQBgk91-p4LmN5xY8tqP01AoEfZvKwXy6L2k1mZ8P4c-3zWj",
            amount: 2500,
            status: "pending",
            timestamp: Date.now() - 3600000,
            dateStr: new Date(Date.now() - 3600000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
          },
          {
            id: "WD-1730612002",
            userName: "ton_crypto_pilot",
            userId: "749201882",
            walletAddress: "UQD1mZ8P4c-3zWj0vV9rLkMnB5xY8tqP01AoEfZvKwXy6L2k",
            amount: 5000,
            status: "approved",
            timestamp: Date.now() - 86400000,
            dateStr: new Date(Date.now() - 86400000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
          }
        ];
        writeJson(withdrawalsPath, currentWithdrawals);
      }

      const data = {
        withdrawals: currentWithdrawals,
        users: readJson(usersPath, [
          {
            userName: "ton_crypto_pilot",
            userId: "749201882",
            invitedBy: "AST2-772910",
            walletAddress: "UQD1mZ8P4c-3zWj0vV9rLkMnB5xY8tqP01AoEfZvKwXy6L2k",
            balance: 0,
            totalEarned: 0,
            referralCount: 0,
            boostLevel: 1,
            last_active: "Just now"
          },
          {
            userName: "alex_shiba_ton",
            userId: "839102441",
            invitedBy: "Direct",
            walletAddress: "EQBgk91-p4LmN5xY8tqP01AoEfZvKwXy6L2k1mZ8P4c-3zWj",
            balance: 0,
            totalEarned: 0,
            referralCount: 0,
            boostLevel: 1,
            last_active: "Just now"
          }
        ]),
        tasks: readJson(tasksPath, readJson(path.join(__dirname, 'tasks.json'), [])),
        referrals: readJson(referralsPath, [])
      };

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify({ status: 'success', data }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const pAction = payload.action || action;

          if (pAction === 'update_status') {
            const list = readJson(withdrawalsPath, []);
            const item = list.find(w => w.id === payload.id);
            if (item) {
              item.status = payload.status;
              item.processed_at = Date.now();
            } else {
              list.push({ id: payload.id, status: payload.status, timestamp: Date.now() });
            }
            writeJson(withdrawalsPath, list);

            // If approved, deduct from user's recorded balance in users.json as well
            if (payload.status === 'approved' && item) {
              let users = readJson(usersPath, []);
              const u = users.find(usr => usr.userId === item.userId || usr.walletAddress === item.walletAddress);
              if (u) {
                u.balance = Math.max(0, (parseFloat(u.balance) || 0) - (parseFloat(item.amount) || 0));
                writeJson(usersPath, users);
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'success', message: 'Status updated' }));
            return;
          }

          if (pAction === 'sync_user' || pAction === 'register_user') {
            const incoming = payload.data || payload.user || payload;
            let users = readJson(usersPath, []);
            const uId = incoming.userId || incoming.rawId;
            const uWallet = incoming.walletAddress;
            const uName = incoming.userName || incoming.fullName;
            let found = false;

            for (let i = 0; i < users.length; i++) {
              const u = users[i];
              if ((uId && String(u.userId) === String(uId)) || (uWallet && u.walletAddress === uWallet)) {
                if (uName) u.userName = uName;
                if (uWallet) u.walletAddress = uWallet;
                if (typeof incoming.balance !== 'undefined') u.balance = incoming.balance;
                if (typeof incoming.totalEarned !== 'undefined') u.totalEarned = incoming.totalEarned;
                if (typeof incoming.referralCount !== 'undefined') u.referralCount = incoming.referralCount;
                if (incoming.invitedBy) u.invitedBy = incoming.invitedBy;
                u.last_active = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
                found = true;
                break;
              }
            }

            if (!found && (uId || uWallet || uName)) {
              users.unshift({
                userId: String(uId || Date.now()),
                userName: uName || 'Pilot Space',
                walletAddress: uWallet || '',
                balance: incoming.balance || 0,
                totalEarned: incoming.totalEarned || 0,
                referralCount: incoming.referralCount || 0,
                boostLevel: incoming.boostLevel || 1,
                invitedBy: incoming.invitedBy || 'Direct',
                registered_at: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
                last_active: 'Just now'
              });
            }

            writeJson(usersPath, users);
            const pubUsers = path.join(__dirname, 'public', 'api', 'users.json');
            const distUsers = path.join(__dirname, 'dist_deploy', 'api', 'users.json');
            if (fs.existsSync(path.dirname(pubUsers))) writeJson(pubUsers, users);
            if (fs.existsSync(path.dirname(distUsers))) writeJson(distUsers, users);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'success', message: 'User recorded', count: users.length }));
            return;
          }

          if (pAction === 'save_tasks') {
            if (Array.isArray(payload.tasks)) {
              writeJson(tasksPath, payload.tasks);
              writeJson(path.join(__dirname, 'tasks.json'), payload.tasks);
              const pubTasks = path.join(__dirname, 'public', 'tasks.json');
              if (fs.existsSync(path.dirname(pubTasks))) writeJson(pubTasks, payload.tasks);
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'success', message: 'Tasks saved' }));
            return;
          }

          if (pAction === 'add_withdrawal') {
            let list = readJson(withdrawalsPath, []);
            const newWd = payload.withdrawal || payload;
            if (newWd && newWd.id) {
              list = [newWd, ...list.filter(w => w.id !== newWd.id)];
              writeJson(withdrawalsPath, list);
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'success', message: 'Withdrawal added', count: list.length }));
            return;
          }
        } catch (postErr) {
          console.warn('API POST parse error:', postErr);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'success' }));
      });
      return;
    }
  }

  // Prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  // Handle root route
  if (pathname === '/' || pathname === '') {
    filePath = path.join(__dirname, 'index.html');
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveStaticFile(req, res, filePath, stats);
      return;
    }

    // Try appending .html (e.g. /admin -> /admin.html)
    const htmlPath = filePath + '.html';
    fs.stat(htmlPath, (htmlErr, htmlStats) => {
      if (!htmlErr && htmlStats.isFile()) {
        serveStaticFile(req, res, htmlPath, htmlStats);
        return;
      }

      // API fallback
      if (pathname.startsWith('/api/')) {
        const json = JSON.stringify({ status: 'ok', success: true });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(json),
          'Access-Control-Allow-Origin': '*',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(json);
        }
        return;
      }

      // SPA fallback to index.html
      const indexPath = path.join(__dirname, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (!indexErr && indexStats.isFile()) {
          serveStaticFile(req, res, indexPath, indexStats);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });
    });
  });
});

function serveStaticFile(req, res, targetPath, stats) {
  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(targetPath);
  stream.on('error', (streamErr) => {
    console.error('File stream error:', streamErr);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
  stream.pipe(res);
}

// Listen on 0.0.0.0:3000 as required by the AI Studio environment
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Asteroid2 Server listening on http://0.0.0.0:${PORT}`);
});
