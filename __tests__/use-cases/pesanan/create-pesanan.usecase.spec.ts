import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateOrderUseCase } from "../../../src/ecommerce/ecom-pesanan/use-cases/create-pesanan.usecase";
import { BadRequestException } from "@nestjs/common";

describe("CreateOrderUseCase", () => {
  let useCase: CreateOrderUseCase;
  let prismaMock: any;
  let ordersRepoMock: any;
  let productsRepoMock: any;
  let tokosRepoMock: any;
  let eventEmitterMock: any;
  let calcShippingUCMock: any;
  let notificationsServiceMock: any;
  let profitReportServiceMock: any;
  let midtransServiceMock: any;
  let orderQueueMock: any;

  beforeEach(() => {
    prismaMock = {
      alamatKonsumen: { findUnique: vi.fn() },
      varianKemasan: { findUnique: vi.fn(), update: vi.fn() },
      pengguna: { findUnique: vi.fn() },
      pesananEcom: { update: vi.fn() }
    };

    ordersRepoMock = {
      create: vi.fn(),
      findCartByCustomerId: vi.fn(),
      deleteManyCartItems: vi.fn()
    };

    productsRepoMock = {
      findUnique: vi.fn(),
      findManyInventory: vi.fn(),
      updateInventory: vi.fn(),
      update: vi.fn(),
      createStockHistory: vi.fn()
    };

    tokosRepoMock = {};

    eventEmitterMock = {
      emit: vi.fn()
    };

    calcShippingUCMock = {
      execute: vi.fn()
    };

    notificationsServiceMock = {
      create: vi.fn()
    };

    profitReportServiceMock = {
      createProfitTransaction: vi.fn()
    };

    midtransServiceMock = {
      createTransaction: vi.fn()
    };

    orderQueueMock = {
      add: vi.fn()
    };

    useCase = new CreateOrderUseCase(
      prismaMock as any,
      ordersRepoMock as any,
      productsRepoMock as any,
      tokosRepoMock as any,
      eventEmitterMock as any,
      calcShippingUCMock as any,
      notificationsServiceMock as any,
      profitReportServiceMock as any,
      midtransServiceMock as any,
      orderQueueMock as any
    );
  });

  it("should throw error if pesanan is empty", async () => {
    await expect(
      useCase.execute("user-1", {
        metodeBayar: "BCA_VA",
        alamatKirim: "alamat-1",
        pesanan: []
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw error if customer address is not found", async () => {
    prismaMock.alamatKonsumen.findUnique.mockResolvedValue(null);
    
    await expect(
      useCase.execute("user-1", {
        metodeBayar: "BCA_VA",
        alamatKirim: "alamat-invalid",
        pesanan: [
          {
            tokoId: "toko-1",
            ongkir: 10000,
            item: [{ produkId: "prod-1", jumlah: 1, harga: 50000 }]
          }
        ]
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("should create order successfully for valid data", async () => {
    // Setup Mocks
    prismaMock.alamatKonsumen.findUnique.mockResolvedValue({
      id: "alamat-1",
      alamat: "Jl. Test",
      kota: "Bandung"
    });
    
    calcShippingUCMock.execute.mockResolvedValue([
      {
        tokoId: "toko-1",
        isAvailable: true,
        ongkir: 10000,
        distanceKm: 5,
        isFallback: false
      }
    ]);

    productsRepoMock.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === "prod-1") {
        return { id: "prod-1", nama: "Beras", beratGram: 1000, harga: 50000, stok: 10 };
      }
      return null;
    });

    productsRepoMock.findManyInventory.mockResolvedValue([
      { id: "inv-1", stokTersediaKg: 10, stokFisikKg: 10 }
    ]);

    ordersRepoMock.create.mockResolvedValue({
      id: "order-1",
      totalHarga: 60000, // 50000 + 10000
      status: "PENDING",
      tokoId: "toko-1",
      item: [
        { id: "item-1", produkId: "prod-1", jumlah: 1, harga: 50000, produk: { hargaBeli: 40000 } }
      ]
    });

    prismaMock.pengguna.findUnique.mockResolvedValue({
      nama: "Budi",
      email: "budi@test.com"
    });

    midtransServiceMock.createTransaction.mockResolvedValue({
      token: "midtrans-token-123",
      redirectUrl: "https://midtrans.com/pay"
    });

    ordersRepoMock.findCartByCustomerId.mockResolvedValue({ id: "cart-1" });

    // Execute
    const result = await useCase.execute("user-1", {
      metodeBayar: "BCA_VA",
      alamatKirim: "alamat-1",
      pesanan: [
        {
          tokoId: "toko-1",
          ongkir: 10000,
          item: [{ produkId: "prod-1", jumlah: 1, harga: 50000 }]
        }
      ]
    });

    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("order-1");
    
    // Check if Midtrans was called
    expect(midtransServiceMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 60000
      })
    );

    // Check if stock was deducted
    expect(productsRepoMock.updateInventory).toHaveBeenCalled();
    expect(productsRepoMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: expect.objectContaining({ stok: 9 })
      })
    );

    // Check if event was emitted
    expect(eventEmitterMock.emit).toHaveBeenCalledWith("order.status.updated", expect.any(Object));

    // Check if cart was cleared
    expect(ordersRepoMock.deleteManyCartItems).toHaveBeenCalled();

    // Check if BullMQ orderQueue was called to schedule auto cancel
    expect(orderQueueMock.add).toHaveBeenCalledWith(
      "cancelUnpaidOrder",
      { orderId: "order-1" },
      expect.objectContaining({ delay: 86400000 })
    );
  });

  it("should prevent manipulated shipping cost", async () => {
    prismaMock.alamatKonsumen.findUnique.mockResolvedValue({
      id: "alamat-1",
      alamat: "Jl. Test"
    });
    
    // Server calculates shipping as 25000
    calcShippingUCMock.execute.mockResolvedValue([
      {
        tokoId: "toko-1",
        isAvailable: true,
        ongkir: 25000,
        distanceKm: 5,
        isFallback: false
      }
    ]);

    productsRepoMock.findUnique.mockResolvedValue({
      id: "prod-1", beratGram: 1000, harga: 50000
    });

    await expect(
      useCase.execute("user-1", {
        metodeBayar: "BCA_VA",
        alamatKirim: "alamat-1",
        pesanan: [
          {
            tokoId: "toko-1",
            ongkir: 10000, // Frontend tries to cheat with 10000
            item: [{ produkId: "prod-1", jumlah: 1, harga: 50000 }]
          }
        ]
      })
    ).rejects.toThrow("Manipulasi Ongkir Terdeteksi");
  });

  it("should fail if stock is insufficient", async () => {
    prismaMock.alamatKonsumen.findUnique.mockResolvedValue({
      id: "alamat-1",
      alamat: "Jl. Test"
    });
    
    calcShippingUCMock.execute.mockResolvedValue([
      { tokoId: "toko-1", isAvailable: true, ongkir: 10000, distanceKm: 5, isFallback: false }
    ]);

    productsRepoMock.findUnique.mockResolvedValue({
      id: "prod-1", beratGram: 1000, harga: 50000
    });

    // Available stock only 2
    productsRepoMock.findManyInventory.mockResolvedValue([
      { id: "inv-1", stokTersediaKg: 2, stokFisikKg: 2 }
    ]);

    await expect(
      useCase.execute("user-1", {
        metodeBayar: "BCA_VA",
        alamatKirim: "alamat-1",
        pesanan: [
          {
            tokoId: "toko-1",
            ongkir: 10000,
            item: [{ produkId: "prod-1", jumlah: 10, harga: 50000 }] // Try to buy 10
          }
        ]
      })
    ).rejects.toThrow("tidak mencukupi");
  });
});
