import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { hashPassword } from "../../../common/utils/hash.util";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(token: string, newPassword: string) {
    const penggunaId = await this.redisService.getClient().get(`password:reset:${token}`);

    if (!penggunaId) {
      throw new BadRequestException(
        "Token reset tidak valid atau sudah kadaluarsa. Silakan minta ulang.",
      );
    }

    const pengguna = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
    });

    if (!pengguna) {
      throw new BadRequestException("Pengguna tidak ditemukan.");
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        kataSandi: hashedPassword,
        // Set null for legacy fields just in case
        tokenResetKataSandi: null,
        kadaluarsaTokenReset: null,
      },
    });

    // Delete token dari Redis
    await this.redisService.getClient().del(`password:reset:${token}`);

    return { message: "Password berhasil direset. Silakan login." };
  }
}
