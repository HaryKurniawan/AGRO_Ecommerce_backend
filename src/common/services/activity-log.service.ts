import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log({
    penggunaId,
    kategori,
    aksi,
    deskripsi,
    ipAddress,
    userAgent,
    metadata,
  }: {
    penggunaId?: string | null;
    kategori: string;
    aksi: string;
    deskripsi: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: any;
  }) {
    try {
      const log = await this.prisma.logAktivitas.create({
        data: {
          penggunaId: penggunaId || null,
          kategori,
          aksi,
          deskripsi,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: metadata || undefined,
        },
      });
      return log;
    } catch (err) {
      this.logger.error(
        `Failed to create activity log: ${err.message}`,
        err.stack,
      );
    }
  }
}
