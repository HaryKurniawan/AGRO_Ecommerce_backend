import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../infrastructure/database/prisma.service";
  
@Injectable()
export class CancelExpiredOrdersScheduler {
  private readonly logger = new Logger(CancelExpiredOrdersScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug("Checking for expired MENUNGGU_BAYAR orders...");
    
    // expiry is 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const result = await this.prisma.pesananEcom.updateMany({
        where: {
          status: "MENUNGGU_BAYAR",
          createdAt: {
            lt: oneHourAgo,
          },
        },
        data: {
          status: "DIBATALKAN",
          catatan: "Dibatalkan otomatis karena batas waktu pembayaran habis",
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cancelled ${result.count} expired orders.`);
      }
    } catch (error) {
      this.logger.error("Failed to cancel expired orders", error);
    }
  }
}
