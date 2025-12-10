import cors from 'cors';
import express from 'express';
import { ImapFlow } from 'imapflow';

const app = express();
app.use(express.json());
app.use(cors());

// --- Test endpoint ---
app.get('/', (req, res) => {
  res.send('IMAP Checker API is running.');
});

// --- IMAP checker endpoint ---
app.post('/check', async (req, res) => {
  const { host, port, secure, user, password } = req.body;

  try {
    const client = new ImapFlow({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });

    await client.connect();
    await client.logout();

    return res.json({ success: true, message: 'IMAP connection successful' });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
