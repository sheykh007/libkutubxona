import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CirculationService } from './circulation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('circulation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('circulation')
export class CirculationController {
  constructor(private readonly circulationService: CirculationService) {}

  @Post('issue')
  issueBook(@Request() req, @Body() body: { siglaNumber: string; barcode: string }) {
    return this.circulationService.issueBook(body.siglaNumber, body.barcode, req.user.id);
  }

  @Post('return')
  returnBook(@Request() req, @Body() body: { barcode: string }) {
    return this.circulationService.returnBook(body.barcode);
  }
}
