import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateReviewDto {
  @IsUUID()
  itemPesananId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  ulasan?: string;
}
