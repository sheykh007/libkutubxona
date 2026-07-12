import { BooksService } from './books.service';
export declare class BooksController {
    private readonly booksService;
    constructor(booksService: BooksService);
    create(createBookDto: any): Promise<{
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
    addCopies(id: string, copiesDto: any[]): Promise<import(".prisma/client").Prisma.BatchPayload>;
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
}
