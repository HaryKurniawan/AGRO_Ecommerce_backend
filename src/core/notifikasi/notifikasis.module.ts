import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifikasis.controller";
import { NotificationsService } from "./notifikasis.service";
import { NotifSseService } from "./notifikasis.sse.service";

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotifSseService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
