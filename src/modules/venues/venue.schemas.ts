import { z } from "zod";

const venueFields = {
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().min(1, "Address is required"),
  capacity: z.number().int("Capacity must be an integer").positive("Capacity must be positive"),
  contactEmail: z.string().trim().email("Invalid contact email"),
};

const capacityFilter = z.coerce
  .number()
  .int("Capacity filter must be an integer")
  .nonnegative("Capacity filter cannot be negative");

export const createVenueSchema = z.object(venueFields).strict();

export const updateVenueSchema = z
  .object(venueFields)
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided",
  );

export const venueIdParamsSchema = z.object({
  id: z.uuid("Venue id must be a valid UUID"),
});

export const listVenuesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be positive")
      .default(20)
      .transform((value) => Math.min(value, 100)),
    search: z.string().trim().min(1).optional(),
    minCapacity: capacityFilter.optional(),
    maxCapacity: capacityFilter.optional(),
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
