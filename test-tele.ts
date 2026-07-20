import { PrismaClient } from '@prisma/client';
import * as https from 'https';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.pesananEcom.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!order) {
    console.log("Tidak ada pesanan di database.");
    return;
  }

  console.log(`Menggunakan Order ID: ${order.id}`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("Token / Chat ID tidak ada");
    return;
  }

  const orderId = order.id;
  const sellerAppUrl = "http://127.0.0.1:3004";
  const shortId = orderId.slice(0, 8).toUpperCase();
  const nominal = new Intl.NumberFormat("id-ID").format(Number(order.totalHarga) || 0);

  const safeMetodeBayar = (order.metodeBayar || "").replace(/_/g, " ");

  const text = `🛒 *PESANAN BARU MASUK!*\n` +
        `\n` +
        `📦 *Toko:* Toko Test\n` +
        `🆔 *ID Pesanan:* \`#${shortId}\`\n` +
        `👤 *Pembeli:* Pembeli Test\n` +
        `🛍 *Produk:* 1 item\n` +
        `💰 *Total:* Rp ${nominal}\n` +
        `💳 *Bayar via:* ${safeMetodeBayar}\n` +
        `\n` +
        `⏳ Silakan cetak resi dan serahkan ke kurir!`;

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: "⚙️ Proses Pesanan",
          callback_data: `proses:${orderId}`,
        },
      ],
      [
        {
          text: "📦 Kirim Pesanan",
          url: `${sellerAppUrl}/seller/pesanan/${orderId}`,
        },
        {
          text: "🖨️ Cetak Resi",
          url: `${sellerAppUrl}/seller/cetak-resi/${orderId}`,
        },
      ],
    ],
  };

  const body = JSON.stringify({
    chat_id: chatId,
    parse_mode: "Markdown",
    text,
    reply_markup,
  });

  const req = https.request(
    {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        console.log("Response:", raw);
      });
    }
  );

  req.on("error", (err) => {
    console.error(err);
  });
  req.write(body);
  req.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
