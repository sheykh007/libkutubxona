import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllMembers() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['MEMBER', 'STUDENT', 'TEACHER'] } // Show non-admin users
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findMemberBySigla(siglaNumber: string) {
    return this.prisma.user.findUnique({
      where: { siglaNumber },
      include: { fines: { where: { status: 'UNPAID' } } }
    });
  }

  async createMember(data: any) {
    const existingPhone = await this.prisma.user.findUnique({ where: { phone: data.phone } });
    if (existingPhone) {
      throw new BadRequestException('Bu telefon raqami allaqachon ro\'yxatdan o\'tgan');
    }

    // Generate ID automatically
    const userCount = await this.prisma.user.count();
    const generatedSigla = `M_${String(userCount + 1).padStart(4, '0')}`;

    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        passwordHash: 'no-password-needed',
        role: 'MEMBER',
        memberType: data.memberType || 'STUDENT',
        siglaNumber: generatedSigla,
        status: 'ACTIVE'
      }
    });
  }
}
