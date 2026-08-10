const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const chats = await prisma.pesanChat.findMany({ take: 5, orderBy: { createdAt: 'desc' }});
  console.log('--- CHATS ---');
  console.log(chats);
  const conv = await prisma.percakapanChat.findMany({ take: 2, orderBy: { createdAt: 'desc' }});
  console.log('--- CONV ---');
  console.log(conv);
}
main().finally(() => prisma.$disconnect());
