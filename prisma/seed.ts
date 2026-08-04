/**
 * SEED ECOMMERCE
 * Setiap dijalankan: lakukan upsert data awal (akun admin).
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 SEED ECOMMERCE\n');

  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Admin ───────────────────────────────────────────────────────────
  await prisma.pengguna.upsert({
    where: { id_pengguna: '550e8400-e29b-41d4-a716-446655440000' },
    update: {
      email: 'kurniawan3516@gmail.com',
      peran: 'SUPER_ADMIN',
      nama: 'Admin Agro Jabar',
      noTelepon: '081234567890',
      emailTerverifikasiPada: new Date(),
    },
    create: {
      id_pengguna: '550e8400-e29b-41d4-a716-446655440000',
      email: 'kurniawan3516@gmail.com',
      kataSandi: hashedPassword,
      nama: 'Admin Agro Jabar',
      noTelepon: '081234567890',
      peran: 'SUPER_ADMIN',
      emailTerverifikasiPada: new Date(),
      noTeleponTerverifikasiPada: new Date(),
    },
  });

  console.log('\n✅ Seed ECOMMERCE selesai.\n');
  console.log('📋 Akun (password: password123):');
  console.log('  kurniawan3516@gmail.com    SUPER_ADMIN');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
