import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SellerDashboardStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string) {
    const whereCondition = {
      item: { some: { produk: { tokoId } } },
      isGrosir: false,
    };

    // 1. Get status counts
    const ordersForStatus = await this.prisma.pesananEcom.findMany({
      where: whereCondition,
      select: { status: true },
    });

    const statusMap = ordersForStatus.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 2. Get total revenue (only SELESAI and DIKIRIM)
    const revenueAggr = await this.prisma.pesananEcom.aggregate({
      where: {
        ...whereCondition,
        status: { in: ["SELESAI", "DIKIRIM"] },
      },
      _sum: {
        totalHarga: true,
      },
    });

    // 3. 7-day orders trend (for the chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await this.prisma.pesananEcom.findMany({
      where: {
        ...whereCondition,
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true, totalHarga: true, status: true }
    });
    
    // We also need recently created orders (any status) to show in the "Recent Orders" table
    const latestOrders = await this.prisma.pesananEcom.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        konsumen: { select: { nama: true, email: true } },
        item: true
      }
    });

    return {
      statusCounts: statusMap,
      revenue: Number(revenueAggr._sum.totalHarga || 0),
      recentOrders, // For charts
      latestOrders, // For the recent orders table
      totalOrders: Object.values(statusMap).reduce((a: number, b: number) => a + b, 0),
    };
  }
}
