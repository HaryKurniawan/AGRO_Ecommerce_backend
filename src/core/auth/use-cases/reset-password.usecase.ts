import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { hashPassword } from "../../../common/utils/hash.util";


@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(token: string, newPassword: string) {
    const pengguna = await this.prisma.pengguna.findFirst({
      where: {
        tokenResetKataSandi: token,
        kadaluarsaTokenReset: {
          gt: new Date(),
        },
      },
    });

    if (!pengguna) {
      throw new BadRequestException("Token reset tidak valid atau sudah kadaluarsa. Silakan minta ulang.");
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



    return { message: "Password berhasil direset. Silakan login." };
  }
}
