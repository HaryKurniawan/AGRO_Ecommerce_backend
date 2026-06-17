import { Module } from "@nestjs/common";

import { CartController } from "./keranjang.controller";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./use-cases/get-keranjang.usecase";
import { AddCartItemUseCase } from "./use-cases/add-keranjang-item.usecase";
import { UpdateCartItemUseCase } from "./use-cases/update-keranjang-item.usecase";
import { RemoveCartItemUseCase } from "./use-cases/remove-keranjang-item.usecase";
import { ClearCartUseCase } from "./use-cases/clear-keranjang.usecase";
import { SyncCartUseCase } from "./use-cases/sync-keranjang.usecase";

@Module({
  controllers: [CartController],
  providers: [
    PrismaService,
    GetCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
    SyncCartUseCase,
  ],
  exports: [ClearCartUseCase],
})
export class CartModule {}

