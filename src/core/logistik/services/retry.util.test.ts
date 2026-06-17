import { retryWithBackoff, RetryOptions } from "./retry.util";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("retryWithBackoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return result on first successful attempt", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: () => true,
    };

    const promise = retryWithBackoff(mockFn, options);
    const result = await promise;

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should retry on retryable error and succeed", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Transient error"))
      .mockResolvedValueOnce("success");

    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: (error) => error.message === "Transient error",
    };

    const promise = retryWithBackoff(mockFn, options);

    // Fast-forward through the delay
    vi.advanceTimersByTime(1000);

    const result = await promise;

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should use exponential backoff delays", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Error 1"))
      .mockRejectedValueOnce(new Error("Error 2"))
      .mockResolvedValueOnce("success");

    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: () => true,
    };

    const promise = retryWithBackoff(mockFn, options);

    // First retry: 1000ms * 2^0 = 1000ms
    vi.advanceTimersByTime(1000);
    await Promise.resolve(); // Let the promise chain progress

    // Second retry: 1000ms * 2^1 = 2000ms
    vi.advanceTimersByTime(2000);

    const result = await promise;

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should throw error after max retries exhausted", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("Persistent error"));

    const options: RetryOptions = {
      maxRetries: 2,
      initialDelayMs: 1000,
      shouldRetry: () => true,
    };

    const promise = retryWithBackoff(mockFn, options);

    // Advance through all retry delays
    vi.advanceTimersByTime(1000); // First retry
    await Promise.resolve();
    vi.advanceTimersByTime(2000); // Second retry
    await Promise.resolve();

    await expect(promise).rejects.toThrow("Persistent error");
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should not retry on non-retryable error", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("Client error"));

    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: (error) => error.message !== "Client error",
    };

    await expect(retryWithBackoff(mockFn, options)).rejects.toThrow(
      "Client error",
    );
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should handle zero max retries", async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

    const options: RetryOptions = {
      maxRetries: 0,
      initialDelayMs: 1000,
      shouldRetry: () => true,
    };

    await expect(retryWithBackoff(mockFn, options)).rejects.toThrow("Error");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
