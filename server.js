import cors from 'cors';
import crypto from 'crypto';
import express from 'express';

const app = express();
app.use(express.json());
app.use(cors());

// Récupération clé
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
const ALGO = 'aes-256-cbc';

// ---- FONCTIONS DE CHIFFREMENT ---- //

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

// ---- ENDPOINTS ---- //

// 1) Chiffrement du mot de passe (utilisé par n8n)
app.post('/encrypt', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password manquant' });

  const encrypted = encrypt(password);
  return res.json({ encrypted });
});

// 2) Test de déchiffrement (optionnel)
app.post('/decrypt', (req, res) => {
  const { encrypted } = req.body;
  if (!encrypted) return res.status(400).json({ error: 'encrypted manquant' });

  const decrypted = decrypt(encrypted);
  return res.json({ decrypted });
});

// 3) Exemple pour utiliser IMAP plus tard
app.post('/check', (req, res) => {
  res.json({ status: 'OK backend opérationnel' });
});

// ---- LANCEMENT ---- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Backend lancé sur port ' + PORT);
});
