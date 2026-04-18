import { UserRole } from "../../generated/prisma/enums.js";

export interface RegisterDonorProfilePayload {
    fullName: string;
    age: number;
    bloodGroup:
        | "A_POSITIVE"
        | "A_NEGATIVE"
        | "B_POSITIVE"
        | "B_NEGATIVE"
        | "AB_POSITIVE"
        | "AB_NEGATIVE"
        | "O_POSITIVE"
        | "O_NEGATIVE";
    contactNumber: string;
    address: string;
    lastDonationDate?: string;
}

export interface RegisterUserPayload {
name: string;
email: string;
password: string;
image?: string;
imageFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
};
role?: UserRole;
donorProfile?: RegisterDonorProfilePayload;
}


export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}