export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditListQuery {
  page: number;
  limit: number;
  action?: string;
  resourceType?: string;
  actorUserId?: string;
}

export interface AuditListResult {
  data: AuditLog[];
  total: number;
}
