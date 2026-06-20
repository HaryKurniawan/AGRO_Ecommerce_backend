/**
 * SEED ECOMMERCE — Full reset.
 * Setiap dijalankan: BERSIHKAN semua data dulu, lalu seed ulang dari nol.
 */

import { PrismaClient } from '@prisma/client';

import { cleanup } from './seeds/00_cleanup';
import { seedUsers } from './seeds/01_users';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 SEED ECOMMERCE (full reset)\n');

  await cleanup(prisma);
  await seedUsers(prisma);

  console.log('\n✅ Seed ECOMMERCE selesai (data lama dibersihkan).\n');
  console.log('📋 Akun (password: password123):');
  console.log('  admin@agro.local           SUPER_ADMIN');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
