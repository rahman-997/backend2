import { z } from "zod";

export const signupSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(120),
});

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const emptyBodySchema = z.strictObject({});
