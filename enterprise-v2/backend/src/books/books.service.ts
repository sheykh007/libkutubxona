import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.book.findMany({
      include: { copies: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.book.findUnique({
      where: { id },
      include: { copies: true },
    });
  }

  async findByBarcode(barcode: string) {
    return this.prisma.bookCopy.findUnique({
      where: { barcode },
      include: { book: true }
    });
  }

  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the book
      const book = await tx.book.create({ data });

      // 2. Fetch the default branch
      const branch = await tx.branch.findFirst();
      if (branch) {
        // Generate a random 6-digit barcode (e.g. B_829102)
        const barcode = `B_${Math.floor(100000 + Math.random() * 900000)}`;
        await tx.bookCopy.create({
          data: {
            bookId: book.id,
            branchId: branch.id,
            barcode: barcode,
            status: 'AVAILABLE'
          }
        });
      }
      return book;
    });
  }

  async addCopies(bookId: string, copies: any[]) {
    const copyData = copies.map(c => ({
      ...c,
      bookId,
    }));
    return this.prisma.bookCopy.createMany({
      data: copyData,
    });
  }
}
