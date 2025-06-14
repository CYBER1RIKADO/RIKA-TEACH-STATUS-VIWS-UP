const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const makeWASocket = require('baileys').default;
const { useSingleFileAuthState } = require('baileys');
const { parse } = require('vcf');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

let sock;

app.post('/pair', async (req, res) => {
  const { session } = req.body;
  fs.writeFileSync('auth_info.json', Buffer.from(session, 'base64'));
  const { state, saveState } = useSingleFileAuthState('auth_info.json');
  sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', u => {
    if (u.connection === 'open') console.log('✅ Paired & connected');
  });
  res.send('✅ Paired successfully!');
});

app.post('/send', upload.single('vcf'), async (req, res) => {
  const message = req.body.message;
  const contacts = parse(fs.readFileSync(req.file.path, 'utf8'));
  for (const c of contacts) {
    const num = c.get('tel')?.value?.replace(/\D/g, '');
    if (num) {
      const jid = num + '@s.whatsapp.net';
      try { await sock.sendMessage(jid, { text: message }); console.log(`Sent → ${jid}`); }
      catch (e) { console.error(`Fail → ${jid}`, e); }
    }
  }
  res.send('✅ Broadcast done!');
});

app.listen(3000, () => console.log('🚀 Server on http://localhost:3000'));
