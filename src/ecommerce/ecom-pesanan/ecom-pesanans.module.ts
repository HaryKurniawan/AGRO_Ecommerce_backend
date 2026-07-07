import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FindCourierTasksUseCase } from "./use-cases/find-courier-tasks.usecase";
import { PesananCustomerController } from "./controllers/pesanan-customer.controller";
import { PesananSellerController } from "./controllers/pesanan-seller.controller";
import { PesananAdminController } from "./controllers/pesanan-admin.controller";
import { PesananCourierController } from "./controllers/pesanan-courier.controller";
import { PesananGrosirController } from "./controllers/pesanan-grosir.controller";
import { PaymentWebhookController } from "./controllers/payment-webhook.controller";
import { PesananEcomsRepository } from "./repositories/ecom-pesanans.repository";
import { CreateOrderUseCase } from "./use-cases/create-pesanan.usecase";
import { FindUserOrdersUseCase } from "./use-cases/find-pengguna-pesanans.usecase";
import { FindOrderByIdUseCase } from "./use-cases/find-pesanan-by-id.usecase";
import { UpdateOrderStatusUseCase } from "./use-cases/update-pesanan-status.usecase";
import { AdminFindAllOrdersUseCase } from "./use-cases/admin-find-all-pesanans.usecase";
import { SellerFindOrdersUseCase } from "./use-cases/seller-find-pesanans.usecase";
import { InitShippingUseCase } from "./use-cases/init-shipping.usecase";
import { UpdateShippingStatusUseCase } from "./use-cases/update-shipping-status.usecase";
import { ConfirmPaymentUseCase } from "./use-cases/confirm-payment.usecase";
import { ConfirmReceivedUseCase } from "./use-cases/confirm-received.usecase";
import { CreatePesananGrosirUseCase } from "./use-cases/create-pesanan-grosir.usecase";
import { KonfirmasiPesananGrosirUseCase } from "./use-cases/konfirmasi-pesanan-grosir.usecase";
import { AjukanGrosirKeGudangUseCase } from "./use-cases/ajukan-grosir-ke-gudang.usecase";
import { GenerateOrderReportUseCase } from "./use-cases/generate-order-report.usecase";
import { GenerateAdminOrderReportUseCase } from "./use-cases/generate-admin-order-report.usecase";
import { SubmitDeliveryProofUseCase } from "./use-cases/submit-delivery-proof.usecase";
import { SellerConfirmOrderUseCase } from "./use-cases/seller-confirm-order.usecase";
import { AutoConfirmOrderService } from "./services/auto-confirm-order.service";
import { XenditService } from "./services/xendit.service";
import { CreateOrderHelpersService } from "./use-cases/create-pesanan-helpers.service";
import { EcomProductsModule } from "../ecom-produk/ecom-produks.module";
import { StoresModule } from "../toko/tokos.module";
import { CommonModule } from "../../common/common.module";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { PengajuanStokRepository } from "../pengajuan-stok/repositories/pengajuan-stok.repository";
import { LogisticsModule } from "../../core/logistik/logistics.module";
import { NotificationsModule } from "../../core/notifikasi/notifikasis.module";
import { ProfitReportModule } from "../profit-report/profit-report.module";
import { PengajuanStokModule } from "../pengajuan-stok/pengajuan-stok.module";
@Module({
  imports: [
    ConfigModule,
    EcomProductsModule,
    StoresModule,
    CommonModule,
    LogisticsModule,
    NotificationsModule,
    ProfitReportModule,
    PengajuanStokModule,
  ],

  controllers: [
    PesananCustomerController,
    PesananSellerController,
    PesananAdminController,
    PesananCourierController,
    PesananGrosirController,
    PaymentWebhookController,
  ],
  providers: [
    PrismaService,
    PesananEcomsRepository,
    PengajuanStokRepository,
    CreateOrderUseCase,
    FindUserOrdersUseCase,
    FindOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    AdminFindAllOrdersUseCase,
    SellerFindOrdersUseCase,
    InitShippingUseCase,
    UpdateShippingStatusUseCase,
    ConfirmReceivedUseCase,
    ConfirmPaymentUseCase,
    CreatePesananGrosirUseCase,
    KonfirmasiPesananGrosirUseCase,
    AjukanGrosirKeGudangUseCase,
    FindCourierTasksUseCase,
    GenerateOrderReportUseCase,
    GenerateAdminOrderReportUseCase,
    SubmitDeliveryProofUseCase,
    SellerConfirmOrderUseCase,
    AutoConfirmOrderService,
    XenditService,
    CreateOrderHelpersService,
  ],
  exports: [PesananEcomsRepository],
})
export class PesananEcomsModule {}
