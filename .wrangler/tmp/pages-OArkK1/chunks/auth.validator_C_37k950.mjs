globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, s as stringType } from './astro/server_D4BVXBCg.mjs';

const RegisterRequestSchema = objectType({
  email: stringType({ required_error: "Email is required" }).email({ message: "Must be a valid email address" }).max(255, { message: "Email must not exceed 255 characters" }).toLowerCase().trim(),
  password: stringType({ required_error: "Password is required" }).min(6, { message: "Password must be at least 6 characters long" }).max(72, { message: "Password must not exceed 72 characters" })
  // bcrypt limit
});
const LoginRequestSchema = objectType({
  email: stringType({ required_error: "Email is required" }).email({ message: "Must be a valid email address" }).toLowerCase().trim(),
  password: stringType({ required_error: "Password is required" })
});
objectType({
  email: stringType({ required_error: "Email is required" }).email({ message: "Must be a valid email address" }).toLowerCase().trim()
});

export { LoginRequestSchema as L, RegisterRequestSchema as R };
