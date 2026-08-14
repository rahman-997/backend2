export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Backend2 API",
    version: "1.1.1",
    description: "Production-oriented Express 5 API for venue management.",
  },
  paths: {
    "/v1/venues": {
      get: {
        summary: "List venues",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", schema: { type: "string", minLength: 1 } },
          { name: "minCapacity", in: "query", schema: { type: "integer", minimum: 0 }, description: "Inclusive minimum capacity." },
          { name: "maxCapacity", in: "query", schema: { type: "integer", minimum: 0 }, description: "Inclusive maximum capacity. Must be greater than or equal to minCapacity when both are supplied." },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "name", "address", "capacity"], default: "createdAt" }, description: "Safe allowlisted sort field." },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" }, description: "Sort direction." },
        ],
        responses: {
          200: { description: "Paginated venue list" },
          400: { description: "Invalid query parameters" },
        },
      },
      post: {
        summary: "Create venue",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/VenueInput" } } } },
        responses: { 201: { description: "Created" }, 400: { description: "Invalid input" }, 409: { description: "Duplicate venue name" } },
      },
    },
    "/v1/venues/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: { summary: "Get venue by UUID", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
      patch: {
        summary: "Partially update venue",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/VenuePatch" } } } },
        responses: { 200: { description: "Updated" }, 400: { description: "Invalid input" }, 404: { description: "Not found" }, 409: { description: "Duplicate venue name" } },
      },
      delete: { summary: "Delete venue", responses: { 204: { description: "Deleted" }, 404: { description: "Not found" } } },
    },
    "/health": { get: { summary: "Liveness check", responses: { 200: { description: "OK" } } } },
    "/ready": { get: { summary: "Readiness check", responses: { 200: { description: "Ready" }, 503: { description: "Not ready" } } } },
  },
  components: {
    schemas: {
      Venue: {
        type: "object",
        required: ["id", "name", "address", "capacity", "contactEmail", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" }, name: { type: "string", minLength: 1 }, address: { type: "string", minLength: 1 },
          capacity: { type: "integer", minimum: 1 }, contactEmail: { type: "string", format: "email" }, createdAt: { type: "string", format: "date-time" },
        },
      },
      VenueInput: {
        type: "object",
        required: ["name", "address", "capacity", "contactEmail"],
        properties: { name: { type: "string", minLength: 1 }, address: { type: "string", minLength: 1 }, capacity: { type: "integer", minimum: 1 }, contactEmail: { type: "string", format: "email" } },
      },
      VenuePatch: {
        type: "object",
        minProperties: 1,
        properties: { name: { type: "string", minLength: 1 }, address: { type: "string", minLength: 1 }, capacity: { type: "integer", minimum: 1 }, contactEmail: { type: "string", format: "email" } },
      },
    },
  },
} as const;
