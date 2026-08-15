const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tx = await prisma.transaksiKeuntungan.findMany({ select: { produkId: true }, take: 10 });
  const p = await prisma.produkEcom.findMany({
    where: { id_produk: { in: tx.map(t=>t.produkId) } },
    select: { id_produk: true, masterProdukId: true, masterProduk: true }
  });
  console.log(JSON.stringify(p, null, 2));
}
main().finally(() => prisma.$disconnect());
