import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);

  async add(name: string, data: any, options?: any) {
    this.logger.debug(`Adding webhook job ${name} to in-memory queue`);
    // Execute asynchronously and retry if fails
    this.executeWithRetry(
      data,
      options?.attempts || 5,
      options?.backoff?.delay || 2000,
    );
  }

  private async executeWithRetry(
    data: any,
    attemptsLeft: number,
    delayMs: number,
  ) {
    const { url, payload, headers } = data;
    try {
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
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      this.logger.log(`Webhook successfully sent to ${url}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process webhook (attempts left: ${attemptsLeft - 1}): ${error.message}`,
      );
      if (attemptsLeft > 1) {
        setTimeout(() => {
          this.executeWithRetry(data, attemptsLeft - 1, delayMs * 2);
        }, delayMs);
      } else {
        this.logger.error(
          `Webhook permanently failed after all attempts: ${url}`,
        );
      }
    }
  }
}
