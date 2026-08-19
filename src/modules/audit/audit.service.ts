import { auditRepository } from "./audit.repository.js";
import type { AuditListQuery, CreateAuditLogInput } from "./audit.types.js";

export const auditService = {
  async record(input: CreateAuditLogInput): Promise<void> {
    try {
      await auditRepository.create(input);
    } catch (error) {
      console.error({ event: "audit_write_failed", action: input.action, resourceType: input.resourceType, resourceId: input.resourceId, error });
    }
  },

  async list(query: AuditListQuery) {
    return auditRepository.list(query);
  },
};
