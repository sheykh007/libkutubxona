import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    
    // Seed default branch
    const defaultBranch = await this.branch.findFirst();
    let branchId = defaultBranch?.id;
    
    if (!defaultBranch) {
      const newBranch = await this.branch.create({
        data: {
          name: 'Asosiy Kutubxona',
          address: 'Toshkent sh., Navoiy ko\'chasi 1',
          contactEmail: 'info@library.uz'
        }
      });
      branchId = newBranch.id;
      console.log('Seeded default branch: Asosiy Kutubxona');
    }

    // Seed admin
    const adminEmail = 'admin@library.uz';
    const existingAdmin = await this.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await this.user.create({
        data: {
          email: adminEmail,
          firstName: 'Asosiy',
          lastName: 'Admin',
          phone: '+998901234567',
          passwordHash: hash,
          role: 'ADMIN',
          memberType: 'VIP',
          branchId: branchId
        }
      });
      console.log('Seeded default admin user: admin@library.uz / admin123');
    }
  }
}
