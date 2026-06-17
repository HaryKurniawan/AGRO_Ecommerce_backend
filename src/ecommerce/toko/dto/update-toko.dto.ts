import { PartialType } from "@nestjs/swagger";

import { CreateStoreDto } from "./create-toko.dto";

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
