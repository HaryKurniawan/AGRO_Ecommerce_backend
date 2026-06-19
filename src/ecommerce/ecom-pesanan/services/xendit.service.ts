import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Xendit from "xendit-node";
import axios from "axios";

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
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("XENDIT_SECRET_KEY");
    if (!secretKey) {
      throw new Error("XENDIT_SECRET_KEY environment variable is not set");
    }
    this.secretKey = secretKey;
    this.xendit = new Xendit({ secretKey });
  }

  private get axiosConfig() {
    return {
      headers: {
        Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    };
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
    } catch (error: any) {
      this.logger.error(
        `Failed to create Xendit invoice: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createVirtualAccount(payload: {
    externalId: string;
    bankCode: string;
    name: string;
    expectedAmount: number;
    expirationDate?: Date;
  }) {
    try {
      this.logger.log(
        `Creating Xendit VA for externalId: ${payload.externalId}, bank: ${payload.bankCode}, amount: ${payload.expectedAmount}`,
      );

      const response = await axios.post(
        "https://api.xendit.co/callback_virtual_accounts",
        {
          external_id: payload.externalId,
          bank_code: payload.bankCode,
          name: payload.name.substring(0, 255), // Max 255 chars
          expected_amount: payload.expectedAmount,
          is_closed: true,
          is_single_use: true,
          expiration_date: payload.expirationDate ? payload.expirationDate.toISOString() : undefined,
        },
        this.axiosConfig
      );

      const va = response.data;

      this.logger.log(
        `VA created: ${va.id} | Account Number: ${va.account_number}`,
      );

      return {
        vaId: va.id,
        accountNumber: va.account_number,
        externalId: va.external_id,
        bankCode: va.bank_code,
        amount: va.expected_amount,
        status: va.status,
        expirationDate: va.expiration_date,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Xendit VA: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createQrCode(payload: {
    externalId: string;
    amount: number;
  }) {
    try {
      this.logger.log(`Creating Xendit QRIS for externalId: ${payload.externalId}`);
      
      const response = await axios.post(
        "https://api.xendit.co/qr_codes",
        {
          external_id: payload.externalId,
          type: "DYNAMIC",
          currency: "IDR",
          amount: payload.amount,
        },
        {
          headers: {
            ...this.axiosConfig.headers,
            "api-version": "2022-07-31", // Set api-version if needed
          }
        }
      );

      const qr = response.data;
      return {
        qrId: qr.id,
        qrString: qr.qr_string,
        externalId: qr.external_id,
        amount: qr.amount,
        status: qr.status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create Xendit QRIS: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createEWalletCharge(payload: {
    externalId: string;
    amount: number;
    channelCode: string;
    mobileNumber?: string;
  }) {
    try {
      this.logger.log(`Creating Xendit E-Wallet for externalId: ${payload.externalId}, channel: ${payload.channelCode}`);
      
      const response = await axios.post(
        "https://api.xendit.co/ewallets/charges",
        {
          reference_id: payload.externalId,
          currency: "IDR",
          amount: payload.amount,
          checkout_method: "ONE_TIME_PAYMENT",
          channel_code: payload.channelCode,
          channel_properties: {
            mobile_number: payload.mobileNumber,
            success_redirect_url: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=success`,
            failure_redirect_url: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=failed`,
          },
        },
        this.axiosConfig
      );

      const charge = response.data;
      return {
        chargeId: charge.id,
        referenceId: charge.reference_id,
        channelCode: charge.channel_code,
        status: charge.status,
        checkoutUrl: charge.actions?.desktop_web_checkout_url || charge.actions?.mobile_web_checkout_url || charge.actions?.mobile_deeplink_checkout_url || "",
      };
    } catch (error: any) {
      this.logger.error(`Failed to create Xendit E-Wallet: ${error.message}`, error.stack);
      throw error;
    }
  }
}
