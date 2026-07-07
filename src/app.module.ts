import { Module } from "@nestjs/common";
import { ConfigModule , ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { MetricsInterceptor } from "./infrastructure/monitoring/metrics.interceptor";

// Config
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
// Infrastructure
import { PrismaModule } from "./infrastructure/database/prisma.module";
import { LoggerModule } from "./infrastructure/logger/logger.module";
import { MonitoringModule } from "./infrastructure/monitoring/monitoring.module";
// Core Modules
import { AuthModule } from "./core/auth/auth.module";
import { UsersModule } from "./core/pengguna/pengguna.module";
import { DashboardModule } from "./core/dashboard/dashboard.module";
// Shared Services
import { CommonModule } from "./common/common.module";
// Ecommerce Modules
import { StoresModule } from "./ecommerce/toko/tokos.module";
import { CategoriesModule } from "./ecommerce/kategori/categories.module";
import { EcomProductsModule } from "./ecommerce/ecom-produk/ecom-produks.module";
import { CartModule } from "./ecommerce/keranjang/keranjang.module";
import { PesananEcomsModule } from "./ecommerce/ecom-pesanan/ecom-pesanans.module";
import { AddressesModule } from "./core/alamat/alamats.module";
import { NotificationsModule } from "./core/notifikasi/notifikasis.module";
import { ChatModule } from "./core/percakapan-chat/chat.module";
import { LogisticsModule } from "./core/logistik/logistics.module";
import { PengajuanStokModule } from "./ecommerce/pengajuan-stok/pengajuan-stok.module";
import { MasterProdukModule } from "./ecommerce/master-produk/master-produk.module";
import { ProfitReportModule } from "./ecommerce/profit-report/profit-report.module";
import { AnalyticsModule } from "./ecommerce/analytics/analytics.module";
import { MasterKomoditasModule } from "./ecommerce/master-komoditas/master-komoditas.module";
import { GudangModule } from "./ecommerce/gudang/gudang.module";
import { BannerModule } from "./ecommerce/banner/banner.module";

// Other
import { UploadModule } from "./core/unggah-foto/upload.module";
import { ReviewsModule } from "./ecommerce/ulasan/ulasans.module";
import { DeliveryBatchModule } from "./ecommerce/delivery-batch/delivery-batch.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
    }),

    // Internal Events
    EventEmitterModule.forRoot(),

    // Rate Limiting (OWASP A04)
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 detik
        limit: 20, // Max 20 request/detik per IP
      },
      {
        name: "medium",
        ttl: 60000, // 1 menit
        limit: 300, // Max 300 request/menit per IP
      },
    ]),

    // Infrastructure
    PrismaModule,
    LoggerModule,
    MonitoringModule,

    // Shared Services (Global)
    CommonModule,

    // Core Modules
    AuthModule,
    UsersModule,
    DashboardModule,

    // Ecommerce Modules
    StoresModule,
    CategoriesModule,
    EcomProductsModule,
    CartModule,
    PesananEcomsModule,
    AddressesModule,
    NotificationsModule,
    ChatModule,
    LogisticsModule,
    PengajuanStokModule,
    MasterProdukModule,
    MasterKomoditasModule,
    GudangModule,
    ProfitReportModule,
    AnalyticsModule,
    BannerModule,

    // Other
    UploadModule,
    ReviewsModule,
    DeliveryBatchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
