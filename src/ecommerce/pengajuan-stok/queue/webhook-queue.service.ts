import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);

  async add(name: string, data: any, options?: any) {
    this.sendWebhook(data).catch((err) => {
      this.logger.error(`Failed to execute webhook asynchronously:`, err);
    });
  }

  private async sendWebhook(data: any) {
    this.logger.debug(`Processing webhook...`);
    const { url, payload, headers } = data;

    const response = await fetch(url, {
      method: "POST",
      headers: headers || {
        "Content-Type": "application/json",
        "x-api-key":
          process.env.ECOMMERCE_API_KEY ||
          "ecommerce-nestjs-to-gudang-express-secure-key",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Webhook failed: HTTP ${response.status} - ${errorText}`);
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }

    this.logger.log(`Webhook successfully sent to ${url}`);
  }
}
