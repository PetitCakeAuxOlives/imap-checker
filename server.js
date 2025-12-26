const express = require('express');
const bodyParser = require('body-parser');
const imaps = require('imap-simple');
const nodemailer = require('nodemailer');
const cors = require('cors');
const axios = require('axios');

const app = express();

/* -------------------------------------------------
   CORS (Render + Frontend + N8N)
------------------------------------------------- */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors());
app.use(bodyParser.json());

/* -------------------------------------------------
   HEALTH CHECK (UptimeRobot / Render)
------------------------------------------------- */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/* -------------------------------------------------
   PROXY N8N (OAuth handlers)
------------------------------------------------- */
app.post('/proxy-n8n', async (req, res) => {
  try {
    const response = await axios.post(
      'https://inovsens.app.n8n.cloud/webhook-test/oauth-handler',
      req.body,
      { timeout: 15000 }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      action: req.body?.action || 'proxy-n8n-error',
    });
  }
});

/* -------------------------------------------------
   IMAP TEST
------------------------------------------------- */
async function testIMAP({ imap_host, imap_port, imap_user, imap_password }) {
  const config = {
    imap: {
      user: imap_user,
      password: imap_password,
      host: imap_host,
      port: Number(imap_port),
      tls: true,
      authTimeout: 8000,
    },
  };

  try {
    const connection = await imaps.connect(config);
    await connection.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* -------------------------------------------------
   SMTP TEST
------------------------------------------------- */
async function testSMTP({ smtp_host, smtp_port, imap_user, imap_password }) {
  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: Number(smtp_port),
    secure: Number(smtp_port) === 465,
    auth: { user: imap_user, pass: imap_password },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* -------------------------------------------------
   MAIN ENDPOINT (N8N + FRONTEND)
------------------------------------------------- */
app.post('/check', async (req, res) => {
  // 🔥 ACTION PAR DÉFAUT (clé pour ton Switch)
  const action = req.body.action || 'configure-imap';

  /* ---------------- OAuth Google ---------------- */
  if (action === 'oauth-google-init') {
    return res.json({
      action,
      success: true,
      message: 'OAuth Google init',
    });
  }

  /* ---------------- OAuth Microsoft ---------------- */
  if (action === 'oauth-microsoft-init') {
    return res.json({
      action,
      success: true,
      message: 'OAuth Microsoft init',
    });
  }

  /* ---------------- IMAP / SMTP ---------------- */
  const {
    imap_host,
    imap_port,
    smtp_host,
    smtp_port,
    imap_user,
    imap_password,
  } = req.body;

  if (!imap_host || !imap_user || !imap_password) {
    return res.status(400).json({
      action,
      success: false,
      error: 'Missing required IMAP/SMTP parameters',
    });
  }

  const imapResult = await testIMAP({
    imap_host,
    imap_port,
    imap_user,
    imap_password,
  });

  const smtpResult = await testSMTP({
    smtp_host,
    smtp_port,
    imap_user,
    imap_password,
  });

  const allGood = imapResult.success && smtpResult.success;

  return res.json({
    action, // ⚠️ INDISPENSABLE POUR N8N
    success: allGood,
    imap: imapResult,
    smtp: smtpResult,
    message: allGood
      ? 'IMAP et SMTP fonctionnent ✔️'
      : 'Erreur de connexion IMAP ou SMTP ❌',
  });
});

/* -------------------------------------------------
   ROOT
------------------------------------------------- */
app.get('/', (req, res) => {
  res.send('API opérationnelle 🚀');
});

/* -------------------------------------------------
   SERVER START
------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur lancé sur le port ' + PORT);
});
