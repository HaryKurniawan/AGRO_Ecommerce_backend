import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateConversationDto {
  @ApiProperty({
    description: "Tipe percakapan chat",
    enum: ["CHAT_PENJUAL", "ADMIN_CS"],
  })
  @IsEnum(["CHAT_PENJUAL", "ADMIN_CS"])
  @IsNotEmpty()
  tipe: "CHAT_PENJUAL" | "ADMIN_CS";

  @ApiPropertyOptional({ description: "ID Toko (wajib untuk CHAT_PENJUAL)" })
  @IsString()
  @IsOptional()
  tokoId?: string;

  @ApiPropertyOptional({
    description: "ID User Target (opsional untuk ADMIN_CS)",
  })
  @IsString()
  @IsOptional()
  targetUserId?: string;
}
