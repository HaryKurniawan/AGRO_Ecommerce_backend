const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.pengguna.findMany({
    where: {
      id_pengguna: { in: ['2e0cf7b8-63f4-4995-995a-e7e1d1ab804b', '7919e939-c5b8-4d13-92d5-40ec1e62cb88'] }
    },
    include: { profilPenjual: true }
  });
  console.log(users);
}
main().finally(() => prisma.$disconnect());
