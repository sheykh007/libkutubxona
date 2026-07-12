import { PrismaService } from '../prisma/prisma.service';
export declare class BooksService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        copies: {
            id: string;
            branchId: string;
            status: string;
            barcode: string;
            bookId: string;
            shelfLocation: string | null;
            conditionNotes: string | null;
        }[];
    } & {
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
    })[]>;
    findOne(id: string): Promise<({
        copies: {
            id: string;
            branchId: string;
            status: string;
            barcode: string;
            bookId: string;
            shelfLocation: string | null;
            conditionNotes: string | null;
        }[];
    } & {
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
    }) | null>;
    findByBarcode(barcode: string): Promise<({
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
    }) | null>;
    create(data: any): Promise<{
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
    }>;
    addCopies(bookId: string, copies: any[]): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
