import { z } from "zod";

const MAX_CAPACITY = 2_147_483_647;

const venueFields = {
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  address: z.string().trim().min(1, "Address is required").max(2000, "Address is too long"),
  capacity: z
    .number()
    .int("Capacity must be an integer")
    .positive("Capacity must be positive")
    .max(MAX_CAPACITY, "Capacity exceeds the supported maximum"),
  contactEmail: z.string().trim().email("Invalid contact email").max(320, "Contact email is too long"),
};

const capacityFilter = z.coerce
  .number()
  .int("Capacity filter must be an integer")
  .nonnegative("Capacity filter cannot be negative")
  .max(MAX_CAPACITY, "Capacity filter exceeds the supported maximum");

export const createVenueSchema = z.object(venueFields).strict();

export const updateVenueSchema = z
  .object(venueFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const venueIdParamsSchema = z.object({
  id: z.uuid("Venue id must be a valid UUID"),
});

export const listVenuesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().max(10_000, "Page is too large").default(1),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .max(100, "Limit cannot exceed 100")
      .default(20),
    search: z.string().trim().min(1).max(100, "Search is too long").optional(),
    minCapacity: capacityFilter.optional(),
    maxCapacity: capacityFilter.optional(),
    sortBy: z.enum(["createdAt", "name", "address", "capacity"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (value) =>
      value.minCapacity === undefined ||
      value.maxCapacity === undefined ||
      value.minCapacity <= value.maxCapacity,
    {
      message: "minCapacity cannot exceed maxCapacity",
      path: ["maxCapacity"],
    },
  );
