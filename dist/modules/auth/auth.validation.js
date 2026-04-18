import z from "zod";
import { BloodGroup, UserRole } from "../../generated/prisma/enums";
const donorProfileSchema = z.object({
    fullName: z.string().trim().min(2, "Donor full name is required."),
    age: z.coerce
        .number({ message: "Donor age must be a number." })
        .int("Donor age must be a whole number.")
        .min(18, "Donor must be at least 18 years old.")
        .max(65, "Donor age must be 65 or below."),
    bloodGroup: z.nativeEnum(BloodGroup, {
        message: "Please select a valid blood group.",
    }),
    contactNumber: z.string().trim().min(6, "Donor contact number is required."),
    address: z.string().trim().min(3, "Donor address is required."),
    lastDonationDate: z.string().datetime().optional(),
});
const registerUserValidationSchema = z
    .object({
    name: z.string().trim().min(2, "Name is required."),
    email: z.string().trim().email("Please provide a valid email address."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long.")
        .max(64, "Password is too long."),
    role: z.nativeEnum(UserRole).optional(),
    donorProfile: donorProfileSchema.optional(),
})
    .superRefine((data, ctx) => {
    if (data.role === UserRole.DONOR && !data.donorProfile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["donorProfile"],
            message: "Donor profile details are required when signing up as a donor.",
        });
    }
});
const loginValidationSchema = z.object({
    email: z.string().trim().email("Please provide a valid email address."),
    password: z.string().min(1, "Password is required."),
});
const changePasswordValidationSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
});
const verifyEmailValidationSchema = z.object({
    email: z.string().trim().email("Please provide a valid email address."),
    otp: z.string().trim().min(4, "OTP is required."),
});
const emailOnlyValidationSchema = z.object({
    email: z.string().trim().email("Please provide a valid email address."),
});
const resetPasswordValidationSchema = z.object({
    email: z.string().trim().email("Please provide a valid email address."),
    otp: z.string().trim().min(4, "OTP is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
});
const refreshTokenValidationSchema = z
    .object({
    refreshToken: z.string().optional(),
    sessionToken: z.string().optional(),
})
    .optional();
export const AuthValidation = {
    registerUserValidationSchema,
    loginValidationSchema,
    changePasswordValidationSchema,
    verifyEmailValidationSchema,
    emailOnlyValidationSchema,
    resetPasswordValidationSchema,
    refreshTokenValidationSchema,
};
