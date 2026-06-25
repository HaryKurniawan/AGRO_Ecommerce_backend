import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface XenditInvoicePayload {
  externalId: string;
  amount: number;
  payerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  items?: {
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }[];
}

export interface XenditInvoiceResult {
  id: string;
  externalId: string;
  invoiceUrl: string;
  status: string;
  expiryDate: string;
}

export interface XenditQRISPayload {
  referenceId: string;
  amount: number;
  currency?: string;
}

export interface XenditQRISResult {
  id: string;
  referenceId: string;
  qrString: string; // String QRIS resmi dari Xendit — di-render jadi QR code di frontend
  status: string;
  type: string;
  currency: string;
  amount: number;
  expiresAt?: string;
}

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);
  private readonly secretKey: string;
  private readonly invoiceApiUrl = "https://api.xendit.co/v2/invoices";
  private readonly qrApiUrl = "https://api.xendit.co/qr_codes";

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("XENDIT_SECRET_KEY");
    if (!secretKey) {
      throw new Error("XENDIT_SECRET_KEY environment variable is not set");
    }
    this.secretKey = secretKey;
  }

  private get axiosConfig() {
    return {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    };
  }

  /**
   * Membuat Xendit Invoice — mendukung semua metode bayar (VA Bank, DANA, OVO, GoPay, ShopeePay)
   * kecuali QRIS yang menggunakan createQRIS() agar QR string-nya bisa di-render langsung di app.
   */
  async createInvoice(
    payload: XenditInvoicePayload,
  ): Promise<XenditInvoiceResult> {
    try {
      this.logger.log(
        `Creating Xendit invoice for externalId: ${payload.externalId}, amount: ${payload.amount}`,
      );

      const response = await axios.post(
        this.invoiceApiUrl,
        {
          external_id: payload.externalId,
          amount: payload.amount,
          payer_email: payload.payerEmail,
          description:
            payload.description ||
            `Pembayaran Pesanan Agro Jabar #${payload.externalId}`,
          customer: {
            given_names: payload.customerName || "Pelanggan",
            email: payload.payerEmail,
            mobile_number: payload.customerPhone,
          },
          items: payload.items || [],
          invoice_duration: 86400, // 24 jam dalam detik
          success_redirect_url: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=success`,
          failure_redirect_url: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=failed`,
          payment_methods: [
            "BCA",
            "BNI",
            "BRI",
            "MANDIRI",
            "PERMATA",
            "DANA",
            "OVO",
            "GOPAY",
            "LINKAJA",
            "SHOPEEPAY",
          ],
        },
        this.axiosConfig,
      );

      const data = response.data;

      this.logger.log(
        `Xendit invoice created: ID ${data.id} | URL: ${data.invoice_url}`,
      );

      return {
        id: data.id,
        externalId: data.external_id,
        invoiceUrl: data.invoice_url,
        status: data.status,
        expiryDate: data.expiry_date,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Xendit invoice: ${error.response?.data?.message || error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Membuat QRIS dari Xendit menggunakan QR Code API.
   * Mengembalikan `qr_string` resmi Xendit yang siap di-render sebagai QR code di frontend.
   * QR string ini bertipe QRIS (EMVCo), dapat di-scan dari semua e-wallet apapun.
   */
  async createQRIS(payload: XenditQRISPayload): Promise<XenditQRISResult> {
    try {
      this.logger.log(
        `Creating Xendit QRIS for referenceId: ${payload.referenceId}, amount: ${payload.amount}`,
      );

      // Waktu kadaluarsa: 24 jam dari sekarang
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await axios.post(
        this.qrApiUrl,
        {
          reference_id: payload.referenceId,
          type: "DYNAMIC", // DYNAMIC QR mendukung amount spesifik
          currency: payload.currency || "IDR",
          amount: payload.amount,
          expires_at: expiresAt,
          metadata: {
            source: "agro-jabar-ecommerce",
          },
        },
        this.axiosConfig,
      );

      const data = response.data;

      this.logger.log(
        `Xendit QRIS created: ID ${data.id} | referenceId: ${data.reference_id}`,
      );

      return {
        id: data.id,
        referenceId: data.reference_id,
        qrString: data.qr_string, // String QRIS resmi — di-render jadi QR code di frontend
        status: data.status,
        type: data.type,
        currency: data.currency,
        amount: data.amount,
        expiresAt: data.expires_at,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Xendit QRIS: ${error.response?.data?.message || error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
