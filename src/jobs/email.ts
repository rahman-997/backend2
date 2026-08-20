import nodemailer from "nodemailer";
import { config } from "../config.js";

const transporter = config.EMAIL_MODE === "smtp" ? nodemailer.createTransport(config.SMTP_URL!) : null;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

type Confirmation = {
  bookingId: string;
  email: string;
  name: string;
  title: string;
  venue: string;
  startsAt: Date;
};

export async function sendBookingConfirmation(input: Confirmation): Promise<void> {
  const subject = `Booking confirmed: ${input.title}`;
  const text = `Hi ${input.name},\n\nYour booking for ${input.title} at ${input.venue} is confirmed.\nStarts: ${input.startsAt.toISOString()}\nBooking ID: ${input.bookingId}\n`;

  if (!transporter) {
    console.log("[email:log]", JSON.stringify({ to: input.email, subject, bookingId: input.bookingId }));
    return;
  }

  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to: input.email,
    subject,
    text,
    html: `<p>Hi ${escapeHtml(input.name)},</p><p>Your booking for <strong>${escapeHtml(input.title)}</strong> at ${escapeHtml(input.venue)} is confirmed.</p><p>Starts: ${escapeHtml(input.startsAt.toISOString())}</p><p>Booking ID: <code>${escapeHtml(input.bookingId)}</code></p>`,
  });
}
