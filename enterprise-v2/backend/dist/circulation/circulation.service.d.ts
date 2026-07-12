import { PrismaService } from '../prisma/prisma.service';
export declare class CirculationService {
    private prisma;
    constructor(prisma: PrismaService);
    issueBook(siglaNumber: string, barcode: string, issuedById: string): Promise<{
        user: {
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
        };
        bookCopy: {
            book: {
                id: string;
                isbn: string | null;
                title: string;
                author: string | null;
                publisher: string | null;
                publishYear: number | null;
                categoryId: string | null;
                description: string | null;
                coverImageUrl: string | null;
                isDigital: boolean;
                digitalFileUrl: string | null;
            };
        } & {
            id: string;
            branchId: string;
            status: string;
            barcode: string;
            bookId: string;
            shelfLocation: string | null;
            conditionNotes: string | null;
        };
    } & {
        id: string;
        status: string;
        userId: string;
        bookCopyId: string;
        issuedById: string;
        issueDate: Date;
        dueDate: Date;
        returnDate: Date | null;
        renewCount: number;
    }>;
    returnBook(barcode: string): Promise<{
        fineCreated: boolean;
        fineAmount: number;
        user: {
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
        };
        bookCopy: {
            book: {
                id: string;
                isbn: string | null;
                title: string;
                author: string | null;
                publisher: string | null;
                publishYear: number | null;
                categoryId: string | null;
                description: string | null;
                coverImageUrl: string | null;
                isDigital: boolean;
                digitalFileUrl: string | null;
            };
        } & {
            id: string;
            branchId: string;
            status: string;
            barcode: string;
            bookId: string;
            shelfLocation: string | null;
            conditionNotes: string | null;
        };
        id: string;
        status: string;
        userId: string;
        bookCopyId: string;
        issuedById: string;
        issueDate: Date;
        dueDate: Date;
        returnDate: Date | null;
        renewCount: number;
    }>;
}
