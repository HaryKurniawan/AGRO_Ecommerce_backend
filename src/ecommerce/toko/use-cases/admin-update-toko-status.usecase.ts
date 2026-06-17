import { Injectable, NotFoundException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class AdminUpdateStoreStatusUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    const toko = await this.storesRepo.findUnique({ where: { id } });
    if (!toko) throw new NotFoundException("Toko not found");

    return this.storesRepo.update({ where: { id }, data: { status } });
  }
}
