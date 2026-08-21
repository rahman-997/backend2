CREATE INDEX IF NOT EXISTS "Event_startsAt_idx" ON "Event"("startsAt");
CREATE INDEX IF NOT EXISTS "Event_organizerId_startsAt_idx" ON "Event"("organizerId", "startsAt");
CREATE INDEX IF NOT EXISTS "Booking_eventId_status_createdAt_idx" ON "Booking"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_enqueuedAt_idx" ON "NotificationOutbox"("status", "enqueuedAt");
