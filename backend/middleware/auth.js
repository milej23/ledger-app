const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not set. Copy backend/.env.example to backend/.env ' +
      'and paste your Firebase service account JSON (Firebase Console → Project Settings → Service accounts).'
    );
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON — paste the service account file\'s entire contents as one line.');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Middleware that verifies the Firebase ID token sent by the app.
// If valid, attaches req.user = { uid, email } and calls next().
// If invalid or missing, responds with 401.
module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
