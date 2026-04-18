import z from "zod";
import { DonationStatus } from "../../generated/prisma/enums.js";
const donationIdParamsValidationSchema = z.object({
    id: z.string().trim().min(1, "Donation id is required."),
});
const createDonationValidationSchema = z.object({
    donorId: z.string().trim().min(1, "Donor id is required."),
    bloodRequestId: z.string().trim().min(1, "Blood request id is required."),
    donationDate: z.coerce.date().optional(),
    status: z.enum(DonationStatus, {
        message: "Please select a valid donation status.",
    }).optional(),
});
const updateDonationValidationSchema = z
    .object({
    donationDate: z.coerce.date().optional(),
    status: z.enum(DonationStatus, {
        message: "Please select a valid donation status.",
    }).optional(),
})
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
});
export const DonationValidation = {
    donationIdParamsValidationSchema,
    createDonationValidationSchema,
    updateDonationValidationSchema,
};
