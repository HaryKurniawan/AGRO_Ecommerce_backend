import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { StatusPesananEcom } from "@prisma/client";

export class ProfitReportFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(StatusPesananEcom)
  status?: StatusPesananEcom;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  limit?: number = 20;
}

export class ProfitSummaryFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(["day", "week", "month"])
  groupBy?: "day" | "week" | "month" = "day";

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  isB2B?: boolean;
}
