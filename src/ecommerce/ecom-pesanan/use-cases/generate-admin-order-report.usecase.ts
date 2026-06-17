import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class GenerateAdminOrderReportUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(startDate?: string, endDate?: string): Promise<Buffer> {
    const where: any = {
      status: "SELESAI",
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

    const orders = await this.ordersRepo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        konsumen: { select: { nama: true, email: true } },
        toko: { select: { nama: true } },
        item: {
          include: { produk: true },
        },
        pengiriman: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Agro Jabar E-Commerce";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Laporan Penjualan Global");

    // Title Row
    worksheet.addRow(["LAPORAN PENJUALAN GLOBAL E-COMMERCE AGRO JABAR"]);
    worksheet.addRow([`Peran: Super Admin / Administrator`]);
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
      "ID Pesanan",
      "Nama Toko / Seller",
      "Tanggal",
      "Status Pesanan",
      "Tipe Pesanan",
      "Nama Konsumen",
      "Email Konsumen",
      "Metode Bayar",
      "Alamat Kirim",
      "Produk Dibeli",
      "Ongkos Kirim",
      "Total Harga",
      "Kurir",
      "Status Pengiriman",
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
    orders.forEach((order, index) => {
      const itemsList = (order as any).item
        .map(
          (it: any) =>
            `${it.produk?.nama || "Produk"} (${it.jumlah}x @ Rp ${it.harga})`,
        )
        .join("\n");

      const type = order.isGrosir ? "Grosir" : "Eceran";

      const rowData = [
        index + 1,
        order.id,
        (order as any).toko?.nama || "-",
        new Date(order.createdAt).toLocaleString("id-ID"),
        order.status,
        type,
        (order as any).konsumen?.nama || "-",
        (order as any).konsumen?.email || "-",
        order.metodeBayar || "-",
        order.alamatKirim || "-",
        itemsList,
        order.ongkir,
        order.totalHarga,
        (order as any).pengiriman?.kurirNama || "-",
        (order as any).pengiriman?.status || "-",
      ];

      const newRow = worksheet.addRow(rowData);

      // Formatting Specific Cells
      newRow.getCell(4).alignment = { horizontal: "center" }; // Date
      newRow.getCell(5).alignment = { horizontal: "center" }; // Status
      newRow.getCell(6).alignment = { horizontal: "center" }; // Tipe
      newRow.getCell(11).alignment = { wrapText: true }; // Products (multiline list)

      // Currency styling
      const ongkirCell = newRow.getCell(12);
      ongkirCell.value = Number(order.ongkir);
      ongkirCell.numFmt = '"Rp"#,##0';
      ongkirCell.alignment = { horizontal: "right" };

      const totalCell = newRow.getCell(13);
      totalCell.value = Number(order.totalHarga);
      totalCell.numFmt = '"Rp"#,##0';
      totalCell.alignment = { horizontal: "right" };

      // Set standard border to all data rows
      newRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10 };
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
        column.width = 25; // 'Store Name' column
      } else if (index === 10) {
        column.width = 45; // 'Products list' column
      } else if (index === 9) {
        column.width = 30; // 'Shipping address'
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
