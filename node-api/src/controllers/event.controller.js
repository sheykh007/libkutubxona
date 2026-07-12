const { PrismaClient } = require('@prisma/client');
const emailService = require('../services/email.service');
const prisma = new PrismaClient();

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    
    // Yaratish
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location
      }
    });

    res.json({ message: "Tadbir muvaffaqiyatli yaratildi", event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const { userId } = req.user;

    const event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
    if (!event) {
      return res.status(404).json({ error: "Tadbir topilmadi" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Ro'yxatdan o'tish
    const participant = await prisma.eventParticipant.create({
      data: {
        eventId: parseInt(eventId),
        userId
      }
    });

    // 11. EMAIL INTEGRATSIYA: Tadbir taklifi/tasdig'i
    if (user && user.email) {
      const emailText = `Assalomu alaykum!\nSiz "${event.title}" tadbiriga ro'yxatdan o'tdingiz.\nKuni: ${event.date}\nManzil: ${event.location}`;
      emailService.sendMail(user.email, "Tadbirga ro'yxatdan o'tish tasdiqlandi", emailText)
        .catch(err => console.error("Email yuborishda xatolik:", err)); // Asinxron jo'natish
    }

    res.json({ message: "Tadbirga muvaffaqiyatli yozildingiz", participant });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Siz bu tadbirga avval ro'yxatdan o'tgansiz" });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getEventParticipantsStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const count = await prisma.eventParticipant.count({
      where: { eventId: parseInt(eventId) }
    });

    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: parseInt(eventId) },
      include: {
        user: { select: { id: true, email: true } }
      }
    });

    res.json({
      eventId,
      totalParticipants: count,
      participants
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
