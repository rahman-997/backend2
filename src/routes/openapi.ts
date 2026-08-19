export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Backend2 API",
    version: "2.0.0",
    description: "Production-oriented Express 5 API with JWT authentication, immediate token revocation, venue ownership, RBAC, PostgreSQL/MySQL persistence, and audit logging.",
  },
  paths: {
    "/v1/auth/register": {
      post: {
        summary: "Register a user",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterInput" } } } },
        responses: { 201: { description: "Registered" }, 400: { description: "Invalid input" }, 409: { description: "Email already exists" } },
      },
    },
    "/v1/auth/login": {
      post: {
        summary: "Log in",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LoginInput" } } } },
        responses: { 200: { description: "Authenticated" }, 401: { description: "Invalid credentials" }, 403: { description: "Account disabled" } },
      },
    },
    "/v1/auth/refresh": {
      post: {
        summary: "Rotate a refresh token and issue new tokens",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RefreshInput" } } } },
        responses: { 200: { description: "Tokens rotated" }, 401: { description: "Invalid, reused, revoked, or expired refresh token" } },
      },
    },
    "/v1/auth/logout": {
      post: {
        summary: "Revoke one refresh token",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RefreshInput" } } } },
        responses: { 204: { description: "Logged out" } },
      },
    },
    "/v1/auth/logout-all": {
      post: {
        summary: "Immediately revoke all sessions and access tokens for the current user",
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: "All sessions revoked" }, 401: { description: "Authentication required" } },
      },
    },
    "/v1/auth/me": {
      get: {
        summary: "Get the current user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Current user" }, 401: { description: "Missing, invalid, stale, or revoked access token" } },
      },
    },
    "/v1/auth/admin/users": {
      get: {
        summary: "List users (ADMIN only)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "User list" }, 401: { description: "Authentication required" }, 403: { description: "ADMIN role required" } },
      },
    },
    "/v1/auth/admin/users/{id}/role": {
      patch: {
        summary: "Change a user's role and revoke existing sessions (ADMIN only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/UserRoleInput" } } } },
        responses: { 200: { description: "Role updated" }, 400: { description: "Unsafe self-change" }, 401: { description: "Authentication required" }, 403: { description: "ADMIN role required" }, 404: { description: "User not found" } },
      },
    },
    "/v1/auth/admin/users/{id}/status": {
      patch: {
        summary: "Enable or disable a user and revoke existing sessions (ADMIN only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/UserStatusInput" } } } },
        responses: { 200: { description: "Status updated" }, 400: { description: "Unsafe self-change" }, 401: { description: "Authentication required" }, 403: { description: "ADMIN role required" }, 404: { description: "User not found" } },
      },
    },
    "/v1/admin/audit-logs": {
      get: {
        summary: "List audit logs (ADMIN only)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 10000, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
          { name: "action", in: "query", schema: { type: "string", maxLength: 64 } },
          { name: "resourceType", in: "query", schema: { type: "string", maxLength: 64 } },
          { name: "actorUserId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: { 200: { description: "Paginated audit log list" }, 401: { description: "Authentication required" }, 403: { description: "ADMIN role required" } },
      },
    },
    "/v1/venues": {
      get: {
        summary: "List venues (public)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 10000, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", schema: { type: "string", minLength: 1, maxLength: 100 } },
          { name: "minCapacity", in: "query", schema: { type: "integer", minimum: 0, maximum: 2147483647 }, description: "Inclusive minimum capacity." },
          { name: "maxCapacity", in: "query", schema: { type: "integer", minimum: 0, maximum: 2147483647 }, description: "Inclusive maximum capacity. Must be >= minCapacity." },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "name", "address", "capacity"], default: "createdAt" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: { 200: { description: "Paginated venue list" }, 400: { description: "Invalid query parameters" } },
      },
      post: {
        summary: "Create a venue owned by the authenticated user",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/VenueInput" } } } },
        responses: { 201: { description: "Created" }, 400: { description: "Invalid input" }, 401: { description: "Authentication required" }, 409: { description: "Duplicate venue name" } },
      },
    },
    "/v1/venues/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: { summary: "Get venue by UUID (public)", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
      patch: {
        summary: "Update an owned venue; ADMIN may update any venue",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/VenuePatch" } } } },
        responses: { 200: { description: "Updated" }, 400: { description: "Invalid input" }, 401: { description: "Authentication required" }, 403: { description: "Owner or ADMIN required" }, 404: { description: "Not found" }, 409: { description: "Duplicate venue name" } },
      },
      delete: {
        summary: "Delete an owned venue; ADMIN may delete any venue",
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: "Deleted" }, 401: { description: "Authentication required" }, 403: { description: "Owner or ADMIN required" }, 404: { description: "Not found" } },
      },
    },
    "/health": { get: { summary: "Liveness check", responses: { 200: { description: "OK" } } } },
    "/ready": { get: { summary: "Readiness check", responses: { 200: { description: "Ready" }, 503: { description: "Not ready" } } } },
  },
  components: {
    securitySchemes: { BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      User: {
        type: "object",
        required: ["id", "name", "email", "role", "isActive", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" }, name: { type: "string", minLength: 1, maxLength: 120 },
          email: { type: "string", format: "email", maxLength: 320 }, role: { type: "string", enum: ["USER", "ADMIN"] },
          isActive: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
        },
      },
      RegisterInput: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string", minLength: 1, maxLength: 120 }, email: { type: "string", format: "email", maxLength: 320 }, password: { type: "string", minLength: 12, maxLength: 128, format: "password" } } },
      LoginInput: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email", maxLength: 320 }, password: { type: "string", maxLength: 128, format: "password" } } },
      RefreshInput: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string", minLength: 32, maxLength: 512 } } },
      UserRoleInput: { type: "object", required: ["role"], properties: { role: { type: "string", enum: ["USER", "ADMIN"] } } },
      UserStatusInput: { type: "object", required: ["isActive"], properties: { isActive: { type: "boolean" } } },
      Venue: {
        type: "object",
        required: ["id", "name", "address", "capacity", "contactEmail", "ownerUserId", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" }, name: { type: "string", minLength: 1, maxLength: 255 }, address: { type: "string", minLength: 1, maxLength: 2000 },
          capacity: { type: "integer", minimum: 1, maximum: 2147483647 }, contactEmail: { type: "string", format: "email", maxLength: 320 },
          ownerUserId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, createdAt: { type: "string", format: "date-time" },
        },
      },
      VenueInput: { type: "object", required: ["name", "address", "capacity", "contactEmail"], properties: { name: { type: "string", minLength: 1, maxLength: 255 }, address: { type: "string", minLength: 1, maxLength: 2000 }, capacity: { type: "integer", minimum: 1, maximum: 2147483647 }, contactEmail: { type: "string", format: "email", maxLength: 320 } } },
      VenuePatch: { type: "object", minProperties: 1, properties: { name: { type: "string", minLength: 1, maxLength: 255 }, address: { type: "string", minLength: 1, maxLength: 2000 }, capacity: { type: "integer", minimum: 1, maximum: 2147483647 }, contactEmail: { type: "string", format: "email", maxLength: 320 } } },
      AuditLog: { type: "object", required: ["id", "actorUserId", "action", "resourceType", "resourceId", "metadata", "createdAt"], properties: { id: { type: "string", format: "uuid" }, actorUserId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, action: { type: "string" }, resourceType: { type: "string" }, resourceId: { anyOf: [{ type: "string" }, { type: "null" }] }, metadata: { type: "object" }, createdAt: { type: "string", format: "date-time" } } },
    },
  },
} as const;
