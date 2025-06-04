const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = '/etc/secrets/serviceAccountKey.json'; // this is where Render mounts the file

const serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

//


//
app.post('/send-fcm', async (req, res) => {
    console.log('Received request:', req.body); // <--- This should appear in Render logs
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





const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

app.post('/process-scheduled-reminders', async (req, res) => {
  
  try {
    const now = new Date();
    const remindersRef = firestore.collection('scheduled_notifications');
    const query = remindersRef
      .where('sent', '==', false)
      .where('scheduledTime', '<=', now);

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({ success: true, message: 'No reminders to send.' });
    }

    let sentCount = 0;
    for (const doc of snapshot.docs) {
      const reminder = doc.data();
      // Get user FCM token
      const userDoc = await firestore.collection('users').doc(reminder.userId).get();
      const fcmToken = userDoc.data().fcmToken;
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: { title: reminder.title, body: reminder.message },
          data: reminder.data || {},
        });
        sentCount++;
      }
      // Mark as sent
      await doc.ref.update({ sent: true, sentAt: new Date() });
    }
    res.json({ success: true, sent: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

