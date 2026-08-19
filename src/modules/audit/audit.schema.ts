import { z } from "zod";

export const auditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    action: z.string().trim().min(1).max(64).optional(),
    resourceType: z.string().trim().min(1).max(64).optional(),
    actorUserId: z.string().uuid().optional(),
  })
  .strict();
