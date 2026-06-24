import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface MidtransTransactionPayload {
  externalId: string;
  amount: number;
  payerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  itemDetails?: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
}

export interface MidtransTransactionResult {
  token: string;
  redirectUrl: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly serverKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const serverKey = this.configService.get<string>("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      throw new Error("MIDTRANS_SERVER_KEY environment variable is not set");
    }
    this.serverKey = serverKey;
    
    // Gunakan URL Production jika NODE_ENV=production dan bukan key sandbox
    const isProd = this.configService.get("NODE_ENV") === "production";
    const isSandboxKey = serverKey.includes("SB-");
    
    this.apiUrl = isProd && !isSandboxKey
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  }

  private get axiosConfig() {
    return {
      headers: {
        Authorization: `Basic ${Buffer.from(this.serverKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    };
  }

  async createTransaction(
    payload: MidtransTransactionPayload,
  ): Promise<MidtransTransactionResult> {
    try {
      this.logger.log(
        `Creating Midtrans Snap transaction for externalId: ${payload.externalId}, amount: ${payload.amount}`,
      );

      const splitName = payload.customerName?.split(" ") || ["Pelanggan"];
      const firstName = splitName[0];
      const lastName = splitName.slice(1).join(" ") || undefined;

      const response = await axios.post(
        this.apiUrl,
        {
          transaction_details: {
            order_id: payload.externalId,
            gross_amount: payload.amount,
          },
          credit_card: {
            secure: true
          },
          customer_details: {
            first_name: firstName,
            last_name: lastName,
            email: payload.payerEmail,
            phone: payload.customerPhone,
          },
          item_details: payload.itemDetails,
          callbacks: {
            finish: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=success`,
            error: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=failed`,
            unfinish: `${this.configService.get("FRONTEND_URL")}/pesanan?payment=pending`,
          }
        },
        this.axiosConfig
      );

      const data = response.data;

      this.logger.log(
        `Midtrans transaction created: Token ${data.token} | URL: ${data.redirect_url}`,
      );

      return {
        token: data.token,
        redirectUrl: data.redirect_url,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Midtrans transaction: ${error.response?.data?.error_messages?.join(", ") || error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
