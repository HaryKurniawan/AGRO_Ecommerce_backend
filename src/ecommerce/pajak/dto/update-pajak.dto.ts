import { IsBoolean, IsNumber, Min, Max, IsOptional } from "class-validator";

export class UpdatePajakDto {
  @IsOptional()
  @IsBoolean()
  isAktif?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  persenPPN?: number;
}
