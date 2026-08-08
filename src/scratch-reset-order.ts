import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orderId = "0a8e29d7-f804-4c6f-b7d7-c01fe05e8d5c";
  
  // Get the real courier ID assigned to the store
  const toko = await prisma.toko.findFirst({
    include: { kurirStaffs: true, penjual: { include: { kurir: true } } }
  });

  const courierId = toko?.kurirStaffs?.[0]?.id_pengguna || toko?.penjual?.kurir?.id_pengguna || null;

  if (courierId) {
    console.log("Setting real courier ID:", courierId);
  }

  // Reset pengiriman to PREPARING
  await prisma.pengirimanPesananEcom.update({
    where: { pesananId: orderId },
    data: {
      status: "PREPARING",
      kurirPenggunaId: courierId,
      kurirNama: "Kurir Toko",
      kurirTelepon: "08123456789",
      trackingHistory: [
        {
          note: "Pesanan sedang disiapkan oleh penjual",
          label: "Sedang Disiapkan",
          status: "PREPARING",
          timestamp: new Date().toISOString()
        }
      ]
    }
  });

  // Reset pesanan status to DIPROSES
  await prisma.pesananEcom.update({
    where: { id_pesanan: orderId },
    data: { status: "DIPROSES" }
  });

  console.log("Order has been reset to PREPARING so the user can test the 'Serahkan ke Kurir' feature again.");

  await prisma.$disconnect();
}

main().catch(console.error);
