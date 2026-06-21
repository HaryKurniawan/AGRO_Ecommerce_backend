import { describe, it, expect } from "vitest";
import { getPaginationParams, createPaginatedResult } from "../src/common/utils/pagination.util";

describe("Pagination Utility", () => {
  it("should return default pagination params", () => {
    const params = getPaginationParams({});
    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);
    expect(params.skip).toBe(0);
  });

  it("should calculate skip correctly based on page and limit", () => {
    const params = getPaginationParams({ page: 2, limit: 20 });
    expect(params.page).toBe(2);
    expect(params.limit).toBe(20);
    expect(params.skip).toBe(20);
  });

  it("should create correct paginated result metadata", () => {
    const data = ["item1", "item2", "item3"];
    const result = createPaginatedResult(data, 10, 1, 3);
    
    expect(result.data.length).toBe(3);
    expect(result.meta.total).toBe(10);
    expect(result.meta.totalPages).toBe(4); // 10 / 3 rounded up
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPreviousPage).toBe(false);
  });
});
