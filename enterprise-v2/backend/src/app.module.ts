import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { CirculationModule } from './circulation/circulation.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [PrismaModule, BooksModule, CirculationModule, AuthModule, UsersModule, DashboardModule, FinanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
