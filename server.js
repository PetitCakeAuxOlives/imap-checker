import cors from 'cors';
import express from 'express';
import { ImapFlow } from 'imapflow';

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// PORT fourni par Render
const PORT = process.env.PORT || 3000;

// Route debug
app.post('/check-test', (req, res) => {
  console.log('RAW BODY:', req.body);
  return res.json({ received: req.body });
});

// Route IMAP
app.post('/check', async (req, res) => {
  console.log('Body reçu:', req.body);

  let { host, port, secure, user, password } = req.body;

  port = Number(port);
  secure = secure === true || secure === 'true';

  if (!host || !port || !user || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: host, port, user, password',
    });
  }

  try {
    const client = new ImapFlow({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });

    await client.connect();
    await client.logout();

    return res.json({ success: true, message: 'IMAP OK' });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// route par défaut
app.get('/', (req, res) => {
  res.send('Serveur Render OK !');
});

// démarrage serveur
app.listen(PORT, () => {
  console.log('Serveur démarré sur le port ' + PORT);
});
