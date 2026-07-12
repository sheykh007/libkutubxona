import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('fines')
  getAllFines() {
    return this.financeService.getAllFines();
  }

  @Post('pay/:id')
  payFine(@Param('id') id: string) {
    return this.financeService.payFine(id);
  }
}
