import { Module } from "@nestjs/common";
import {
  PengajuanStokController,
  PengajuanStokWebhookController,
} from "./pengajuan-stok.controller";
import { PengajuanStokRepository } from "./repositories/pengajuan-stok.repository";
import { CreatePengajuanStokUseCase } from "./use-cases/create-pengajuan-stok.usecase";
import { UpdatePengajuanStokStatusUseCase } from "./use-cases/update-pengajuan-stok-status.usecase";
import { FindProdukForPengajuanUseCase } from "./use-cases/find-produk-for-pengajuan.usecase";
import { FindMyPengajuanStokUseCase } from "./use-cases/find-my-pengajuan-stok.usecase";
import { FindPengajuanStokByIdUseCase } from "./use-cases/find-pengajuan-stok-by-id.usecase";
import { FindAllPengajuanStokAdminUseCase } from "./use-cases/find-all-pengajuan-stok-admin.usecase";
import { FindProductHistoryUseCase } from "./use-cases/find-product-history.usecase";
import { TokosRepository } from "../toko/repositories/tokos.repository";
import { ProdukEcomsRepository } from "../ecom-produk/repositories/ecom-produks.repository";
import { StokMasukModule } from "../stok-masuk/stok-masuk.module";
import { WebhookQueueService } from "./queue/webhook-queue.service";

@Module({
  imports: [StokMasukModule],
  controllers: [PengajuanStokController, PengajuanStokWebhookController],
  providers: [
    PengajuanStokRepository,
    TokosRepository,
    ProdukEcomsRepository,
    CreatePengajuanStokUseCase,
    UpdatePengajuanStokStatusUseCase,
    FindProdukForPengajuanUseCase,
    FindMyPengajuanStokUseCase,
    FindPengajuanStokByIdUseCase,
    FindAllPengajuanStokAdminUseCase,
    FindProductHistoryUseCase,
    WebhookQueueService,
  ],
  exports: [PengajuanStokRepository, WebhookQueueService],
})
export class PengajuanStokModule {}
