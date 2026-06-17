import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Xendit from "xendit-node";

export interface XenditInvoicePayload {
  externalId: string;
  amount: number;
  payerEmail?: string;
  description?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  currency?: string;
  customerName?: string;
}

export interface XenditInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
  externalId: string;
  amount: number;
  status: string;
  expiryDate?: string | Date;
}

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);
  private readonly xendit: Xendit;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("XENDIT_SECRET_KEY");
    if (!secretKey) {
      throw new Error("XENDIT_SECRET_KEY environment variable is not set");
    }
    this.xendit = new Xendit({ secretKey });
  }

  async createInvoice(
    payload: XenditInvoicePayload,
  ): Promise<XenditInvoiceResult> {
    try {
      this.logger.log(
        `Creating Xendit invoice for externalId: ${payload.externalId}, amount: ${payload.amount}`,
      );

      const { Invoice } = this.xendit;
      const invoice = await Invoice.createInvoice({
        data: {
          externalId: payload.externalId,
          amount: payload.amount,
          payerEmail: payload.payerEmail,
          description:
            payload.description ||
            `Pembayaran pesanan #${payload.externalId}`,
          successRedirectUrl:
            payload.successRedirectUrl ||
            `${this.configService.get("FRONTEND_URL")}/pesanan?payment=success`,
          failureRedirectUrl:
            payload.failureRedirectUrl ||
            `${this.configService.get("FRONTEND_URL")}/pesanan?payment=failed`,
          currency: payload.currency || "IDR",
          customer: payload.customerName
            ? {
                givenNames: payload.customerName,
              }
            : undefined,
        },
      });

      this.logger.log(
        `Invoice created: ${invoice.id} | URL: ${invoice.invoiceUrl}`,
      );

      return {
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
        externalId: invoice.externalId,
        amount: invoice.amount,
        status: invoice.status,
        expiryDate: invoice.expiryDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Xendit invoice: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
