import { z } from "zod";

/** Shared Zod schemas for forms, API routes, and unit tests */

export const emailSchema = z.string().trim().email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

const phoneDigits = z.string().trim().refine(
  (v) => v.replace(/\D/g, "").length >= 10,
  "Phone must include at least 10 digits",
);

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signupFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneDigits,
    address: z.string().trim().min(1, "Address is required").max(500),
    role: z.enum(["customer", "buyer", "driver"]),
    vehicleType: z.string().optional(),
    licenseNumber: z.string().optional(),
    availability: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
