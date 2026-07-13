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
      printQRInTerminal: false, // Matikan QR karena kita pakai Pairing Code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: pino({ level: 'silent' }) as any, 
    });

    // Jalankan Request Pairing Code jika belum login
    if (!this.sock.authState.creds.me?.id) {
      setTimeout(async () => {
        try {
          const code = await this.sock.requestPairingCode("6288226126465");
          this.logger.log(`\n======================================================`);
          this.logger.log(`KODE PAIRING WHATSAPP: ${code}`);
          this.logger.log(`(Buka WhatsApp -> Perangkat Tertaut -> Tautkan dengan Nomor Telepon)`);
          this.logger.log(`======================================================\n`);
        } catch (error) {
          this.logger.error("Gagal mendapatkan kode pairing:", error);
        }
      }, 3000);
    }

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log('Menunggu Anda memasukkan kode pairing di aplikasi WhatsApp...');
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
      if (!this.sock) {
        this.logger.error(`Gagal mengirim pesan: WhatsApp Socket belum diinisialisasi`);
        return false;
      }
      
      const userState = this.sock?.user || this.sock?.authState?.creds?.me;
      if (!userState) {
        this.logger.error(`Gagal mengirim pesan: WhatsApp belum login (Data sesi kosong)`);
        return false;
      }

      const jid = this.formatPhoneNumber(phone);
      this.logger.log(`Mencoba mengirim pesan ke ${jid}...`);
      
      await this.sock.sendMessage(jid, { text: message });
      this.logger.log(`✅ Pesan berhasil dikirim ke ${jid}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Gagal mengirim pesan ke ${phone}:`, error);
      return false;
    }
  }
}
