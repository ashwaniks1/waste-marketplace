import { describe, expect, it } from "vitest";
import {
  emailSchema,
  loginFormSchema,
  mapCoordinatesSchema,
  passwordSchema,
  signupAccountBasicsSchema,
  signupFormSchema,
} from "./validation";

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.safeParse("  a@b.co  ").success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires length, uppercase, and digit", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("nouppercase123").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHere").success).toBe(false);
    expect(passwordSchema.safeParse("ValidPass1").success).toBe(true);
  });
});

describe("loginFormSchema", () => {
  it("requires password non-empty", () => {
    const r = loginFormSchema.safeParse({ email: "a@b.co", password: "" });
    expect(r.success).toBe(false);
  });
});

describe("signupAccountBasicsSchema", () => {
  it("accepts matching passwords", () => {
    const r = signupAccountBasicsSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
    });
    expect(r.success).toBe(true);
  });
});

describe("signupFormSchema", () => {
  it("accepts buyer without phone or address", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
      role: "buyer",
    });
    expect(r.success).toBe(true);
  });

  it("accepts buyer with phone and address", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
      phone: "+1 (555) 123-4567",
      address: "123 Main St",
      role: "buyer",
    });
    expect(r.success).toBe(true);
  });

  it("rejects phone that is too short when provided", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
      phone: "123",
      role: "buyer",
    });
    expect(r.success).toBe(false);
  });

  it("rejects mismatched confirm password", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Other1A",
      role: "buyer",
    });
    expect(r.success).toBe(false);
  });

  it("accepts driver with vehicle details and no phone", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
      role: "driver",
      vehicleType: "Cargo van",
      licenseNumber: "D1234567",
      availability: "Weekdays",
    });
    expect(r.success).toBe(true);
  });

  it("rejects driver missing vehicle details", () => {
    const r = signupFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "Secure1A",
      confirmPassword: "Secure1A",
      role: "driver",
      vehicleType: "",
      licenseNumber: "",
      availability: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("vehicleType");
    }
  });
});

describe("mapCoordinatesSchema", () => {
  it("allows both null", () => {
    expect(mapCoordinatesSchema.safeParse({ latitude: null, longitude: null }).success).toBe(true);
  });
  it("rejects only one set", () => {
    expect(mapCoordinatesSchema.safeParse({ latitude: 1, longitude: null }).success).toBe(false);
  });
});
