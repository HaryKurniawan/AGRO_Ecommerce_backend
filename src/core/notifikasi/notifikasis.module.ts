import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifikasis.controller";
import { NotificationsService } from "./notifikasis.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
