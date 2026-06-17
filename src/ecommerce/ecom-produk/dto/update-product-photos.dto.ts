import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from "class-validator";

export class UpdateProductPhotosDto {
  @IsArray()
  @ArrayMinSize(2, { message: "Minimal 2 foto harus ada" })
  @ArrayMaxSize(3, { message: "Maksimal 3 foto saja" })
  @IsString({ each: true })
  fotoUrls: string[]; // Array of URLs (from upload or link)
}
