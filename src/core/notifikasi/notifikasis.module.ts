import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { NotificationsController } from "./notifikasis.controller";
import { NotificationsService } from "./notifikasis.service";
import { NotifSseService } from "./notifikasis.sse.service";
import { NotifProcessor } from "./queue/notif.processor";

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifikasi',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotifSseService, NotifProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
