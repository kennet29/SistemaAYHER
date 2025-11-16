"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../middleware/auth");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('ADMIN'), user_controller_1.listUsers);
exports.userRouter.patch('/:id/role', auth_1.authenticate, (0, auth_1.requireRoles)('ADMIN'), user_controller_1.setRole);
