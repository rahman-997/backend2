import { z } from "zod";

export const createBookingSchema = z.strictObject({
  eventId: z.string().uuid(),
});
