import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(kataSandi: string): Promise<string> {
  return bcrypt.hash(kataSandi, SALT_ROUNDS);
}

export async function comparePassword(
  kataSandi: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(kataSandi, hash);
}
