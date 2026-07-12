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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats() {
        const totalBooks = await this.prisma.bookCopy.count();
        const activeMembers = await this.prisma.user.count({
            where: { role: { in: ['MEMBER', 'STUDENT', 'TEACHER'] } }
        });
        const booksLoaned = await this.prisma.bookCopy.count({
            where: { status: 'LOANED' }
        });
        const overdueReturns = await this.prisma.loan.count({
            where: {
                status: 'ACTIVE',
                dueDate: { lt: new Date() }
            }
        });
        const recentActivity = await this.prisma.loan.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                bookCopy: { include: { book: true } }
            }
        });
        return {
            totalBooks,
            activeMembers,
            booksLoaned,
            overdueReturns,
            recentActivity: recentActivity.map(loan => ({
                id: loan.id,
                userName: `${loan.user.lastName} ${loan.user.firstName}`,
                bookTitle: loan.bookCopy.book.title,
                action: loan.status === 'RETURNED' ? 'Qaytarildi' : 'Berildi',
                date: loan.createdAt
            }))
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map