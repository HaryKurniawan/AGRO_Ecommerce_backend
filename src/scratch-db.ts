import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const toko = await prisma.toko.findFirst({
    include: { pesananEcoms: true }
  });
  console.log("Toko ID:", toko?.id_toko);
  console.log("Pesanan count:", toko?.pesananEcoms.length);
  if (toko?.pesananEcoms.length) {
    console.log("Sample Pesanan:", JSON.stringify(toko.pesananEcoms[0], null, 2));
  }
  await prisma.$disconnect();
}

main().catch(console.error);
