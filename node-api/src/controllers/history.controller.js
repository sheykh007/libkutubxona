const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Kitob kartasida “Tarix” tab bo‘ladi
// Nechta marta olingani hisoblanadi
// Eng ko‘p o‘qilgan kitoblar chiqadi

exports.borrowBook = async (req, res) => {
  try {
    const { bookItemId } = req.body;
    const { userId } = req.user;

    // Check if book item exists
    const bookItem = await prisma.bookItem.findUnique({
      where: { id: bookItemId }
    });

    if (!bookItem) {
      return res.status(404).json({ error: "Kitob nusxasi topilmadi" });
    }

    const history = await prisma.borrowHistory.create({
      data: {
        userId,
        bookItemId,
      }
    });

    res.json({ message: "Kitob olingani tarixga yozildi", history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const { historyId } = req.body;

    const history = await prisma.borrowHistory.update({
      where: { id: historyId },
      data: { returnedAt: new Date() }
    });

    res.json({ message: "Kitob qaytarilgani beilgalndi", history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookHistory = async (req, res) => {
  try {
    const { bookItemId } = req.params;

    const history = await prisma.borrowHistory.findMany({
      where: { bookItemId: parseInt(bookItemId) },
      include: {
        user: { select: { id: true, email: true } }
      },
      orderBy: { borrowedAt: 'desc' }
    });

    res.json({
      totalBorrows: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMostReadBooks = async (req, res) => {
  try {
    // Eng ko‘p o‘qilgan kitoblar
    const stats = await prisma.borrowHistory.groupBy({
      by: ['bookItemId'],
      _count: { bookItemId: true },
      orderBy: { _count: { bookItemId: 'desc' } },
      take: 10
    });

    // Populate book titles (Simple way, can be optimized with join)
    const populatedStats = await Promise.all(stats.map(async (stat) => {
      const book = await prisma.bookItem.findUnique({ where: { id: stat.bookItemId } });
      return {
        bookId: stat.bookItemId,
        title: book ? book.bookTitle : "Noma'lum",
        borrowCount: stat._count.bookItemId
      };
    }));

    res.json(populatedStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
