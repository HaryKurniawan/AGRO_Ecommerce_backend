import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

import { HandleXenditWebhookUseCase } from "../use-cases/handle-xendit-webhook.usecase";

@ApiTags("Payment - Webhook")
@Controller("payment")
export class PaymentWebhookController {
  constructor(
    private readonly handleXenditWebhookUseCase: HandleXenditWebhookUseCase,
  ) {}

  /**
   * Xendit Webhook Endpoint
   * Dipanggil oleh Xendit setiap kali status invoice berubah.
   * Endpoint ini WAJIB dikecualikan dari auth guard (public).
   */
  @Post("xendit-webhook")
  @HttpCode(200)
  @ApiOperation({
    summary: "Webhook Xendit — dipanggil oleh server Xendit secara otomatis",
  })
  async handleXenditWebhook(
    @Headers("x-callback-token") callbackToken: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ message: string }> {
    return this.handleXenditWebhookUseCase.execute(callbackToken, payload);
  }
}
