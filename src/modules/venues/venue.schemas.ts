import { z } from "zod";
const venueFields={name:z.string().trim().min(1,"Name is required"),address:z.string().trim().min(1,"Address is required"),capacity:z.number().int("Capacity must be an integer").positive("Capacity must be positive"),contactEmail:z.string().trim().email("Invalid contact email")};
export const createVenueSchema=z.object(venueFields).strict();
export const updateVenueSchema=z.object(venueFields).partial().strict().refine(v=>Object.keys(v).length>0,"At least one field must be provided");
export const venueIdParamsSchema=z.object({id:z.string().trim().min(1,"Venue id is required")});
export const listVenuesQuerySchema=z.object({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().positive().default(20).transform(v=>Math.min(v,100)),search:z.string().trim().min(1).optional(),minCapacity:z.coerce.number().int().positive().optional(),maxCapacity:z.coerce.number().int().positive().optional()}).refine(v=>v.minCapacity===undefined||v.maxCapacity===undefined||v.minCapacity<=v.maxCapacity,"minCapacity cannot exceed maxCapacity");
