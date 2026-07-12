import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<{
        id: string;
        email: string | null;
        phone: string;
        siglaNumber: string | null;
        branchId: string | null;
        firstName: string;
        lastName: string;
        passwordHash: string;
        role: string;
        memberType: string;
        qrCodeUrl: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    findOne(siglaNumber: string): Promise<({
        fines: {
            id: string;
            status: string;
            createdAt: Date;
            loanId: string;
            userId: string;
            amount: number;
            reason: string | null;
        }[];
    } & {
        id: string;
        email: string | null;
        phone: string;
        siglaNumber: string | null;
        branchId: string | null;
        firstName: string;
        lastName: string;
        passwordHash: string;
        role: string;
        memberType: string;
        qrCodeUrl: string | null;
        status: string;
        createdAt: Date;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        email: string | null;
        phone: string;
        siglaNumber: string | null;
        branchId: string | null;
        firstName: string;
        lastName: string;
        passwordHash: string;
        role: string;
        memberType: string;
        qrCodeUrl: string | null;
        status: string;
        createdAt: Date;
    }>;
}
