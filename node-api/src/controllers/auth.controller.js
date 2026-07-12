const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');

const prisma = new PrismaClient();

// In a real application, you would compare with a hashed password
const mockHashPasswordCheck = (password) => true;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !mockHashPasswordCheck(password)) {
      return res.status(401).json({ error: "Noto'g'ri email yoki parol" });
    }

    // Capture Session details: IP and Device
    const clientIp = requestIp.getClientIp(req);
    const parser = new UAParser();
    const ua = parser.setUA(req.headers['user-agent']).getResult();
    const deviceName = `${ua.browser.name || 'Noma`lum brauzer'} on ${ua.os.name || 'Noma`lum OS'}`;

    // Record session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: clientIp,
        device: deviceName,
        isActive: true,
      }
    });

    // Handle 2FA
    if (user.twoFactorEnabled) {
      // Return a temporary token and a requirement for 2FA
      const tempToken = jwt.sign({ userId: user.id, temp: true, sessionId: session.id }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({ 
        message: "2FA kod talab qilinadi", 
        require2FA: true, 
        token: tempToken 
      });
    }

    // Generate normal JWT
    const token = jwt.sign({ userId: user.id, sessionId: session.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ message: "Muvaffaqiyatli kirish", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setup2FA = async (req, res) => {
  try {
    const { userId } = req.user; // assume auth middleware

    const secret = speakeasy.generateSecret({
      name: `Kutubxona Tizimi (${req.user.email})`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ secret: secret.base32, qrCodeUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body; // Token from Authenticator app
    const { userId, sessionId } = req.user; // temp user info from temporary JWT

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA sozlanmagan" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (verified) {
      // Enable 2FA if it hasn't been already
      if (!user.twoFactorEnabled) {
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorEnabled: true }
        });
      }
      
      const authToken = jwt.sign({ userId: user.id, sessionId }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ message: "2FA tasdiqlandi. Tizimga kirdingiz", token: authToken });
    } else {
      return res.status(400).json({ error: "Noto'g'ri 2FA kod" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const { userId } = req.user;
    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { loginAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logoutAllDevices = async (req, res) => {
  try {
    const { userId, sessionId: currentSessionId } = req.user;
    
    // Close other sessions
    await prisma.session.updateMany({
      where: { 
        userId, 
        isActive: true,
        id: { not: currentSessionId } // optional: leave current session active
      },
      data: { 
        isActive: false,
        logoutAt: new Date()
      }
    });

    res.json({ message: "Boshqa barcha qurilmalardan chiqildi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
