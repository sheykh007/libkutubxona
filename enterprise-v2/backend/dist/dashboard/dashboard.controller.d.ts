import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
