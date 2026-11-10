import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, '..', 'data', 'whatsapp_auth');

let sock = null;
let isReady = false;
const pendingMessages = [];

export async function initWhatsApp(targetPhone = '5521998722360') {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP:');
      console.log('   (WhatsApp > Aparelhos Conectados > Conectar Aparelho)');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });

      // Also generate pairing code if requested
      if (!sock.authState.creds.registered && targetPhone) {
        try {
          const cleanPhone = targetPhone.replace(/\D/g, '');
          const code = await sock.requestPairingCode(cleanPhone);
          console.log('\n👉 OU CONECTE PELO CÓDIGO DE PAREAMENTO:');
          console.log(`   CÓDIGO: [ ${code} ]`);
          console.log('   (No WhatsApp: Aparelhos conectados > Conectar com número de telefone)\n');
        } catch (e) {
          // Ignore if pairing code fails or already requested
        }
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[WhatsApp] Conexão fechada. Reconectando?', shouldReconnect);
      isReady = false;
      if (shouldReconnect) {
        setTimeout(() => initWhatsApp(targetPhone), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n✅ [WhatsApp] CONECTADO COM SUCESSO!');
      isReady = true;

      // Send any queued messages
      while (pendingMessages.length > 0) {
        const item = pendingMessages.shift();
        try {
          await sendMessageDirect(item.phone, item.text, item.docPath);
          item.resolve(true);
        } catch (err) {
          item.reject(err);
        }
      }
    }
  });

  return sock;
}

async function sendMessageDirect(phone, text, docPath) {
  const cleanPhone = phone.replace(/\D/g, '');
  const jid = `${cleanPhone}@s.whatsapp.net`;

  console.log(`[WhatsApp] Enviando mensagem para ${jid}...`);
  await sock.sendMessage(jid, { text });

  if (docPath && fs.existsSync(docPath)) {
    console.log(`[WhatsApp] Enviando arquivo anexo: ${docPath}...`);
    const buffer = fs.readFileSync(docPath);
    const fileName = path.basename(docPath);
    await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName
    });
  }

  console.log('[WhatsApp] Mensagem enviada com sucesso!');
  return true;
}

export function sendWhatsApp(phone, text, docPath = null) {
  return new Promise((resolve, reject) => {
    if (isReady && sock) {
      sendMessageDirect(phone, text, docPath).then(resolve).catch(reject);
    } else {
      console.log('[WhatsApp] Conexão ainda não está pronta. Enfileirando mensagem...');
      pendingMessages.push({ phone, text, docPath, resolve, reject });
    }
  });
}

