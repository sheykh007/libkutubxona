import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CirculationService {
  constructor(private prisma: PrismaService) {}

  async issueBook(siglaNumber: string, barcode: string, issuedById: string) {
    // 1. Find User by siglaNumber
    const user = await this.prisma.user.findUnique({
      where: { siglaNumber },
      include: {
        fines: {
          where: { status: 'UNPAID' }
        }
      }
    });
    if (!user) throw new BadRequestException('Bunday ID ga ega kitobxon topilmadi (siglaNumber xato).');
    if (user.status !== 'ACTIVE') throw new BadRequestException('Bu kitobxon faol emas (bloklangan yoki muddati o\'tgan).');
    if (user.fines && user.fines.length > 0) {
      throw new BadRequestException('Kitobxonda to\'lanmagan jarima bor! Iltimos, avval qarzni to\'lang.');
    }

    // 2. Find BookCopy
    const copy = await this.prisma.bookCopy.findUnique({
      where: { barcode },
    });

    if (!copy) throw new BadRequestException('Bunday shtrix-kodli kitob topilmadi.');
    if (copy.status !== 'AVAILABLE') throw new BadRequestException('Bu kitob band yoki ijarada.');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 kunlik ijara

    return this.prisma.$transaction(async (tx) => {
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'LOANED' },
      });

      return tx.loan.create({
        data: {
          bookCopyId: copy.id,
          userId: user.id,
          issuedById,
          dueDate,
        },
        include: {
          bookCopy: { include: { book: true } },
          user: true
        }
      });
    });
  }

  async returnBook(barcode: string) {
    const copy = await this.prisma.bookCopy.findUnique({
      where: { barcode },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!copy || copy.loans.length === 0) {
      throw new BadRequestException('Aktiv ijara jarayonidagi bunday shtrix-kod topilmadi.');
    }

    const loan = copy.loans[0];
    const today = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Free the book
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'AVAILABLE' }
      });

      // Update the loan
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: { 
          status: 'RETURNED', 
          returnDate: today 
        },
        include: {
          user: true,
          bookCopy: { include: { book: true } }
        }
      });

      // Fine Calculation: if overdue
      if (today > loan.dueDate) {
        const diffTime = Math.abs(today.getTime() - loan.dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const fineAmount = diffDays * 5000; // 5000 UZS per day

        await tx.fine.create({
          data: {
            loanId: loan.id,
            userId: loan.userId,
            amount: fineAmount,
            reason: `${diffDays} kun kechiktirilgani uchun jarima`,
            status: 'UNPAID'
          }
        });

        // Add a flag to return object so frontend knows a fine was created
        return { ...updatedLoan, fineCreated: true, fineAmount };
      }

      return { ...updatedLoan, fineCreated: false, fineAmount: 0 };
    });
  }
}
