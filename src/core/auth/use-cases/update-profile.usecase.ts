import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    penggunaId: string,
    data: { nama?: string; noTelepon?: string },
  ) {
    return this.prisma.pengguna.update({
      where: { id: penggunaId },
      data: {
        ...(data.nama && { nama: data.nama }),
        ...(data.noTelepon !== undefined && {
          noTelepon: data.noTelepon,
        }),
      },
    });
  }
}
