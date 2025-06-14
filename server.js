const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useSingleFileAuthState } = require('baileys-pro');
const { parse } = require('vcf');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let sock;

app.post('/pair', async (req, res) => {
  const session = req.body.session;
  fs.writeFileSync('auth_info.json', Buffer.from(session, 'base64'));
  const { state, saveState } = useSingleFileAuthState('auth_info.json');
  sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') {
      console.log('✅ Paired with WhatsApp!');
    }
  });
  res.send('✅ Device Paired');
});

app.post('/send', upload.single('vcf'), async (req, res) => {
  const message = req.body.message;
  const contacts = parse(fs.readFileSync(req.file.path, 'utf8'));
  for (const c of contacts) {
    const rawNum = c.get('tel')?.value?.replace(/\D/g, '');
    const jid = `${rawNum}@s.whatsapp.net`;
    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`✅ Sent to ${jid}`);
    } catch (err) {
      console.error(`❌ Failed to ${jid}`, err.message);
    }
  }
  res.send('📤 Broadcast Complete!');
});

app.listen(3000, () => {
  console.log('🌐 Server running on http://localhost:3000');
});
