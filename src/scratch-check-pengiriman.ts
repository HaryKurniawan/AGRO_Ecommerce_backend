import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orderId = "0a8e29d7-f804-4c6f-b7d7-c01fe05e8d5c";
  
  const pengiriman = await prisma.pengirimanPesananEcom.findUnique({
    where: { pesananId: orderId }
  });
  
  console.log("Pengiriman details:", JSON.stringify(pengiriman, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
