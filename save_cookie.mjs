import fs from 'fs';
import path from 'path';

// Let's connect to CDP or get cookie from Chrome
// We can use Chrome DevTools protocol to fetch the cookies
async function saveCookie() {
  const destDir = 'C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\csmar-dashboard\\data';
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  // Get cookie from Chrome
  const listRes = await fetch('http://localhost:9222/json');
  const targets = await listRes.json();
  const intranetTarget = targets.find(t => t.url && t.url.includes('intranet.cbmerj.rj.gov.br'));

  if (!intranetTarget) {
    console.error('Target not found');
    process.exit(1);
  }

  const ws = new WebSocket(intranetTarget.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Network.getCookies',
      params: { urls: ['https://intranet.cbmerj.rj.gov.br'] }
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 1 && msg.result) {
      const cookies = msg.result.cookies;
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      fs.writeFileSync(path.join(destDir, 'intranet_cookie.txt'), cookieStr, 'utf8');
      console.log('Cookie salvo com sucesso em data/intranet_cookie.txt!');
      console.log(cookieStr.substring(0, 80) + '...');
      ws.close();
      process.exit(0);
    }
  };
}

saveCookie().catch(console.error);

