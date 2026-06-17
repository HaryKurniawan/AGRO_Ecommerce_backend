import { Injectable } from "@nestjs/common";
import { Peran } from "@prisma/client";
import { PenggunasRepository } from "../repositories/pengguna.repository";

@Injectable()
export class GetAllCouriersUseCase {
  constructor(private readonly usersRepo: PenggunasRepository) {}

  async execute() {
    const couriers = await this.usersRepo.findMany({
      where: {
        peran: Peran.KURIR,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        noTelepon: true,
      },
    });

    return {
      statusCode: 200,
      data: couriers,
    };
  }
}
