import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.pengguna.findMany({
    where: { peran: 'PENJUAL' },
    include: { profilPenjual: { include: { toko: true } } }
  });

  for (const seller of sellers) {
    if (!seller.profilPenjual || (seller.profilPenjual && !(seller.profilPenjual as any).toko)) {
      console.log(`Fixing seller: ${seller.email}`);
      const slug = `toko-${seller.id_pengguna.substring(0, 8)}`;
      
      let profilId = seller.profilPenjual?.id_profilPenjual;

      if (!seller.profilPenjual) {
        const profil = await prisma.profilPenjual.create({
          data: {
            penggunaId: seller.id_pengguna,
            namaToko: `Toko ${seller.nama || 'Baru'}`,
            slugToko: slug,
            noTelepon: seller.noTelepon || '-',
            alamat: '-',
            kota: '-',
            provinsi: '-',
            kodePos: '-',
            status: 'DISETUJUI',
            terverifikasiPada: new Date(),
          }
        });
        profilId = profil.id_profilPenjual;
      }

      if (!(seller.profilPenjual as any)?.toko) {
        await prisma.toko.create({
          data: {
            penjualId: profilId!,
            nama: `Toko ${seller.nama || 'Baru'}`,
            slug: slug,
            alamat: '-',
            kabupaten: '-',
            wilayah: '-',
            telepon: seller.noTelepon || '-',
            lat: 0,
            lng: 0
          }
        });
        console.log(`Created store for ${seller.email}`);
      }
    }
  }
}

main().then(() => {
  console.log('Done');
  process.exit(0);
});
