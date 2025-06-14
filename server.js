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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let sock;

app.post('/pair', async (req, res) => {
  const { session } = req.body;
  const authPath = path.join(__dirname, 'auth_info.json');
  fs.writeFileSync(authPath, Buffer.from(session, 'base64'));
  const { state, saveState } = useSingleFileAuthState(authPath);

  sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') {
      console.log('✅ Paired and connected');
    }
  });

  res.send('✅ Paired successfully!');
});

app.post('/send', upload.single('vcf'), async (req, res) => {
  const { message } = req.body;
  const vcfPath = req.file.path;
  const vcfData = fs.readFileSync(vcfPath, 'utf-8');
  const contacts = parse(vcfData);
  for (const contact of contacts) {
    const number = contact.get('tel')?.value?.replace(/[^0-9]/g, '');
    if (number) {
      const jid = number + '@s.whatsapp.net';
      try {
        await sock.sendMessage(jid, { text: message });
        console.log(`✅ Sent to: ${jid}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${jid}`, err);
      }
    }
  }
  res.send('✅ Broadcast completed!');
});

app.listen(3000, () => console.log('🌐 Server running on http://localhost:3000'));
