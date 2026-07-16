import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Admin ───────────────────────────────────────────────────────────
  const admin = await prisma.pengguna.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440000' },
    update: {
      email: 'kurniawan3516@gmail.com',
      peran: 'SUPER_ADMIN',
      nama: 'Admin Agro Jabar',
      noTelepon: '081234567890',
      emailTerverifikasiPada: new Date(),
    },
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'kurniawan3516@gmail.com',
      kataSandi: hashedPassword,
      nama: 'Admin Agro Jabar',
      noTelepon: '081234567890',
      peran: 'SUPER_ADMIN',
      emailTerverifikasiPada: new Date(),
      noTeleponTerverifikasiPada: new Date(),
    },
  });

  return {
    admin,
  };
}
