import { IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProductStatusDto {
  @ApiProperty({
    description: "Status baru produk",
    enum: ["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"],
  })
  @IsEnum(["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"])
  @IsNotEmpty()
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
}
