import z from "zod";
import { BloodGroup } from "../../generated/prisma/enums.js";
const donorIdParamsValidationSchema = z.object({
    id: z.string().trim().min(1, "Donor id is required."),
});
const updateDonorValidationSchema = z
    .object({
    fullName: z.string().trim().min(2, "Donor full name is required.").optional(),
    age: z
        .coerce
        .number({ message: "Donor age must be a number." })
        .int("Donor age must be a whole number.")
        .min(18, "Donor must be at least 18 years old.")
        .max(65, "Donor age must be 65 or below.")
        .optional(),
    bloodGroup: z.enum(BloodGroup, {
        message: "Please select a valid blood group.",
    }).optional(),
    contactNumber: z.string().trim().min(6, "Donor contact number is required.").optional(),
    address: z.string().trim().min(3, "Donor address is required.").optional(),
    lastDonationDate: z.coerce.date().optional(),
    isAvailable: z.coerce.boolean().optional(),
    totalDonations: z
        .coerce
        .number({ message: "Total donations must be a number." })
        .int("Total donations must be a whole number.")
        .min(0, "Total donations cannot be negative.")
        .optional(),
})
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
});
export const DonorValidation = {
    donorIdParamsValidationSchema,
    updateDonorValidationSchema,
};
