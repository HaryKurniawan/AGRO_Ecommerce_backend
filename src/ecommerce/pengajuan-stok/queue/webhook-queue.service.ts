import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);

  constructor(
    @InjectQueue("webhook") private readonly webhookQueue: Queue,
  ) {}

  async add(name: string, data: any, options?: any) {
    try {
      await this.webhookQueue.add("sendWebhook", data, options);
      this.logger.log(`Job sendWebhook added to queue`);
    } catch (err) {
      this.logger.error("Failed to add webhook to queue", err);
    }
  }
}
