import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../src/common/utils/hash.util";

describe("Hash Utility", () => {
  it("should hash a password successfully", async () => {
    const password = "mysecretpassword123";
    const hashed = await hashPassword(password);
    
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(0);
  });

  it("should correctly verify a matching password", async () => {
    const password = "securepassword";
    const hashed = await hashPassword(password);
    
    const isValid = await comparePassword(password, hashed);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "securepassword";
    const hashed = await hashPassword(password);
    
    const isInvalid = await comparePassword("wrongpassword", hashed);
    expect(isInvalid).toBe(false);
  });
});
