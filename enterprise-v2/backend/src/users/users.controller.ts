import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('members')
  @ApiOperation({ summary: 'Get all members (readers)' })
  findAll() {
    return this.usersService.findAllMembers();
  }

  @Get('members/:siglaNumber')
  @ApiOperation({ summary: 'Get member by siglaNumber' })
  findOne(@Param('siglaNumber') siglaNumber: string) {
    return this.usersService.findMemberBySigla(siglaNumber);
  }

  @Post('members')
  @ApiOperation({ summary: 'Register a new member' })
  create(@Body() data: any) {
    return this.usersService.createMember(data);
  }
}
