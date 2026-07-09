/* eslint-disable import/order */
import * as fs from 'fs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line import/no-named-as-default
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode-terminal';
import pino from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sock: any;

  async onModuleInit() {
    this.logger.log('Inisialisasi WhatsApp Service...');
    await this.connectToWhatsApp();
  }

  private async connectToWhatsApp() {
    const authFolder = 'auth_info_baileys';
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true, // Biarkan Baileys yang print QR di terminal agar lebih stabil
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: pino({ level: 'silent' }) as any, // Suppress Baileys noisy logs, only show important ones
      browser: ['Ubuntu', 'Chrome', '20.0.04'], // Gunakan nama browser standar agar tidak ditolak WA
    });

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log('Scan QR Code ini untuk login WhatsApp:');
        qrcode.generate(qr, { small: true });
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
        this.logger.log(`\n======================================================\nATAU BUKA LINK INI DI BROWSER JIKA QR DI ATAS GAGAL:\n${qrImageUrl}\n======================================================`);
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        
        this.logger.error(
          'Koneksi terputus dari WhatsApp.',
          lastDisconnect?.error
        );
        
        if (shouldReconnect) {
          this.logger.log('Mencoba terhubung kembali...');
          this.connectToWhatsApp();
        } else {
          this.logger.error('Sesi logged out. Hapus folder auth_info_baileys dan scan ulang.');
        }
      } else if (connection === 'open') {
        this.logger.log('✅ Berhasil terhubung ke WhatsApp!');
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
  }

  /**
   * Format nomor telepon ke standar WhatsApp
   * Contoh: 0812345678 -> 62812345678@s.whatsapp.net
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, ''); // Hapus semua karakter non-angka
    
    // Jika diawali dengan 0, ganti dengan 62
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    }
    
    // Pastikan berakhiran @s.whatsapp.net
    if (!formatted.endsWith('@s.whatsapp.net')) {
      formatted = formatted + '@s.whatsapp.net';
    }
    
    return formatted;
  }

  /**
   * Mengirim pesan teks ke nomor WhatsApp
   * @param phone Nomor telepon tujuan (bisa 0812... atau 62812...)
   * @param message Pesan yang ingin dikirim
   */
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      const jid = this.formatPhoneNumber(phone);
      await this.sock.sendMessage(jid, { text: message });
      this.logger.log(`Pesan berhasil dikirim ke ${jid}`);
      return true;
    } catch (error) {
      this.logger.error(`Gagal mengirim pesan ke ${phone}`, error);
      return false;
    }
  }
}
