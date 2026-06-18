import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Admin ───────────────────────────────────────────────────────────
  const admin = await prisma.pengguna.upsert({
    where: { email: 'admin@agro.local' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@agro.local',
      kataSandi: hashedPassword,
      nama: 'Admin Agro Jabar',
      noTelepon: '0812-3456-7890',
      peran: 'SUPER_ADMIN',
      emailTerverifikasiPada: new Date(),
    },
  });

  return {
    admin,
  };
}
