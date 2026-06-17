import { Injectable, NotFoundException } from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";

@Injectable()
export class FindUserByIdUseCase {
  constructor(private readonly usersRepo: PenggunasRepository) {}

  async execute(id: string) {
    const pengguna = await this.usersRepo.findUnique({
      where: { id },
      include: {
        profilPenjual: true,
      },
    });

    if (!pengguna) {
      throw new NotFoundException(`Pengguna with ID "${id}" not found`);
    }

    return pengguna;
  }
}
