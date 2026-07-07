import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Observable, fromEvent, interval, merge } from "rxjs";
import { map } from "rxjs/operators";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SkipTransform } from "../../../common/decorators/skip-transform.decorator";
import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-pengguna.decorator";
import { CreateOrderUseCase } from "../use-cases/create-pesanan.usecase";
import { FindUserOrdersUseCase } from "../use-cases/find-pengguna-pesanans.usecase";
import { ConfirmReceivedUseCase } from "../use-cases/confirm-received.usecase";
import { ConfirmPaymentUseCase } from "../use-cases/confirm-payment.usecase";
import { FindOrderByIdUseCase } from "../use-cases/find-pesanan-by-id.usecase";
import { CreateOrderDto } from "../dto/create-pesanan.dto";

@ApiTags("Ecom Pesanan - Customer")
@Controller("ecom-pesanan")
export class PesananCustomerController {
  constructor(
    private readonly createOrderUC: CreateOrderUseCase,
    private readonly findUserOrdersUC: FindUserOrdersUseCase,
    private readonly confirmReceivedUC: ConfirmReceivedUseCase,
    private readonly confirmPaymentUC: ConfirmPaymentUseCase,
    private readonly findOrderByIdUC: FindOrderByIdUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Create new pesanan" })
  async create(
    @CurrentUser("sub") penggunaId: string,
    @Body() payload: CreateOrderDto,
  ): Promise<any> {
    return this.createOrderUC.execute(penggunaId, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("my-pesanan")
  @ApiOperation({ summary: "Get current pengguna pesanan" })
  async findByUser(
    @CurrentUser("sub") penggunaId: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findUserOrdersUC.execute(
      penggunaId,
      status,
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  @ApiOperation({ summary: "Get pesanan by ID" })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.findOrderByIdUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/complete")
  @ApiOperation({
    summary: "Customer: confirm pesanan received (ARRIVED → SELESAI)",
  })
  async confirmReceived(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.confirmReceivedUC.execute(id, penggunaId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/confirm-payment")
  @ApiOperation({
    summary:
      "Customer: konfirmasi pembayaran pesanan (MENUNGGU_BAYAR → DIPROSES). " +
      "Hanya pemilik pesanan yang boleh memanggil endpoint ini. " +
      "Status harus MENUNGGU_BAYAR.",
  })
  @ApiResponse({ status: 200, description: "Pembayaran berhasil dikonfirmasi" })
  @ApiResponse({
    status: 400,
    description: "Status pesanan bukan MENUNGGU_BAYAR",
  })
  @ApiResponse({ status: 403, description: "Bukan pemilik pesanan" })
  @ApiResponse({ status: 404, description: "Pesanan tidak ditemukan" })
  async confirmPayment(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.confirmPaymentUC.execute(id, penggunaId);
  }

  @Sse("stream")
  @SkipTransform()
  @ApiOperation({ summary: "Stream order status updates" })
  streamOrders(): Observable<MessageEvent> {
    const updatesLocal$ = fromEvent(this.eventEmitter, "order.status.updated");
    
    const updates$ = updatesLocal$.pipe(
      map((payload: any) => ({
        data: payload,
      })),
    );

    const heartbeat$ = interval(15000).pipe(
      map(() => ({ data: { type: "heartbeat" } })),
    );

    return merge(updates$, heartbeat$);
  }
}
