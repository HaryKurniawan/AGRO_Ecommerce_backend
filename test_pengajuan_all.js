const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const req = await prisma.pengajuanStokToko.findMany();
  console.log(JSON.stringify(req, null, 2));
}
main();
