import { z } from "zod";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

export const createEventSchema = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  venue: z.string().trim().min(1),
  startsAt: isoDate,
  capacity: z.number().int().nonnegative(),
  priceCents: z.number().int().nonnegative(),
});

export const updateEventSchema = createEventSchema.partial();

const intParam = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value),
    z.number().int().min(min).max(max),
  );

export const listEventsQuerySchema = z
  .strictObject({
    page: intParam(1, Number.MAX_SAFE_INTEGER).default(1),
    limit: intParam(1, 100).default(20),
    venue: z.string().optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || new Date(from).getTime() <= new Date(to).getTime(),
    { message: "from must be before or equal to to", path: ["from"] },
  );

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
