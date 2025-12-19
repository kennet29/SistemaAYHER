"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
exports.env = {
    PORT: Number(process.env.PORT ?? 4000),
    JWT_SECRET: process.env.JWT_SECRET ?? 'change_me'
};
