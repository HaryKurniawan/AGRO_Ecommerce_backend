import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as https from "https";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class PerTokoTelegramService implements OnModuleInit {
  private readonly logger = new Logger(PerTokoTelegramService.name);
  private readonly sellerAppUrl: string;
  private readonly activePollers = new Map<string, boolean>();
  private readonly lastUpdateIds = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.sellerAppUrl =
      this.config.get<string>("FRONTEND_OPERASIONAL_URL")
  }

  async onModuleInit() {
    this.logger.log("Memulai Telegram Long Polling untuk toko-toko...");
    await this.startAllPollers();
  }

  /**
   * Mengambil semua toko yang memiliki konfigurasi Telegram dan memulai polling.
   */
  async startAllPollers() {
    const stores = await this.prisma.toko.findMany({
      where: {
        telegramBotToken: { not: null },
        telegramChatId: { not: null },
      },
      select: { telegramBotToken: true, telegramChatId: true },
    });

    for (const store of stores) {
      if (store.telegramBotToken && store.telegramChatId) {
        this.startPollingForBot(store.telegramBotToken, store.telegramChatId);
      }
    }
  }

  /**
   * Memulai polling untuk satu bot jika belum berjalan.
   */
  startPollingForBot(token: string, chatId: string) {
    if (this.activePollers.get(token)) return;

    this.activePollers.set(token, true);
    if (!this.lastUpdateIds.has(token)) {
      this.lastUpdateIds.set(token, 0);
    }

    this.logger.log(`Memulai polling untuk bot: ${token.substring(0, 8)}...`);
    this.poll(token, chatId);
  }

  /**
   * Menghentikan polling untuk satu bot.
   */
  stopPollingForBot(token: string) {
    this.activePollers.set(token, false);
  }

  private poll(token: string, chatId: string) {
    if (!this.activePollers.get(token)) return;

    const offset = this.lastUpdateIds.get(token) || 0;
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/getUpdates?offset=${offset}&timeout=30`,
        method: "GET",
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(raw);
            if (data.ok && data.result.length > 0) {
              this.processUpdates(token, chatId, data.result);
            }
          } catch (e) {
            // Abaikan error parse
          }
          // Loop polling kembali
          setTimeout(() => this.poll(token, chatId), 1000);
        });
      },
    );

    req.on("error", () => {
      // Jika internet putus, coba lagi 5 detik kemudian
      setTimeout(() => this.poll(token, chatId), 5000);
    });

    req.end();
  }

  private async processUpdates(token: string, chatId: string, updates: any[]) {
    for (const update of updates) {
      this.lastUpdateIds.set(token, update.update_id + 1);

      if (update.callback_query) {
        const query = update.callback_query;
        const data = query.data;

        // Validasi keamanan: Pastikan klik berasal dari chat yang sah
        const sourceChatId = query.message?.chat?.id?.toString();
        if (sourceChatId && sourceChatId !== chatId) {
          await this.answerCallbackQuery(
            token,
            query.id,
            "⛔ Akses Ditolak!",
          );
          continue;
        }

        if (data.startsWith("tandai_dibaca:")) {
          const orderId = data.split(":")[1];
          try {
            await this.answerCallbackQuery(
              token,
              query.id,
              "✅ Pesanan ditandai sudah dibaca!",
            );

            let newText = query.message.text;
            if (newText.includes("Silakan cek detail pesanan di web!")) {
              newText = newText.replace(
                "Silakan cek detail pesanan di web!",
                "✅ STATUS: SUDAH DIBACA",
              );
            } else if (
              newText.includes("Silakan cetak resi dan serahkan ke kurir!")
            ) {
              newText = newText.replace(
                "Silakan cetak resi dan serahkan ke kurir!",
                "✅ STATUS: SUDAH DIBACA",
              );
            } else {
              newText = newText + "\n\n✅ STATUS: SUDAH DIBACA";
            }

            const isLocalhost = this.sellerAppUrl.includes("localhost") || this.sellerAppUrl.includes("127.0.0.1");
            
            // Telegram Bot API memblokir URL 'localhost'. Gunakan nip.io sebagai trik DNS lokal.
            let safeAppUrl = this.sellerAppUrl;
            if (isLocalhost) {
              safeAppUrl = safeAppUrl.replace("localhost", "127.0.0.1.nip.io");
            }

            const inline_keyboard: any[] = [];
            
            inline_keyboard.push([
              {
                text: "🌐 Buka Web Seller",
                url: `${safeAppUrl}/seller/pesanan`,
              },
            ]);

            if (!isLocalhost) {
              inline_keyboard.push([
                {
                  text: "🌐 Lihat Detail Spesifik",
                  url: `${safeAppUrl}/seller/pesanan/${orderId}`,
                },
              ]);
            }

            const newReplyMarkup = {
              inline_keyboard,
            };

            await this.editMessageText(
              token,
              chatId,
              query.message.message_id,
              newText,
              newReplyMarkup,
              undefined
            );
          } catch (err: any) {
            await this.answerCallbackQuery(
              token,
              query.id,
              "❌ Error: " + (err.message || "Unknown error"),
            );
          }
        }
      }
    }
  }

  // --- API Helpers ---

  async sendMessage(
    token: string,
    chatId: string,
    text: string,
    reply_markup?: any,
    parseMode: string = "HTML"
  ): Promise<void> {
    const body = JSON.stringify({
      chat_id: chatId,
      parse_mode: parseMode,
      text,
      ...(reply_markup && { reply_markup }),
    });

    return new Promise((resolve) => {
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
            if (res.statusCode !== 200) {
              this.logger.warn(`Telegram API error ${res.statusCode}: ${raw}`);
            }
            resolve();
          });
        },
      );
      req.on("error", (err) => {
        this.logger.warn(`Gagal kirim notif Telegram: ${err.message}`);
        resolve();
      });
      req.write(body);
      req.end();
    });
  }

  async editMessageText(
    token: string,
    chatId: string,
    messageId: number,
    text: string,
    reply_markup?: any,
    parseMode?: string
  ): Promise<void> {
    const body = JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      ...(parseMode && { parse_mode: parseMode }),
      text,
      ...(reply_markup && { reply_markup }),
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${token}/editMessageText`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", resolve);
        },
      );
      req.on("error", () => resolve());
      req.write(body);
      req.end();
    });
  }

  async answerCallbackQuery(
    token: string,
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
    const body = JSON.stringify({ callback_query_id: callbackQueryId, text });
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${token}/answerCallbackQuery`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", resolve);
        },
      );
      req.on("error", () => resolve());
      req.write(body);
      req.end();
    });
  }

  /**
   * Validasi token dan kirim pesan tes
   */
  async validateTelegramConfig(token: string, chatId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const text = "✅ <b>Koneksi Berhasil!</b>\nNotifikasi pesanan dari Agro Jabar akan dikirimkan ke chat ini.";
      const body = JSON.stringify({
        chat_id: chatId,
        parse_mode: "HTML",
        text,
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
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
      );
      req.on("error", () => resolve(false));
      req.write(body);
      req.end();
    });
  }

  /**
   * Shortcut: Notifikasi pesanan baru (Per Toko)
   */
  async sendNewOrderNotif(params: {
    tokoId: string;
    orderId: string;
    namaToko: string;
    namaPembeli: string;
    totalHarga: number;
    jumlahItem: number;
    metodeBayar: string;
    detailProdukText?: string;
  }): Promise<void> {
    const {
      tokoId,
      orderId,
      namaToko,
      namaPembeli,
      totalHarga,
      jumlahItem,
      metodeBayar,
    } = params;

    const toko = await this.prisma.toko.findUnique({
      where: { id: tokoId },
      select: { telegramBotToken: true, telegramChatId: true },
    });

    if (!toko?.telegramBotToken || !toko?.telegramChatId) {
      return; // Toko belum konfigurasi Telegram, abaikan
    }

    const shortId = orderId.slice(0, 8).toUpperCase();
    const nominal = new Intl.NumberFormat("id-ID").format(totalHarga);
    const safeMetodeBayar = (metodeBayar || "").replace(/_/g, " ");

    const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeToko = escapeHtml(namaToko || "Toko");
    const safePembeli = escapeHtml(namaPembeli || "Pembeli");

    const text =
      `<b>PESANAN BARU MASUK!</b>\n` +
      `\n` +
      `<b>ID Pesanan:</b> <code>#${shortId}</code>\n` +
      `<b>Pembeli:</b> ${safePembeli}\n` +
      `<b>Total Item:</b> ${jumlahItem} item\n` +
      `\n` +
      (params.detailProdukText ? `<b>Daftar Produk:</b>\n${params.detailProdukText}\n` : "") +
      `\n` +
      `<b>Total:</b> Rp ${nominal}\n` +
      `<b>Bayar via:</b> ${escapeHtml(safeMetodeBayar)}\n` +
      `\n` +
      `⏳ Silakan cek detail pesanan di web!`;

    const isLocalhost = this.sellerAppUrl.includes("localhost") || this.sellerAppUrl.includes("127.0.0.1");

    // Telegram Bot API memblokir URL 'localhost'. Gunakan nip.io sebagai trik DNS lokal.
    let safeAppUrl = this.sellerAppUrl;
    if (isLocalhost) {
      safeAppUrl = safeAppUrl.replace("localhost", "127.0.0.1.nip.io");
    }

    const inline_keyboard: any[] = [
      [
        {
          text: "✅ Tandai sudah dibaca",
          callback_data: `tandai_dibaca:${orderId}`,
        },
      ],
    ];

    inline_keyboard.push([
      {
        text: "🌐 Buka Web Seller",
        url: `${safeAppUrl}/seller/pesanan`,
      },
    ]);

    if (!isLocalhost) {
      inline_keyboard.push([
        {
          text: "🌐 Lihat Detail Spesifik",
          url: `${safeAppUrl}/seller/pesanan/${orderId}`,
        },
      ]);
    }

    const reply_markup = {
      inline_keyboard,
    };

    void this.sendMessage(
      toko.telegramBotToken,
      toko.telegramChatId,
      text,
      reply_markup,
      "HTML"
    );
  }
}
