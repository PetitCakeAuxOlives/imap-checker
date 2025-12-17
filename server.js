const express = require('express');
const bodyParser = require('body-parser');
const imaps = require('imap-simple');
const nodemailer = require('nodemailer');
const cors = require('cors');

// -------------------------------------
// CONFIG SERVEUR + CORS RENDER FIX
// -------------------------------------
const app = express();

// CORS spécial Render / Preflight OPTIONS obligatoire
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

// -------------------------------------
// FONCTION : TEST IMAP
// -------------------------------------
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

// -------------------------------------
// FONCTION : TEST SMTP
// -------------------------------------
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

// -------------------------------------
// ENDPOINT 1 : /test-imap-smtp
// (ancien endpoint, fonctionne encore)
// -------------------------------------
app.post('/test-imap-smtp', async (req, res) => {
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

  const all_good = imapResult.success && smtpResult.success;

  return res.json({
    success: all_good,
    imap: imapResult,
    smtp: smtpResult,
    message: all_good
      ? 'IMAP et SMTP fonctionnent ✔️'
      : 'Erreur de connexion IMAP ou SMTP ❌',
  });
});

// -------------------------------------
// ENDPOINT 2 : /check
// (celui utilisé par n8n)
// -------------------------------------
app.post('/check', async (req, res) => {
  const {
    imap_host,
    imap_port,
    smtp_host,
    smtp_port,
    imap_user,
    imap_password,
  } = req.body;

  // Test IMAP
  const imapResult = await testIMAP({
    imap_host,
    imap_port,
    imap_user,
    imap_password,
  });

  // Test SMTP
  const smtpResult = await testSMTP({
    smtp_host,
    smtp_port,
    imap_user,
    imap_password,
  });

  return res.json({
    success: imapResult.success && smtpResult.success,
    imap: imapResult,
    smtp: smtpResult,
  });
});

// -------------------------------------
// ENDPOINT DE TEST
// -------------------------------------
app.get('/', (req, res) => {
  res.send('API opérationnelle 🚀');
});

// -------------------------------------
// LANCEMENT SERVEUR
// -------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur lancé sur le port ' + PORT);
});
