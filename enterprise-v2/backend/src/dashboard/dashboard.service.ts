import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalBooks = await this.prisma.bookCopy.count();
    const activeMembers = await this.prisma.user.count({
      where: { role: { in: ['MEMBER', 'STUDENT', 'TEACHER'] } }
    });
    const booksLoaned = await this.prisma.bookCopy.count({
      where: { status: 'LOANED' }
    });

    const overdueReturns = await this.prisma.loan.count({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: new Date() }
      }
    });

    const recentActivity = await this.prisma.loan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        bookCopy: { include: { book: true } }
      }
    });

    return {
      totalBooks,
      activeMembers,
      booksLoaned,
      overdueReturns,
      recentActivity: recentActivity.map(loan => ({
        id: loan.id,
        userName: `${loan.user.lastName} ${loan.user.firstName}`,
        bookTitle: loan.bookCopy.book.title,
        action: loan.status === 'RETURNED' ? 'Qaytarildi' : 'Berildi',
        date: loan.createdAt
      }))
    };
  }
}
