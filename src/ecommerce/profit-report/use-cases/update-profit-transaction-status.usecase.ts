import { Injectable } from "@nestjs/common";
import { StatusPesananEcom } from "@prisma/client";

import { ProfitReportCommandRepository } from "../repositories/profit-report-command.repository";

@Injectable()
export class UpdateProfitTransactionStatusUseCase {
  constructor(private profitReportRepository: ProfitReportCommandRepository) {}

  async execute(
    pesananId: string,
    newStatus: StatusPesananEcom,
  ): Promise<void> {
    await this.profitReportRepository.updateProfitTransactionStatus(
      pesananId,
      newStatus,
    );
  }
}
