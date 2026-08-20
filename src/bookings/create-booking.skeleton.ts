import { prisma } from "../db/prisma.js";

/**
 * Session 3 starter reference.
 *
 * The homework starter provides the Serializable transaction wrapper and leaves
 * the business-critical sections below for the student implementation.
 * The completed implementation lives in bookings.service.ts.
 */
export async function createBookingSkeleton(userId: string, eventId: string) {
  return prisma.$transaction(
    async (tx) => {
      void tx;
      void userId;
      void eventId;

      // TODO(student): count CONFIRMED bookings and reject when capacity is full.
      // TODO(student): if an existing row is CANCELLED, flip it back to CONFIRMED.
      // TODO(student): create a new CONFIRMED booking when no row exists.
      throw new Error("TODO(student): complete the Session 3 booking transaction");
    },
    { isolationLevel: "Serializable" },
  );
}

// Stretch from the starter: retry the whole transaction on bounded P2034
// serialization failures. P2002 duplicate mapping belongs at the service edge.
