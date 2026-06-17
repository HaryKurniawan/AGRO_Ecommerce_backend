import { Injectable } from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { FindUserByIdUseCase } from "./find-pengguna-by-id.usecase";

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly findUserByIdUC: FindUserByIdUseCase,
  ) {}

  async execute(id: string, dto: any) {
    await this.findUserByIdUC.execute(id);
    return this.usersRepo.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        nama: true,
        peran: true,
      },
    });
  }
}
