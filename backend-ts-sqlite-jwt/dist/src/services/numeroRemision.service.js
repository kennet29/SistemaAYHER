"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarNumeroRemision = generarNumeroRemision;
const prisma_1 = require("../db/prisma");
async function generarNumeroRemision() {
    const ultima = await prisma_1.prisma.remision.findFirst({
        orderBy: { id: "desc" },
        select: { numero: true }
    });
    if (!ultima?.numero)
        return "REM-000001";
    const num = parseInt(ultima.numero.replace("REM-", "")) + 1;
    return `REM-${String(num).padStart(6, "0")}`;
}
