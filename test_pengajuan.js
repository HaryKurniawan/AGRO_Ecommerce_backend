const { PrismaClient } = require('@prisma/client');
// Let Prisma use its own env (DATABASE_URL from .env)
const prisma = new PrismaClient();
async function main() {
  // Check which db we are actually connected to
  const dbResult = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
  console.log('Connected to:', dbResult);
  
  const rows = await prisma.pengajuanStokToko.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('PengajuanStokToko count:', rows.length);
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(console.error);
