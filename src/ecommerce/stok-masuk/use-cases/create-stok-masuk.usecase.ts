import { Injectable, BadRequestException } from "@nestjs/common";

import { StokMasukRepository } from "../stok-masuk.repository";
import { CreateStokMasukDto } from "../dto/create-stok-masuk.dto";

@Injectable()
export class CreateStokMasukUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(data: CreateStokMasukDto) {
    if (data.jumlahMasuk <= 0) {
      throw new BadRequestException("Jumlah masuk harus lebih dari 0");
    }

    if (data.hargaBeli <= 0) {
      throw new BadRequestException("Harga beli harus lebih dari 0");
    }

    return this.stokMasukRepository.create(data);
  }
}
