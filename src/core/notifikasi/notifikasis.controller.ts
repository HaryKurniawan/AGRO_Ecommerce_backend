import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Sse,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Observable, Subject, interval } from "rxjs";

import { NotificationsService } from "./notifikasis.service";
import { NotifSseService } from "./notifikasis.sse.service";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/auth/guards/roles.guard";
import { Roles } from "../../core/auth/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { BroadcastNotifDto } from "./dto/broadcast-notif.dto";

@ApiTags("Notifikasi")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("notifikasi")
export class NotificationsController {
  constructor(
    private readonly notifService: NotificationsService,
    private readonly sseService: NotifSseService,
  ) {}

  @Sse("stream")
  @ApiOperation({ summary: "SSE Stream for real-time notifications" })
  stream(@CurrentUser("sub") penggunaId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const subject = new Subject<MessageEvent>();
      this.sseService.addConnection(penggunaId, subject);

      const sub = subject.subscribe((event) => subscriber.next(event));

      const heartbeat = interval(30000).subscribe(() => {
        subscriber.next({ data: { type: "ping" } } as MessageEvent);
      });

      return () => {
        this.sseService.removeConnection(penggunaId, subject);
        sub.unsubscribe();
        heartbeat.unsubscribe();
        subject.complete();
      };
    });
  }

  @Post("broadcast")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Send broadcast notification (Admin only)" })
  async broadcast(@Body() dto: BroadcastNotifDto): Promise<any> {
    return this.notifService.createBroadcast(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get my notifikasi" })
  async findByUser(
    @CurrentUser("sub") penggunaId: string,
    @Query("page", new ParseIntPipe({ optional: true })) page: number = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<any> {
    return this.notifService.findByUser(penggunaId, page, limit);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notifikasi as read" })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.notifService.markAsRead(id, penggunaId);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifikasi as read" })
  async markAllAsRead(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.notifService.markAllAsRead(penggunaId);
  }
}
