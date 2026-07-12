import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllMembers(): Promise<{
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
    findMemberBySigla(siglaNumber: string): Promise<({
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
    createMember(data: any): Promise<{
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
