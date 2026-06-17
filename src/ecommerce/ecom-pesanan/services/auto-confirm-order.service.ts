import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class AutoConfirmOrderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoConfirmOrderService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log(
      "AutoConfirmOrderService initialized. Starting 3-hour auto-confirm checker...",
    );

    // Run the check immediately on startup
    this.checkAndConfirmOrders();

    // Set interval to run the check every 5 minutes (300,000 ms)
    this.intervalId = setInterval(
      () => {
        this.checkAndConfirmOrders();
      },
      5 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log("AutoConfirmOrderService stopped checker.");
    }
  }

  async checkAndConfirmOrders() {
    try {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      // Find all orders that have arrived (status: ARRIVED) more than 3 hours ago
      // and whose order status is not yet SELESAI.
      const ordersToConfirm = await this.prisma.pesananEcom.findMany({
        where: {
          status: { not: "SELESAI" },
          pengiriman: {
            status: "ARRIVED",
            updatedAt: { lte: threeHoursAgo },
          },
        },
        select: {
          id: true,
          status: true,
          pengiriman: {
            select: {
              updatedAt: true,
            },
          },
        },
      });

      if (ordersToConfirm.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${ordersToConfirm.length} order(s) eligible for auto-confirmation (ARRIVED > 3 hours).`,
      );

      for (const order of ordersToConfirm) {
        await this.prisma.pesananEcom.update({
          where: { id: order.id },
          data: { status: "SELESAI" },
        });

        this.logger.log(
          `Auto-confirmed order ${order.id} (Arrived at: ${order.pengiriman?.updatedAt.toISOString()})`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to run auto-confirm check:", error);
    }
  }
}
