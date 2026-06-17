import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/agro_platform?connection_limit=10&pool_timeout=30"
    }
  }
});

async function main() {
  const requests = await prisma.pengajuanStokToko.findMany({
    select: {
      id: true,
      gudangId: true,
      tokoId: true,
      status: true,
    }
  });
  console.log('Stock Requests in Ecom DB:');
  console.log(JSON.stringify(requests, null, 2));

  const uniqueGudangIds = Array.from(new Set(requests.map(r => r.gudangId)));
  console.log('Unique Gudang IDs in Ecom DB:', uniqueGudangIds);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
