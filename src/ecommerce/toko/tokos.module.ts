import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { StoresController } from "./tokos.controller";
import { HargaTokoSellerController } from "./controllers/harga-toko-seller.controller";
import { HargaTokoAdminController } from "./controllers/harga-toko-admin.controller";
import { TokosRepository } from "./repositories/tokos.repository";
import { CreateStoreUseCase } from "./use-cases/create-toko.usecase";
import { UpdateStoreUseCase } from "./use-cases/update-toko.usecase";
import { FindAllStoresUseCase } from "./use-cases/find-all-tokos.usecase";
import { FindStoreByIdUseCase } from "./use-cases/find-toko-by-id.usecase";
import { FindStoreBySlugUseCase } from "./use-cases/find-toko-by-slug.usecase";
import { FindMyStoreUseCase } from "./use-cases/find-my-toko.usecase";
import { AdminUpdateStoreStatusUseCase } from "./use-cases/admin-update-toko-status.usecase";
import { GetNearestStoreUseCase } from "./use-cases/get-nearest-toko.usecase";
import { EcomProductsModule } from "../ecom-produk/ecom-produks.module";
import { GetTokoStockHistoryUseCase } from "./use-cases/get-toko-stock-history.usecase";
import { GetTokoMarginConfigUseCase } from "./use-cases/get-toko-margin-config.usecase";
import { UpdateTokoMarginConfigUseCase } from "./use-cases/update-toko-margin-config.usecase";
import { OverrideProdukHargaUseCase } from "./use-cases/override-produk-harga.usecase";
import { GetTokoPricingSummaryUseCase } from "./use-cases/get-toko-pricing-summary.usecase";
import { GetMarginHistoryUseCase } from "./use-cases/get-margin-history.usecase";
import { GetAdminStoresMarginUseCase } from "./use-cases/get-admin-stores-margin.usecase";
@Module({
  imports: [ConfigModule, EcomProductsModule],
  controllers: [
    StoresController,
    HargaTokoSellerController,
    HargaTokoAdminController,
  ],
  providers: [
    TokosRepository,
    CreateStoreUseCase,
    UpdateStoreUseCase,
    FindAllStoresUseCase,
    FindStoreByIdUseCase,
    FindStoreBySlugUseCase,
    FindMyStoreUseCase,
    AdminUpdateStoreStatusUseCase,
    GetNearestStoreUseCase,
    GetTokoStockHistoryUseCase,
    GetTokoMarginConfigUseCase,
    UpdateTokoMarginConfigUseCase,
    OverrideProdukHargaUseCase,
    GetTokoPricingSummaryUseCase,
    GetMarginHistoryUseCase,
    GetAdminStoresMarginUseCase,
  ],
  exports: [TokosRepository, FindStoreByIdUseCase, FindMyStoreUseCase],
})
export class StoresModule {}
