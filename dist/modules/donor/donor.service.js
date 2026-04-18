import status from "http-status";
import prisma from "../../config/prisma.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import { donorFilterableFields, donorSearchableFields } from "./donor.constants.js";
const donorInclude = {
    user: true,
    donations: true,
    bloodRequests: true,
};
const isAdminOrSuperAdmin = (role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
const getDonors = async (query) => {
    const baseQueryBuilder = new QueryBuilder(prisma.donor, query, {
        filterableFields: donorFilterableFields,
        searchableFields: donorSearchableFields,
    });
    return await baseQueryBuilder
        .filter()
        .where({
        isDeleted: false,
    })
        .search()
        .include(donorInclude)
        .paginate()
        .sort()
        .execute();
};
const getDonorById = async (id) => {
    const donor = await prisma.donor.findFirst({
        where: {
            id,
            isDeleted: false,
        },
        include: donorInclude,
    });
    if (!donor) {
        throw new AppError(status.NOT_FOUND, "Donor not found.");
    }
    return donor;
};
const assertCanManageDonor = (donor, currentUser) => {
    if (isAdminOrSuperAdmin(currentUser.role)) {
        return;
    }
    if (currentUser.role === UserRole.DONOR && donor.userId === currentUser.userId) {
        return;
    }
    throw new AppError(status.FORBIDDEN, "You are not allowed to modify this donor profile.");
};
const updateDonor = async (id, payload, currentUser) => {
    const donor = await prisma.donor.findFirst({
        where: {
            id,
            isDeleted: false,
        },
    });
    if (!donor) {
        throw new AppError(status.NOT_FOUND, "Donor not found.");
    }
    assertCanManageDonor(donor, currentUser);
    const updatedDonor = await prisma.donor.update({
        where: {
            id,
        },
        data: {
            ...(payload.fullName ? { fullName: payload.fullName.trim() } : {}),
            ...(typeof payload.age === "number" ? { age: payload.age } : {}),
            ...(payload.bloodGroup ? { bloodGroup: payload.bloodGroup } : {}),
            ...(payload.contactNumber ? { contactNumber: payload.contactNumber.trim() } : {}),
            ...(payload.address ? { address: payload.address.trim() } : {}),
            ...(payload.lastDonationDate ? { lastDonationDate: new Date(payload.lastDonationDate) } : {}),
            ...(typeof payload.isAvailable === "boolean" ? { isAvailable: payload.isAvailable } : {}),
            ...(typeof payload.totalDonations === "number" ? { totalDonations: payload.totalDonations } : {}),
        },
        include: donorInclude,
    });
    return updatedDonor;
};
const softDeleteDonor = async (id, currentUser) => {
    const donor = await prisma.donor.findFirst({
        where: {
            id,
            isDeleted: false,
        },
    });
    if (!donor) {
        throw new AppError(status.NOT_FOUND, "Donor not found.");
    }
    assertCanManageDonor(donor, currentUser);
    const deletedDonor = await prisma.donor.update({
        where: {
            id,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            isAvailable: false,
        },
        include: donorInclude,
    });
    return deletedDonor;
};
export const DonorService = {
    getDonors,
    getDonorById,
    updateDonor,
    softDeleteDonor,
};
