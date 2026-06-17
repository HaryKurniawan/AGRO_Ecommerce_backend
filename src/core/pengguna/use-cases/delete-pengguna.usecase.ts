import { Injectable } from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { FindUserByIdUseCase } from "./find-pengguna-by-id.usecase";

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly findUserByIdUC: FindUserByIdUseCase,
  ) {}

  async execute(id: string) {
    await this.findUserByIdUC.execute(id);
    return this.usersRepo.delete({ where: { id } });
  }
}
