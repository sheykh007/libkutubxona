import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getAllFines() {
    return this.prisma.fine.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        loan: {
          include: {
            bookCopy: {
              include: { book: true }
            }
          }
        }
      }
    });
  }

  async payFine(fineId: string) {
    const fine = await this.prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) throw new NotFoundException('Jarima topilmadi');

    return this.prisma.fine.update({
      where: { id: fineId },
      data: { status: 'PAID' }
    });
  }
}
