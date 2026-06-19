import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class DeleteProductUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
    private readonly redisService: RedisService,
  ) {}

  async execute(id: string) {
    await this.findProductByIdUC.execute(id);
    const result = await this.productsRepo.delete({ where: { id } });

    await this.redisService.getClient().del(`products:detail:${id}`);
    await this.redisService.invalidateByPrefix("products:list");

    return result;
  }
}
