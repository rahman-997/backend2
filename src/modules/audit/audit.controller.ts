import type { Request, Response } from "express";
import { auditService } from "./audit.service.js";
import type { AuditListQuery } from "./audit.types.js";

export async function listAuditLogs(_req: Request, res: Response): Promise<void> {
  const query = res.locals.validatedQuery as AuditListQuery;
  const result = await auditService.list(query);
  const totalPages = Math.ceil(result.total / query.limit);

  res.status(200).json({
    data: result.data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  });
}
