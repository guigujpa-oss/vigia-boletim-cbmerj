import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9124526610:AAG1yDl7apSLekWlLtxY4u98zHgrofM1Dgg';
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function getChatId() {
  const res = await fetch(`${BASE_URL}/getUpdates`);
  const data = await res.json();
  
  if (data.ok && data.result.length > 0) {
    // Get last message chat id
    const lastMsg = data.result[data.result.length - 1];
    const chatId = lastMsg.message?.chat?.id || lastMsg.my_chat_member?.chat?.id;
    return chatId;
  }
  return null;
}

export async function sendTelegramText(chatId, text) {
  // Telegram has 4096 char limit per message, split if necessary
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 4000) {
      chunks.push(remaining);
      break;
    }
    let idx = remaining.lastIndexOf('\n', 4000);
    if (idx === -1) idx = 4000;
    chunks.push(remaining.substring(0, idx));
    remaining = remaining.substring(idx).trim();
  }

  for (const chunk of chunks) {
    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk
      })
    });
    const result = await res.json();
    if (!result.ok) {
      console.error('[Telegram] Erro ao enviar texto:', result);
    }
  }
}

export async function sendTelegramDocument(chatId, filePath, caption = '') {
  if (!fs.existsSync(filePath)) {
    console.error('[Telegram] Arquivo não encontrado:', filePath);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', blob, fileName);
  if (caption) {
    formData.append('caption', caption);
  }

  const res = await fetch(`${BASE_URL}/sendDocument`, {
    method: 'POST',
    body: formData
  });

  const result = await res.json();
  if (!result.ok) {
    console.error('[Telegram] Erro ao enviar documento:', result);
  } else {
    console.log('[Telegram] Documento PDF enviado com sucesso!');
  }
}

