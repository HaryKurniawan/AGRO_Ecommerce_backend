import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateOrderStatusUseCase } from "../../../src/ecommerce/ecom-pesanan/use-cases/update-pesanan-status.usecase";

describe("UpdateOrderStatusUseCase", () => {
  let useCase: UpdateOrderStatusUseCase;
  let ordersRepoMock: any;
  let findOrderByIdMock: any;
  let eventEmitterMock: any;
  let profitReportServiceMock: any;
  let redisServiceMock: any;
  let redisClientMock: any;

  beforeEach(() => {
    ordersRepoMock = {
      update: vi.fn()
    };

    findOrderByIdMock = {
      execute: vi.fn()
    };

    eventEmitterMock = {
      emit: vi.fn()
    };

    profitReportServiceMock = {
      updateProfitTransactionStatus: vi.fn(),
      handleOrderCancellation: vi.fn()
    };

    redisClientMock = {
      publish: vi.fn()
    };

    redisServiceMock = {
      getClient: vi.fn().mockReturnValue(redisClientMock)
    };

    useCase = new UpdateOrderStatusUseCase(
      ordersRepoMock as any,
      findOrderByIdMock as any,
      eventEmitterMock as any,
      profitReportServiceMock as any,
      redisServiceMock as any
    );
  });

  it("should update order status successfully", async () => {
    findOrderByIdMock.execute.mockResolvedValue({ id: "order-1" });
    ordersRepoMock.update.mockResolvedValue({ id: "order-1", status: "DIPROSES", tokoId: "toko-1" });

    const result = await useCase.execute("order-1", "DIPROSES");

    expect(result.status).toBe("DIPROSES");
    expect(findOrderByIdMock.execute).toHaveBeenCalledWith("order-1");
    expect(ordersRepoMock.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "DIPROSES" }
    });

    // Check profit update
    expect(profitReportServiceMock.updateProfitTransactionStatus).toHaveBeenCalledWith("order-1", "DIPROSES");
    
    // Cancellation should NOT be called
    expect(profitReportServiceMock.handleOrderCancellation).not.toHaveBeenCalled();

    // Redis Pub/Sub check
    expect(redisClientMock.publish).toHaveBeenCalledWith(
      "order:updates", 
      JSON.stringify({ orderId: "order-1", status: "DIPROSES", tokoId: "toko-1" })
    );

    // Event emitter check
    expect(eventEmitterMock.emit).toHaveBeenCalledWith("order.status.updated", {
      orderId: "order-1", status: "DIPROSES", tokoId: "toko-1"
    });
  });

  it("should handle order cancellation correctly", async () => {
    findOrderByIdMock.execute.mockResolvedValue({ id: "order-2" });
    ordersRepoMock.update.mockResolvedValue({ id: "order-2", status: "DIBATALKAN", tokoId: "toko-2" });

    const result = await useCase.execute("order-2", "DIBATALKAN");

    expect(result.status).toBe("DIBATALKAN");
    
    // Cancellation SHOULD be called
    expect(profitReportServiceMock.handleOrderCancellation).toHaveBeenCalledWith("order-2");
  });

  it("should not fail the whole process if profit service fails", async () => {
    findOrderByIdMock.execute.mockResolvedValue({ id: "order-3" });
    ordersRepoMock.update.mockResolvedValue({ id: "order-3", status: "DIPROSES", tokoId: "toko-3" });

    // Mock profit service to throw error
    profitReportServiceMock.updateProfitTransactionStatus.mockRejectedValue(new Error("Database offline"));

    // Should still resolve without throwing error
    const result = await useCase.execute("order-3", "DIPROSES");
    expect(result.status).toBe("DIPROSES");
  });
});
