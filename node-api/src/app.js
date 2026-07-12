const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Har bir amal log qilinadi (HTTP loglar)

// Import Controllers
const authController = require('./controllers/auth.controller');
const historyController = require('./controllers/history.controller');
const eventController = require('./controllers/event.controller');

// --- Custom Auth Middleware ---
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token topilmadi" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Agar bu temp token bo'lsa faqat 2FA gacha o'tkaziladi
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Yaroqsiz token" });
  }
};

const requireFullAuth = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.temp) {
      return res.status(403).json({ error: "2FA tasdiqlanmagan" });
    }
    next();
  });
};

// ==========================================
// ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: "Library Node.js API is running. API endpoints are under /api/..." });
});

app.get('/api/auth/login', (req, res) => {
  res.status(405).json({ error: "Siz bu manzilga bevosita brauzerdan (GET) kirdingiz. O'rniga klient/Postman dasturlari orqali POST so'rov yuboring." });
});

// --- Auth & Session Tracking & 2FA ---
app.post('/api/auth/login', authController.login);
app.post('/api/auth/verify-2fa', requireAuth, authController.verify2FA); // requireAuth detects temp token
app.post('/api/auth/setup-2fa', requireFullAuth, authController.setup2FA);
app.get('/api/auth/sessions', requireFullAuth, authController.getActiveSessions);
app.post('/api/auth/logout-all', requireFullAuth, authController.logoutAllDevices);

// --- Book History ---
app.post('/api/history/borrow', requireFullAuth, historyController.borrowBook);
app.post('/api/history/return', requireFullAuth, historyController.returnBook);
app.get('/api/history/book/:bookItemId', requireFullAuth, historyController.getBookHistory);
app.get('/api/history/stats/most-read', requireFullAuth, historyController.getMostReadBooks);

// --- Events ---
app.post('/api/events/create', requireFullAuth, eventController.createEvent);
app.post('/api/events/register', requireFullAuth, eventController.registerForEvent);
app.get('/api/events/:eventId/participants', requireFullAuth, eventController.getEventParticipantsStats);


// --- Super Integration Flow Example Endpoint ---
// Demonstrates how the modules interlock. In a real system, the frontend orchestrates these.
app.post('/api/super-flow', requireFullAuth, async (req, res) => {
  /*
    1. User logic starts (handled by /api/auth/login and requires 2FA)
    2. User borrows a book -> /api/history/borrow
    3. User registers for event -> /api/events/register (Email sent here automatically)
  */
  res.json({ message: "Bu API uchrashuvlari Frontend tomonidan ketma-ket chaqirilishiga mo'ljallangan" });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Node.js API ${PORT} - portda ishga tushdi.`);
  console.log(`Scaleble architecture, 2FA, JWT, Nodemailer o'rnatilgan.`);
});
