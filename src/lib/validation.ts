import { z } from "zod";

/** Shared Zod schemas for forms, API routes, and unit tests */

export const emailSchema = z.string().trim().email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

/** Given name or family name (web + mobile + API). */
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(60, "Maximum 60 characters")
  .regex(/^[\p{L}\s'.-]+$/u, "Use letters, spaces, apostrophes, periods, or hyphens only")
  .refine((s) => /\p{L}/u.test(s), { message: "Include at least one letter" });

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Step 2 of signup — identity + password only. */
export const signupAccountBasicsSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const signupFormSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    /** Optional at signup — can be added later in profile. */
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(500).optional(),
    role: z.enum(["customer", "buyer", "driver"]),
    vehicleType: z.string().optional(),
    licenseNumber: z.string().optional(),
    availability: z.string().optional(),
    gstNumber: z.string().trim().max(32).optional(),
    ein: z.string().trim().max(20).optional(),
    marketRegion: z.enum(["IN", "US"]).default("US"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    const phoneDigits = (data.phone ?? "").replace(/\D/g, "");
    if (data.phone && data.phone.trim().length > 0 && phoneDigits.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone must include at least 10 digits",
      });
    }
    if (data.role !== "driver") return;
    if (!data.vehicleType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehicleType"],
        message: "Vehicle type is required for drivers",
      });
    }
    if (!data.licenseNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["licenseNumber"],
        message: "License number is required for drivers",
      });
    }
    if (!data.availability?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availability"],
        message: "Availability is required for drivers",
      });
    }
  });

export const mapCoordinatesSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .refine(
    (v) =>
      (v.latitude == null && v.longitude == null) ||
      (v.latitude != null && v.longitude != null),
    { message: "Set both latitude and longitude, or clear both" },
  );

/** First error per field from Zod flatten — for inline form messages */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string | undefined> {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(flat)) {
    const arr = flat[key as keyof typeof flat];
    if (arr?.[0]) out[key] = arr[0];
  }
  return out;
}
