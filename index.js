const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());

//

const fs = require('fs');
const path = '/etc/secrets/serviceAccountKey.json'; // this is where Render mounts the file

const serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
//
app.post('/send-fcm', async (req, res) => {
  const { token, title, body, data } = req.body;
  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data || {},
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FCM server running on port ${PORT}`));
