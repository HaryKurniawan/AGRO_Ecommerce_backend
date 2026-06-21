import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { EmailService } from "./services/email.service";
import { EmailProcessor } from "./services/email.processor";
import { ActivityLogService } from "./services/activity-log.service";
import { PrismaService } from "../infrastructure/database/prisma.service";

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: "email",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }),
  ],
  providers: [EmailService, EmailProcessor, ActivityLogService, PrismaService],
  exports: [EmailService, ActivityLogService, PrismaService, BullModule],
})
export class CommonModule {}
