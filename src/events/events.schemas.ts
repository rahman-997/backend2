import { z } from "zod";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

export const createEventSchema = z.strictObject({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5_000),
  venue: z.string().trim().min(1).max(240),
  startsAt: isoDate,
  capacity: z.number().int().positive().max(1_000_000),
  priceCents: z.number().int().nonnegative().max(100_000_000),
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
    q: z.string().trim().min(1).max(100).optional(),
    venue: z.string().trim().min(1).max(200).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || new Date(from).getTime() <= new Date(to).getTime(),
    { message: "from must be before or equal to to", path: ["from"] },
  );

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
