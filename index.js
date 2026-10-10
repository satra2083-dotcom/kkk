
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';

let restarting = false;

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    browser: ['Bot WhatsApp', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Pindai QR melalui WhatsApp > Perangkat tertaut');
    }

    if (connection === 'open') {
      restarting = false;
      console.log('✅ Bot WhatsApp berhasil terhubung!');
    }

    if (connection === 'close' && !restarting) {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        restarting = true;
        setTimeout(() => startBot().catch(console.error), 3000);
      } else {
        console.log('Sesi keluar. Hubungkan ulang WhatsApp.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const chat = msg.key.remoteJid;

      if (!chat || chat === 'status@broadcast') continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      const command = text.trim().toLowerCase();
      let reply = '';

      if (command === '.menu') {
        reply =
          '🤖 MENU BOT WHATSAPP\n\n' +
          '.menu - Menampilkan menu\n' +
          '.ping - Mengecek bot\n' +
          '.halo - Sapaan otomatis\n' +
          '.info - Informasi bot\n\n' +
          'Bot mendukung chat pribadi dan grup.';
      } else if (command === '.ping') {
        reply = '🏓 Pong! Bot sedang aktif.';
      } else if (command === '.halo') {
        reply = 'Halo! 👋 Selamat datang.';
      } else if (command === '.info') {
        reply =
          '🤖 BOT WHATSAPP\n' +
          'Platform: Node.js + Baileys\n' +
          'Fungsi: Membalas perintah otomatis.';
      } else if (command === 'assalamualaikum') {
        reply = 'Waalaikumsalam warahmatullahi wabarakatuh 🙏';
      } else if (command === 'selamat pagi') {
        reply = 'Selamat pagi! ☀️ Semoga harimu menyenangkan.';
      }

      if (reply) {
        try {
          await sock.sendMessage(chat, { text: reply });
          console.log(`Pesan dibalas: ${chat}`);
        } catch (error) {
          console.error('Gagal mengirim pesan:', error);
        }
      }
    }
  });
}

startBot().catch(console.error);
