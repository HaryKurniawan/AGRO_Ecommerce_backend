import { Logger } from "@nestjs/common";

/**
 * Options for retry with exponential backoff
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Initial delay in milliseconds before first retry
   */
  initialDelayMs: number;

  /**
   * Function to determine if an error should trigger a retry
   * @param error - The error that occurred
   * @returns true if the operation should be retried, false otherwise
   */
  shouldRetry: (error: any) => boolean;
}

/**
 * Executes an async function with exponential backoff retry logic
 *
 * @template T - The return type of the function
 * @param fn - The async function to execute with retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchDataFromAPI(),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     shouldRetry: (error) => error.status >= 500
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const logger = new Logger("RetryUtil");
  let lastError: any;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Log success if this was a retry attempt
      if (attempt > 0) {
        logger.log(`Operation succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === options.maxRetries;
      const shouldRetry = options.shouldRetry(error);

      if (!shouldRetry || isLastAttempt) {
        // Don't retry - either not retryable or out of attempts
        if (isLastAttempt && shouldRetry) {
          logger.error(
            `All ${options.maxRetries} retry attempts exhausted. Last error: ${error.message}`,
          );
        } else {
          logger.warn(
            `Operation failed with non-retryable error: ${error.message}`,
          );
        }
        break;
      }

      // Calculate exponential backoff delay: initialDelayMs * 2^attempt
      const delayMs = options.initialDelayMs * Math.pow(2, attempt);

      logger.warn(
        `Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delayMs}ms...`,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}
