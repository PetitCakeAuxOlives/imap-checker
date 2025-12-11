app.post('/check', async (req, res) => {
  console.log('Body reçu:', req.body);

  let { host, port, secure, user, password } = req.body;

  // Convertir correctement les types
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
