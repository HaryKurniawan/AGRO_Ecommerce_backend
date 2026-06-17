import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";
import { UpdateStoreDto } from "../dto/update-toko.dto";

@Injectable()
export class UpdateStoreUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(id: string, penggunaId: string, dto: UpdateStoreDto) {
    const toko = (await this.storesRepo.findUnique({
      where: { id },
      include: { penjual: true },
    })) as any;

    if (!toko) throw new NotFoundException("Toko not found");
    if (
      toko.penjual.penggunaId !== penggunaId &&
      toko.adminGudangId !== penggunaId
    ) {
      throw new ForbiddenException("Not authorized to edit this toko");
    }

    return this.storesRepo.update({ where: { id }, data: dto });
  }
}
