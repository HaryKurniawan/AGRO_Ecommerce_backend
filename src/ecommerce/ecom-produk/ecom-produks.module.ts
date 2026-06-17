import { Module } from "@nestjs/common";

import { EcomProductsController } from "./ecom-produks.controller";
import { ProdukEcomsRepository } from "./repositories/ecom-produks.repository";
import { CreateProductUseCase } from "./use-cases/create-produk.usecase";
import { UpdateProductUseCase } from "./use-cases/update-produk.usecase";
import { DeleteProductUseCase } from "./use-cases/delete-produk.usecase";
import { FindAllProductsUseCase } from "./use-cases/find-all-produks.usecase";
import { FindProductByIdUseCase } from "./use-cases/find-produk-by-id.usecase";
import { FindProductsByStoreUseCase } from "./use-cases/find-produks-by-toko.usecase";
import { UpdateProductStatusUseCase } from "./use-cases/update-produk-status.usecase";
import { UpdateStockUseCase } from "./use-cases/update-stock.usecase";
import { GetStockHistoryUseCase } from "./use-cases/get-stock-history.usecase";
import { GenerateStockReportUseCase } from "./use-cases/generate-stock-report.usecase";
import { UpdateProductPhotosUseCase } from "./use-cases/update-product-photos.usecase";

@Module({
  controllers: [EcomProductsController],
  providers: [
    ProdukEcomsRepository,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    FindAllProductsUseCase,
    FindProductByIdUseCase,
    FindProductsByStoreUseCase,
    UpdateProductStatusUseCase,
    UpdateStockUseCase,
    GetStockHistoryUseCase,
    GenerateStockReportUseCase,
    UpdateProductPhotosUseCase,
  ],
  exports: [ProdukEcomsRepository, FindProductByIdUseCase],
})
export class EcomProductsModule {}
