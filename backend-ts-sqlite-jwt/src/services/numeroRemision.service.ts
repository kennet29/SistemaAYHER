import { prisma } from "../db/prisma";

export async function generarNumeroRemision() {
  const ultima = await prisma.remision.findFirst({
    orderBy: { id: "desc" },
    select: { numero: true }
  });

  if (!ultima?.numero) return "REM-000001";

  const num = parseInt(ultima.numero.replace("REM-", "")) + 1;
  return `REM-${String(num).padStart(6, "0")}`;
}
