import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { GetCartUseCase } from "./use-cases/get-keranjang.usecase";
import { AddCartItemUseCase } from "./use-cases/add-keranjang-item.usecase";
import { UpdateCartItemUseCase } from "./use-cases/update-keranjang-item.usecase";
import { RemoveCartItemUseCase } from "./use-cases/remove-keranjang-item.usecase";
import { ClearCartUseCase } from "./use-cases/clear-keranjang.usecase";
import { SyncCartUseCase } from "./use-cases/sync-keranjang.usecase";

import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { SyncCartDto } from "./dto/sync-cart.dto";

@ApiTags("Cart")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("keranjang")
export class CartController {
  constructor(
    private readonly getCartUC: GetCartUseCase,
    private readonly addCartItemUC: AddCartItemUseCase,
    private readonly updateCartItemUC: UpdateCartItemUseCase,
    private readonly removeCartItemUC: RemoveCartItemUseCase,
    private readonly clearCartUC: ClearCartUseCase,
    private readonly syncCartUC: SyncCartUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get current pengguna keranjang" })
  async getCart(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.getCartUC.execute(penggunaId);
  }

  @Post("sync")
  @ApiOperation({ summary: "Sync guest cart items with logged-in user cart" })
  async syncCart(
    @CurrentUser("sub") penggunaId: string,
    @Body() payload: SyncCartDto,
  ): Promise<any> {
    return this.syncCartUC.execute(penggunaId, payload.items);
  }

  @Post("item")
  @ApiOperation({ summary: "Add item to keranjang" })
  async addItem(
    @CurrentUser("sub") penggunaId: string,
    @Body() payload: AddToCartDto,
  ): Promise<any> {
    return this.addCartItemUC.execute(
      penggunaId,
      payload.produkId,
      payload.jumlah,
      payload.varianKemasanId,
    );
  }

  @Patch("item/:id")
  @ApiOperation({ summary: "Update keranjang item jumlah" })
  async updateItem(
    @CurrentUser("sub") penggunaId: string,
    @Param("id") id: string,
    @Body() payload: UpdateCartItemDto,
  ): Promise<any> {
    return this.updateCartItemUC.execute(
      penggunaId,
      id,
      payload.jumlah,
      payload.varianKemasanId,
    );
  }

  @Delete("item/:id")
  @ApiOperation({ summary: "Remove item from keranjang" })
  async removeItem(
    @CurrentUser("sub") penggunaId: string,
    @Param("id") id: string,
  ): Promise<any> {
    return this.removeCartItemUC.execute(penggunaId, id);
  }

  @Delete()
  @ApiOperation({ summary: "Clear all item from keranjang" })
  async clearCart(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.clearCartUC.execute(penggunaId);
  }
}

