import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.pengguna.findMany({
    where: { peran: 'PENJUAL' },
    include: { profilPenjual: true }
  });

  console.log(`Found ${sellers.length} sellers.`);
  for (const s of sellers) {
    let toko = null;
    if (s.profilPenjual) {
      toko = await prisma.toko.findUnique({
        where: { penjualId: s.profilPenjual.id_profilPenjual }
      });
    }
    console.log(`- ${s.email} | Profil: ${!!s.profilPenjual} | Toko: ${!!toko}`);
  }
}

main().then(() => process.exit(0));
