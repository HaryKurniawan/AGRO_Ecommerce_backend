import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class UpdateProductStatusUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
    private readonly redisService: RedisService,
  ) {}

  async execute(
    id: string,
    status: "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK",
  ) {
    await this.findProductByIdUC.execute(id);
    const result = await this.productsRepo.update({
      where: { id },
      data: { status },
      include: {
        kategori: { select: { id: true, nama: true } },
        toko: { select: { id: true, nama: true } },
      },
    });

    await this.redisService.getClient().del(`products:detail:${id}`);
    await this.redisService.invalidateByPrefix("products:list");

    return result;
  }
}
