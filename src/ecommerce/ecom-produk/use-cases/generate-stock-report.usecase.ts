import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";

@Injectable()
export class GenerateStockReportUseCase {
  constructor(private readonly productsRepo: ProdukEcomsRepository) {}

  async execute(
    tokoId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Buffer> {
    const where: any = {
      produk: { tokoId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const histories = await this.productsRepo.findManyStockHistory({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        produk: { select: { nama: true } },
        pengguna: { select: { nama: true, email: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Agro Jabar E-Commerce";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Laporan Stok");

    // Title Row
    worksheet.addRow(["LAPORAN MUTASI KELUAR MASUK BARANG (STOK)"]);
    worksheet.addRow([`Toko ID: ${tokoId}`]);
    worksheet.addRow([
      `Periode: ${startDate || "Semua"} s/d ${endDate || "Semua"}`,
    ]);
    worksheet.addRow([]); // Blank spacer

    // Apply main title styles
    const titleCell = worksheet.getCell("A1");
    titleCell.font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FF1B4332" },
    };

    // Table Headers
    const headers = [
      "No",
      "Waktu Perubahan",
      "Nama Produk",
      "Tipe Perubahan",
      "Kuantitas Perubahan",
      "Stok Akhir",
      "Dilakukan Oleh",
      "Keterangan / Catatan",
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2D6A4F" }, // Forest Green primary
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF1B4332" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });
    headerRow.height = 25;

    // Table Data Rows
    histories.forEach((log: any, index: number) => {
      let typeLabel = log.tipe;
      if (log.tipe === "IN") typeLabel = "Barang Masuk";
      if (log.tipe === "OUT") typeLabel = "Barang Keluar";
      if (log.tipe === "ADJUSTMENT") typeLabel = "Penyesuaian";

      const rowData = [
        index + 1,
        new Date(log.createdAt).toLocaleString("id-ID"),
        log.produk?.nama || "-",
        typeLabel,
        log.kuantitas,
        log.stokAkhir,
        log.pengguna?.nama || "-",
        log.catatan || "-",
      ];

      const newRow = worksheet.addRow(rowData);

      // Formatting Specific Cells
      newRow.getCell(2).alignment = { horizontal: "center" }; // Date
      newRow.getCell(4).alignment = { horizontal: "center" }; // Type

      // Numbers formatting
      const qtyCell = newRow.getCell(5);
      qtyCell.value = Number(log.kuantitas);
      qtyCell.numFmt = "#,##0";
      qtyCell.alignment = { horizontal: "right" };

      // Highlight positive (IN) and negative (OUT) quantities
      if (log.tipe === "IN") {
        qtyCell.font = {
          name: "Arial",
          size: 10,
          color: { argb: "FF2D6A4F" },
          bold: true,
        };
      } else if (log.tipe === "OUT") {
        qtyCell.font = {
          name: "Arial",
          size: 10,
          color: { argb: "FFD00000" },
          bold: true,
        };
      }

      const finalStockCell = newRow.getCell(6);
      finalStockCell.value = Number(log.stokAkhir);
      finalStockCell.numFmt = "#,##0";
      finalStockCell.alignment = { horizontal: "right" };

      // Set standard border to all data rows
      newRow.eachCell((cell) => {
        if (!cell.font) {
          cell.font = { name: "Arial", size: 10 };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFEAEAEA" } },
          left: { style: "thin", color: { argb: "FFEAEAEA" } },
          bottom: { style: "thin", color: { argb: "FFEAEAEA" } },
          right: { style: "thin", color: { argb: "FFEAEAEA" } },
        };
      });
    });

    // Auto-adjust column widths
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 6; // 'No' column
      } else if (index === 2) {
        column.width = 35; // 'Product name' column
      } else if (index === 7) {
        column.width = 30; // 'Keterangan/catatan'
      } else {
        let maxLen = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : "";
          const len = val
            .split("\n")
            .reduce((max, line) => Math.max(max, line.length), 0);
          if (len > maxLen) maxLen = len;
        });
        column.width = Math.min(Math.max(maxLen + 4, 12), 40);
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
