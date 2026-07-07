import { Module, Global } from "@nestjs/common";
import { EmailService } from "./services/email.service";
import { ActivityLogService } from "./services/activity-log.service";
import { PrismaService } from "../infrastructure/database/prisma.service";

@Global()
@Module({
  imports: [],
  providers: [EmailService, ActivityLogService, PrismaService],
  exports: [EmailService, ActivityLogService, PrismaService],
})
export class CommonModule {}
