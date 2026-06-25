import { describe, it, expect, vi, beforeEach } from "vitest";
import { KonfirmasiPesananGrosirUseCase } from "../../../src/ecommerce/ecom-pesanan/use-cases/konfirmasi-pesanan-grosir.usecase";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("KonfirmasiPesananGrosirUseCase", () => {
  let useCase: KonfirmasiPesananGrosirUseCase;
  let ordersRepoMock: any;
  let tokosRepoMock: any;
  let productsRepoMock: any;
  let pengajuanStokRepoMock: any;
  let xenditServiceMock: any;
  let prismaMock: any;

  beforeEach(() => {
    ordersRepoMock = {
      findUnique: vi.fn(),
      update: vi.fn()
    };

    tokosRepoMock = {
      findUnique: vi.fn()
    };

    productsRepoMock = {
      findUnique: vi.fn()
    };

    pengajuanStokRepoMock = {};

    xenditServiceMock = {
      createInvoice: vi.fn(),
      createQRIS: vi.fn()
    };

    prismaMock = {
      pengguna: {
        findUnique: vi.fn()
      }
    };

    useCase = new KonfirmasiPesananGrosirUseCase(
      ordersRepoMock as any,
      tokosRepoMock as any,
      productsRepoMock as any,
      pengajuanStokRepoMock as any,
      xenditServiceMock as any,
      prismaMock as any
    );
  });

  it("should throw NotFoundException if pesanan not found", async () => {
    ordersRepoMock.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute("seller-1", "order-1", { terima: true })
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw BadRequestException if status is not MENUNGGU_KONFIRMASI_SELLER", async () => {
    ordersRepoMock.findUnique.mockResolvedValue({ status: "DIPROSES" });

    await expect(
      useCase.execute("seller-1", "order-1", { terima: true })
    ).rejects.toThrow("Status pesanan bukan menunggu konfirmasi seller");
  });

  it("should cancel order if seller rejects it", async () => {
    ordersRepoMock.findUnique.mockResolvedValue({
      id: "order-1",
      status: "MENUNGGU_KONFIRMASI_SELLER",
      item: [{ produkId: "prod-1" }]
    });

    ordersRepoMock.update.mockResolvedValue({ status: "DIBATALKAN" });

    const result = await useCase.execute("seller-1", "order-1", {
      terima: false,
      catatanSeller: "Stok habis"
    });

    expect(result.status).toBe("DIBATALKAN");
    expect(ordersRepoMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DIBATALKAN" })
      })
    );
  });

  it("should accept order and generate xendit invoice", async () => {
    ordersRepoMock.findUnique.mockResolvedValue({
      id: "order-1",
      status: "MENUNGGU_KONFIRMASI_SELLER",
      metodeBayar: "BCA_VA",
      konsumenId: "user-1",
      ongkir: 10000,
      item: [{ produkId: "prod-1", jumlah: 10, harga: 50000 }] // Subtotal 500k
    });

    productsRepoMock.findUnique.mockResolvedValue({ tokoId: "toko-1" });
    tokosRepoMock.findUnique.mockResolvedValue({ id: "toko-1" });
    
    prismaMock.pengguna.findUnique.mockResolvedValue({ email: "test@test.com", nama: "Test User" });
    
    xenditServiceMock.createInvoice.mockResolvedValue({ invoiceUrl: "https://xendit.co/pay123", id: "tok123" });

    ordersRepoMock.update.mockResolvedValue({ status: "MENUNGGU_BAYAR" });

    const result = await useCase.execute("seller-1", "order-1", {
      terima: true,
      ongkirBaru: 15000 // Total should be 515000
    });

    expect(result.status).toBe("MENUNGGU_BAYAR");
    
    expect(xenditServiceMock.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 515000
      })
    );

    expect(ordersRepoMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "MENUNGGU_BAYAR",
          totalHarga: 515000,
          ongkir: 15000,
          paymentUrl: "https://xendit.co/pay123"
        })
      })
    );
  });
});
