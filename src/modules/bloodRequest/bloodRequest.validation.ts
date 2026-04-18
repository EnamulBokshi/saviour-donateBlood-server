import z from "zod";
import { BloodGroup, RequestStatus } from "../../generated/prisma/enums.js";

const bloodRequestIdParamsValidationSchema = z.object({
  id: z.string().trim().min(1, "Blood request id is required."),
});

const createBloodRequestValidationSchema = z.object({
  hospitalName: z.string().trim().min(2, "Hospital name is required."),
  hospitalAddress: z.string().trim().min(3, "Hospital address is required."),
  patientName: z.string().trim().min(2, "Patient name is required."),
  patientAge: z.coerce.number({ message: "Patient age must be a number." }).int().min(0),
  patientBloodGroup: z.enum(BloodGroup, {
    message: "Please select a valid blood group.",
  }),
  bloodUnits: z.coerce.number({ message: "Blood units must be a number." }).int().min(1),
  isEmergency: z.coerce.boolean(),
  contactNumber: z.string().trim().min(6, "Contact number is required."),
  dateOfDonation: z.coerce.date(),
  description: z.string().trim().optional(),
  requestToDonorId: z.string().trim().optional(),
  status: z.enum(RequestStatus).optional(),
});

const updateBloodRequestValidationSchema = z
  .object({
    hospitalName: z.string().trim().min(2).optional(),
    hospitalAddress: z.string().trim().min(3).optional(),
    patientName: z.string().trim().min(2).optional(),
    patientAge: z.coerce.number({ message: "Patient age must be a number." }).int().min(0).optional(),
    patientBloodGroup: z.enum(BloodGroup, {
      message: "Please select a valid blood group.",
    }).optional(),
    bloodUnits: z.coerce.number({ message: "Blood units must be a number." }).int().min(1).optional(),
    isEmergency: z.coerce.boolean().optional(),
    contactNumber: z.string().trim().min(6).optional(),
    dateOfDonation: z.coerce.date().optional(),
    description: z.string().trim().optional(),
    requestToDonorId: z.string().trim().optional(),
    status: z.enum(RequestStatus).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
  });

export const BloodRequestValidation = {
  bloodRequestIdParamsValidationSchema,
  createBloodRequestValidationSchema,
  updateBloodRequestValidationSchema,
};