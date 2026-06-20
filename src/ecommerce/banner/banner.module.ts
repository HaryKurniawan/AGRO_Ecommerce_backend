import { Module } from "@nestjs/common";
import { BannerService } from "./banner.service";
import { BannerController } from "./banner.controller";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}
