import { IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateStoreStatusDto {
  @ApiProperty({
    description: "Status baru toko",
    enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
  })
  @IsEnum(["ACTIVE", "INACTIVE", "SUSPENDED"])
  @IsNotEmpty()
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
