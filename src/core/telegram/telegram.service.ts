import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as https from "https";

/**
 * TelegramService
 *
 * Mengirim pesan ke Telegram menggunakan Bot API.
 * Semua pengiriman dilakukan secara FIRE-AND-FORGET menggunakan
 * `void this.send(...)` agar tidak memblokir proses utama (checkout, dll).
 *
 * Cara pakai (fire-and-forget):
 *   void this.telegramService.sendMessage("Teks pesan");
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string | undefined;
  private readonly chatId: string | undefined;
  
  private readonly apiUrl: string;
  private readonly sellerAppUrl: string;
  
  private lastUpdateId = 0;
  private isPolling = false;

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.token = this.config.get<string>("TELEGRAM_BOT_TOKEN");
    this.chatId = this.config.get<string>("TELEGRAM_CHAT_ID");
    const port = this.config.get<number>("PORT") || 4000;
    this.apiUrl = this.config.get<string>("BACKEND_URL") || `http://127.0.0.1:${port}`;
    this.sellerAppUrl = this.config.get<string>("FRONTEND_OPERASIONAL_URL") || "http://127.0.0.1:3004";
  }

  onModuleInit() {
    if (this.token && this.chatId) {
      this.logger.log("Memulai Telegram Long Polling di background...");
      this.isPolling = true;
      this.startPolling();
    }
  }

  /**
   * Mengirim pesan teks ke Telegram.
   * Menggunakan Node.js native `https` agar tidak ada dependency tambahan.
   * Gunakan selalu dengan `void` agar bersifat fire-and-forget.
   */
  async sendMessage(text: string, reply_markup?: any): Promise<void> {
    if (!this.token || !this.chatId) {
      this.logger.warn(
        "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diset di .env",
      );
      return;
    }

    const body = JSON.stringify({
      chat_id: this.chatId,
      parse_mode: "Markdown",
      text,
      ...(reply_markup && { reply_markup }),
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.token}/sendMessage`,
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
        // Jangan biarkan error Telegram mengganggu proses utama
        this.logger.warn(`Gagal kirim notif Telegram: ${err.message}`);
        resolve();
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Mengubah pesan yang sudah ada
   */
  async editMessageText(messageId: number, text: string, reply_markup?: any): Promise<void> {
    if (!this.token || !this.chatId) return;

    const body = JSON.stringify({
      chat_id: this.chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      text,
      ...(reply_markup && { reply_markup }),
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.token}/editMessageText`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => { res.on("data", () => {}); res.on("end", resolve); }
      );
      req.on("error", () => resolve());
      req.write(body);
      req.end();
    });
  }

  /**
   * Memberikan feedback popup ke user saat tombol diklik
   */
  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    if (!this.token) return;
    const body = JSON.stringify({ callback_query_id: callbackQueryId, text });
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.token}/answerCallbackQuery`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => { res.on("data", () => {}); res.on("end", resolve); }
      );
      req.on("error", () => resolve());
      req.write(body);
      req.end();
    });
  }

  /**
   * Sistem Polling sangat ringan. Menggunakan HTTP Long Polling (timeout=30s).
   * Hanya meminta memori/CPU saat ada event dari Telegram.
   */
  private startPolling() {
    if (!this.isPolling) return;
    
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${this.token}/getUpdates?offset=${this.lastUpdateId}&timeout=30`,
        method: "GET",
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(raw);
            if (data.ok && data.result.length > 0) {
              this.processUpdates(data.result);
            }
          } catch (e) {
            // Abaikan error parse
          }
          // Loop polling kembali
          setTimeout(() => this.startPolling(), 1000);
        });
      }
    );

    req.on("error", () => {
      // Jika internet putus, coba lagi 5 detik kemudian
      setTimeout(() => this.startPolling(), 5000);
    });

    req.end();
  }

  private async processUpdates(updates: any[]) {
    for (const update of updates) {
      this.lastUpdateId = update.update_id + 1;

      // Handle klik tombol (Callback Query)
      if (update.callback_query) {
        const query = update.callback_query;
        const data = query.data;

        // Validasi Keamanan (mirip CORS): Pastikan klik berasal dari chat/grup yang sah!
        // Mencegah orang luar yang tidak berhak mencoba memanipulasi order
        const sourceChatId = query.message?.chat?.id?.toString();
        if (sourceChatId && sourceChatId !== this.chatId) {
          await this.answerCallbackQuery(query.id, "⛔ Akses Ditolak! Anda tidak berhak memproses pesanan ini.");
          continue;
        }

        if (data.startsWith("tandai_dibaca:")) {
          const orderId = data.split(":")[1];
          try {
            await this.answerCallbackQuery(query.id, "✅ Pesanan ditandai sudah dibaca!");
            
            let newText = query.message.text;
            if (newText.includes("Silakan cek detail pesanan di web!")) {
              newText = newText.replace("Silakan cek detail pesanan di web!", "✅ STATUS: SUDAH DIBACA");
            } else if (newText.includes("Silakan cetak resi dan serahkan ke kurir!")) {
              newText = newText.replace("Silakan cetak resi dan serahkan ke kurir!", "✅ STATUS: SUDAH DIBACA");
            } else {
              newText = newText + "\n\n✅ STATUS: SUDAH DIBACA";
            }
            
            const newReplyMarkup = {
              inline_keyboard: [
                [
                  {
                    text: "🌐 Lihat Detail di Web",
                    url: `${this.sellerAppUrl}/seller/pesanan/${orderId}`,
                  }
                ]
              ]
            };

            await this.editMessageText(query.message.message_id, newText, newReplyMarkup);
          } catch (err: any) {
            await this.answerCallbackQuery(query.id, "❌ Error: " + (err.message || "Unknown error"));
          }
        }
      }
    }
  }

  /** Shortcut: Notifikasi pesanan baru */
  sendNewOrderNotif(params: {
    orderId: string;
    namaToko: string;
    namaPembeli: string;
    totalHarga: number;
    jumlahItem: number;
    metodeBayar: string;
  }): void {
    const { orderId, namaToko, namaPembeli, totalHarga, jumlahItem, metodeBayar } = params;
    const shortId = orderId.slice(0, 8).toUpperCase();
    const nominal = new Intl.NumberFormat("id-ID").format(totalHarga);
    
    // Mencegah format Markdown (garis bawah) rusak
    const safeMetodeBayar = (metodeBayar || "").replace(/_/g, " ");

    void this.sendMessage(
      `🛒 *PESANAN BARU MASUK!*\n` +
        `\n` +
        `📦 *Toko:* ${namaToko}\n` +
        `🆔 *ID Pesanan:* \`#${shortId}\`\n` +
        `👤 *Pembeli:* ${namaPembeli}\n` +
        `🛍 *Produk:* ${jumlahItem} item\n` +
        `💰 *Total:* Rp ${nominal}\n` +
        `💳 *Bayar via:* ${safeMetodeBayar}\n` +
        `\n` +
        `⏳ Silakan cek detail pesanan di web!`,
      {
        inline_keyboard: [
          [
            {
              text: "✅ Tandai sudah dibaca",
              callback_data: `tandai_dibaca:${orderId}`,
            },
          ],
          [
            {
              text: "🌐 Lihat Detail di Web",
              url: `${this.sellerAppUrl}/seller/pesanan/${orderId}`,
            },
          ],
        ],
      },
    );
  }
}
