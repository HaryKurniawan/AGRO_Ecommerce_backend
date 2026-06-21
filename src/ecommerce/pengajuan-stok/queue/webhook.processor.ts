import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("webhook")
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job) {
    if (job.name === "sendWebhook") {
      await this.handleSendWebhook(job);
    }
  }

  private async handleSendWebhook(job: Job) {
    this.logger.debug(`Processing webhook job ${job.id}`);
    const { url, payload, headers } = job.data;

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
