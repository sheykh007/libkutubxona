import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(): Promise<{
        totalBooks: number;
        activeMembers: number;
        booksLoaned: number;
        overdueReturns: number;
        recentActivity: {
            id: string;
            userName: string;
            bookTitle: any;
            action: string;
            date: any;
        }[];
    }>;
}
