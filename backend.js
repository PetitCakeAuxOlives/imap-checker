// server.js
import express from 'express';
import cors from 'cors';
import { ImapFlow } from 'imapflow';

const app = express();
app.use(cors());
app.use(express.json());

// ========== IMAP TEST ==========
app.post('/test-imap', async (req, res) => {
  const { host, port, user, password } = req.body;

  if (!host || !port || !user || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Missing parameters' });
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass: password },
  });

  try {
    await client.connect();
    await client.logout();
    return res.json({ success: true, message: 'IMAP OK' });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.send('IMAP Checker API running ✔️');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server running on port', port));
