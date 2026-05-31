import { Algorithm, hash, verify } from "@node-rs/argon2";

const passwordHashOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string) {
  return hash(password, passwordHashOptions);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, passwordHashOptions);
}