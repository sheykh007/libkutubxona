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
exports.CirculationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CirculationService = class CirculationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async issueBook(siglaNumber, barcode, issuedById) {
        const user = await this.prisma.user.findUnique({
            where: { siglaNumber },
            include: {
                fines: {
                    where: { status: 'UNPAID' }
                }
            }
        });
        if (!user)
            throw new common_1.BadRequestException('Bunday ID ga ega kitobxon topilmadi (siglaNumber xato).');
        if (user.status !== 'ACTIVE')
            throw new common_1.BadRequestException('Bu kitobxon faol emas (bloklangan yoki muddati o\'tgan).');
        if (user.fines && user.fines.length > 0) {
            throw new common_1.BadRequestException('Kitobxonda to\'lanmagan jarima bor! Iltimos, avval qarzni to\'lang.');
        }
        const copy = await this.prisma.bookCopy.findUnique({
            where: { barcode },
        });
        if (!copy)
            throw new common_1.BadRequestException('Bunday shtrix-kodli kitob topilmadi.');
        if (copy.status !== 'AVAILABLE')
            throw new common_1.BadRequestException('Bu kitob band yoki ijarada.');
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
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
    async returnBook(barcode) {
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
            throw new common_1.BadRequestException('Aktiv ijara jarayonidagi bunday shtrix-kod topilmadi.');
        }
        const loan = copy.loans[0];
        const today = new Date();
        return this.prisma.$transaction(async (tx) => {
            await tx.bookCopy.update({
                where: { id: copy.id },
                data: { status: 'AVAILABLE' }
            });
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
            if (today > loan.dueDate) {
                const diffTime = Math.abs(today.getTime() - loan.dueDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const fineAmount = diffDays * 5000;
                await tx.fine.create({
                    data: {
                        loanId: loan.id,
                        userId: loan.userId,
                        amount: fineAmount,
                        reason: `${diffDays} kun kechiktirilgani uchun jarima`,
                        status: 'UNPAID'
                    }
                });
                return { ...updatedLoan, fineCreated: true, fineAmount };
            }
            return { ...updatedLoan, fineCreated: false, fineAmount: 0 };
        });
    }
};
exports.CirculationService = CirculationService;
exports.CirculationService = CirculationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CirculationService);
//# sourceMappingURL=circulation.service.js.map