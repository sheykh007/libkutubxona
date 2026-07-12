import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
        id: string;
        email: string | null;
        phone: string;
        siglaNumber: string | null;
        branchId: string | null;
        firstName: string;
        lastName: string;
        role: string;
        memberType: string;
        qrCodeUrl: string | null;
        status: string;
        createdAt: Date;
    }>;
}
export {};
