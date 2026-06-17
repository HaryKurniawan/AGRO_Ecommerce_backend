import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class UpdateProfileStatusUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string, peran: string, status: any) {
    const pengguna: any = await this.usersRepo.findUnique({
      where: { id },
      include: {
        profilPenjual: true,
      },
    });

    if (!pengguna) throw new NotFoundException("Pengguna not found");

    if (peran === "PENJUAL" && pengguna.profilPenjual) {
      return this.prisma.profilPenjual.update({
        where: { penggunaId: id },
        data: {
          status,
          terverifikasiPada: status === "APPROVED" ? new Date() : undefined,
        },
      });
    }

    throw new BadRequestException("Peran or profile mismatch");
  }
}
