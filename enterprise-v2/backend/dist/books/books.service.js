"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BooksService = class BooksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.book.findMany({
            include: { copies: true },
        });
    }
    async findOne(id) {
        return this.prisma.book.findUnique({
            where: { id },
            include: { copies: true },
        });
    }
    async findByBarcode(barcode) {
        return this.prisma.bookCopy.findUnique({
            where: { barcode },
            include: { book: true }
        });
    }
    async create(data) {
        return this.prisma.$transaction(async (tx) => {
            const book = await tx.book.create({ data });
            const branch = await tx.branch.findFirst();
            if (branch) {
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
    async addCopies(bookId, copies) {
        const copyData = copies.map(c => ({
            ...c,
            bookId,
        }));
        return this.prisma.bookCopy.createMany({
            data: copyData,
        });
    }
};
exports.BooksService = BooksService;
exports.BooksService = BooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BooksService);
//# sourceMappingURL=books.service.js.map