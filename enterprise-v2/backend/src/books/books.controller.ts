import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  create(@Body() createBookDto: any) {
    return this.booksService.create(createBookDto);
  }

  @Post(':id/copies')
  addCopies(@Param('id') id: string, @Body() copiesDto: any[]) {
    return this.booksService.addCopies(id, copiesDto);
  }

  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get('copy/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.booksService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }
}
