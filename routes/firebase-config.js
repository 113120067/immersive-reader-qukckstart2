const express = require('express');
const router = express.Router();

// 回傳 Firebase web app config 給前端（從環境變數取得）
// 設定環境變數：FIREBASE_API_KEY、FIREBASE_AUTH_DOMAIN、FIREBASE_PROJECT_ID、FIREBASE_APP_ID
router.get('/config', (req, res) => {
  const cfg = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || ''
  };

  if (!cfg.apiKey || !cfg.projectId || !cfg.authDomain) {
    return res.status(500).json({ error: 'Firebase config not configured on server environment' });
  }
  res.json(cfg);
});

module.exports = router;
