import { z } from "zod";

const venueFields = {
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().min(1, "Address is required"),
  capacity: z.number().int("Capacity must be an integer").positive("Capacity must be positive"),
  contactEmail: z.string().trim().email("Invalid contact email"),
};

export const createVenueSchema = z.object(venueFields).strict();

export const updateVenueSchema = z.object(venueFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided",
);

export const venueIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Venue id is required"),
});

export const listVenuesQuerySchema = z.object({
  limit: z.coerce.number().int("Limit must be an integer").positive("Limit must be positive").default(20).transform((value) => Math.min(value, 100)),
});
