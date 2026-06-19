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

  // ── Konsumen / User Biasa ─────────────────────────────────────────────
  const konsumen = await prisma.pengguna.upsert({
    where: { email: 'user@agro.local' },
    update: {},
    create: {
      id: '660e8400-e29b-41d4-a716-446655440001',
      email: 'user@agro.local',
      kataSandi: hashedPassword,
      nama: 'Konsumen Agro',
      noTelepon: '0812-9876-5432',
      peran: 'KONSUMEN',
      emailTerverifikasiPada: new Date(),
    },
  });

  // ── Penjual ───────────────────────────────────────────────────────────
  const penjual = await prisma.pengguna.upsert({
    where: { email: 'seller@agro.local' },
    update: {},
    create: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      email: 'seller@agro.local',
      kataSandi: hashedPassword,
      nama: 'Penjual Agro',
      noTelepon: '0812-5555-4444',
      peran: 'PENJUAL',
      emailTerverifikasiPada: new Date(),
    },
  });

  return {
    admin,
    konsumen,
    penjual,
  };
}
