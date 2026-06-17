import { IsBoolean, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ToggleSellerStatusDto {
  @ApiProperty({
    description: "Status aktif seller (true = aktif, false = nonaktif)",
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  aktif: boolean;
}
