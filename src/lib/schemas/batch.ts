import { z } from "zod";

export const venueSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  capacityDefault: z.coerce.number<number>().int().min(1, "At least 1"),
});

export type VenueFormValues = z.infer<typeof venueSchema>;

export const batchSchema = z.object({
  venueId: z.string().min(1, "Venue is required"),
  instructorName: z.string().trim().min(1, "Instructor is required"),
  startsOn: z.string().min(1, "Start date is required"),
  endsOn: z.string().min(1, "End date is required"),
  scheduleText: z.string().trim().min(1, "Schedule is required"),
  capacity: z.coerce.number<number>().int().min(1, "At least 1 seat"),
  fee: z.coerce.number<number>().min(0),
  sessions: z
    .array(
      z.object({
        sessionDate: z.string().min(1, "Date is required"),
        topic: z.string().trim().min(1, "Topic is required"),
      }),
    )
    .min(1, "At least one session"),
});

export type BatchFormValues = z.infer<typeof batchSchema>;
