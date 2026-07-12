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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirculationController = void 0;
const common_1 = require("@nestjs/common");
const circulation_service_1 = require("./circulation.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let CirculationController = class CirculationController {
    circulationService;
    constructor(circulationService) {
        this.circulationService = circulationService;
    }
    issueBook(req, body) {
        return this.circulationService.issueBook(body.siglaNumber, body.barcode, req.user.id);
    }
    returnBook(req, body) {
        return this.circulationService.returnBook(body.barcode);
    }
};
exports.CirculationController = CirculationController;
__decorate([
    (0, common_1.Post)('issue'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CirculationController.prototype, "issueBook", null);
__decorate([
    (0, common_1.Post)('return'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CirculationController.prototype, "returnBook", null);
exports.CirculationController = CirculationController = __decorate([
    (0, swagger_1.ApiTags)('circulation'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('circulation'),
    __metadata("design:paramtypes", [circulation_service_1.CirculationService])
], CirculationController);
//# sourceMappingURL=circulation.controller.js.map