import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(12).max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

export const refreshTokenSchema = z
  .object({ refreshToken: z.string().min(32).max(512) })
  .strict();

export const userIdParamsSchema = z.object({ id: z.string().uuid() }).strict();
export const updateUserRoleSchema = z.object({ role: z.enum(["USER", "ADMIN"]) }).strict();
export const updateUserStatusSchema = z.object({ isActive: z.boolean() }).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
