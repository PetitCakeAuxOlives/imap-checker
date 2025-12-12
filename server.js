import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import Imap from 'imap';

const app = express();
app.use(express.json());
app.use(cors());

// ---- CONFIG CHIFFREMENT ---- //

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes hex
const ALGO = 'aes-256-cbc';

// ---- FONCTIONS ---- //

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(data) {
  const [ivHex, encryptedHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ---- ROUTES ---- //

/**
 * 1) /encrypt
 * Body attendu :
 * {
 *    "password": "mon_mdp_en_clair"
 * }
 */
app.post('/encrypt', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password manquant' });

  const encrypted = encrypt(password);
  return res.json({ encrypted });
});

/**
 * 2) /decrypt
 */
app.post('/decrypt', (req, res) => {
  const { encrypted } = req.body;
  if (!encrypted) return res.status(400).json({ error: 'encrypted manquant' });

  const decrypted = decrypt(encrypted);
  return res.json({ decrypted });
});

/**
 * 3) /check
 * Test IMAP réel
 *
 * Body attendu :
 * {
 *   "imap_host": "imap.exemple.com",
 *   "imap_port": 993,
 *   "imap_user": "email",
 *   "imap_password": "iv:hex:encrypted"
 * }
 */
app.post('/check', async (req, res) => {
  const { imap_host, imap_port, imap_user, imap_password } = req.body;

  if (!imap_host || !imap_port || !imap_user || !imap_password) {
    return res.status(400).json({
      error: 'Paramètres manquants',
      details: {
        imap_host,
        imap_port,
        imap_user,
        imap_password,
      },
    });
  }

  // Déchiffrement du mot de passe
  let decryptedPassword;
  try {
    decryptedPassword = decrypt(imap_password);
  } catch (e) {
    return res.status(400).json({
      error: 'Impossible de déchiffrer le mot de passe',
      details: e.message,
    });
  }

  // Config IMAP
  const imap = new Imap({
    user: imap_user,
    password: decryptedPassword,
    host: imap_host,
    port: imap_port,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
  });

  // Tentative de connexion
  try {
    imap.once('ready', () => {
      imap.end();
      return res.json({
        status: 'success',
        message: 'Connexion IMAP OK',
        imap: {
          host: imap_host,
          port: imap_port,
          user: imap_user,
        },
      });
    });

    imap.once('error', (err) => {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de se connecter à IMAP',
        technical: err.message,
      });
    });

    imap.connect();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Erreur interne lors de la tentative IMAP',
      details: err.message,
    });
  }
});

// ---- SERVER ---- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Backend démarré sur le port ' + PORT);
});
