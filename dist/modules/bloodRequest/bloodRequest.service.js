import status from "http-status";
import prisma from "../../config/prisma.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { UserRole, RequestStatus } from "../../generated/prisma/enums.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import { bloodRequestFilterableFields, bloodRequestSearchableFields } from "./bloodRequest.constants.js";
const bloodRequestInclude = {
    user: true,
    requestToDonor: {
        include: {
            user: true,
        },
    },
};
const isAdminOrSuperAdmin = (role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
const getRequesterDonorId = async (currentUser) => {
    if (currentUser.role !== UserRole.DONOR) {
        return null;
    }
    const donor = await prisma.donor.findFirst({
        where: {
            userId: currentUser.userId,
            isDeleted: false,
        },
    });
    if (!donor) {
        throw new AppError(status.FORBIDDEN, "Donor profile not found for the current user.");
    }
    return donor.id;
};
const getAccessWhere = async (currentUser) => {
    if (isAdminOrSuperAdmin(currentUser.role)) {
        return { isDeleted: false };
    }
    if (currentUser.role === UserRole.USER) {
        return {
            isDeleted: false,
            userId: currentUser.userId,
        };
    }
    const donorId = await getRequesterDonorId(currentUser);
    return {
        isDeleted: false,
        requestToDonorId: donorId,
    };
};
const assertCanManageBloodRequest = async (bloodRequest, currentUser) => {
    if (isAdminOrSuperAdmin(currentUser.role)) {
        return;
    }
    if (currentUser.role === UserRole.USER && bloodRequest.userId === currentUser.userId) {
        return;
    }
    if (currentUser.role === UserRole.DONOR) {
        const donorId = await getRequesterDonorId(currentUser);
        if (donorId && bloodRequest.requestToDonorId === donorId) {
            return;
        }
    }
    throw new AppError(status.FORBIDDEN, "You are not allowed to modify this blood request.");
};
const getBloodRequests = async (query, currentUser) => {
    const where = await getAccessWhere(currentUser);
    const queryBuilder = new QueryBuilder(prisma.bloodRequest, query, {
        filterableFields: bloodRequestFilterableFields,
        searchableFields: bloodRequestSearchableFields,
    });
    return await queryBuilder
        .filter()
        .where(where)
        .search()
        .include(bloodRequestInclude)
        .paginate()
        .sort()
        .execute();
};
const getBloodRequestById = async (id, currentUser) => {
    const bloodRequest = await prisma.bloodRequest.findFirst({
        where: {
            id,
            isDeleted: false,
        },
        include: bloodRequestInclude,
    });
    if (!bloodRequest) {
        throw new AppError(status.NOT_FOUND, "Blood request not found.");
    }
    await assertCanManageBloodRequest(bloodRequest, currentUser);
    return bloodRequest;
};
const createBloodRequest = async (payload, currentUser) => {
    const requestToDonorId = payload.requestToDonorId?.trim();
    if (requestToDonorId) {
        const donor = await prisma.donor.findFirst({
            where: {
                id: requestToDonorId,
                isDeleted: false,
            },
        });
        if (!donor) {
            throw new AppError(status.NOT_FOUND, "Assigned donor not found.");
        }
    }
    const createdRequest = await prisma.bloodRequest.create({
        data: {
            hospitalName: payload.hospitalName.trim(),
            hospitalAddress: payload.hospitalAddress.trim(),
            patientName: payload.patientName.trim(),
            patientAge: payload.patientAge,
            patientBloodGroup: payload.patientBloodGroup,
            bloodUnits: payload.bloodUnits,
            isEmergency: payload.isEmergency,
            contactNumber: payload.contactNumber.trim(),
            dateOfDonation: new Date(payload.dateOfDonation),
            description: payload.description?.trim() || null,
            status: payload.status ?? RequestStatus.PENDING,
            userId: currentUser.userId,
            requestToDonorId: requestToDonorId || null,
        },
        include: bloodRequestInclude,
    });
    return createdRequest;
};
const updateBloodRequest = async (id, payload, currentUser) => {
    const bloodRequest = await prisma.bloodRequest.findFirst({
        where: {
            id,
            isDeleted: false,
        },
    });
    if (!bloodRequest) {
        throw new AppError(status.NOT_FOUND, "Blood request not found.");
    }
    await assertCanManageBloodRequest(bloodRequest, currentUser);
    if (payload.requestToDonorId) {
        const donor = await prisma.donor.findFirst({
            where: {
                id: payload.requestToDonorId,
                isDeleted: false,
            },
        });
        if (!donor) {
            throw new AppError(status.NOT_FOUND, "Assigned donor not found.");
        }
    }
    const updatedRequest = await prisma.bloodRequest.update({
        where: {
            id,
        },
        data: {
            ...(payload.hospitalName ? { hospitalName: payload.hospitalName.trim() } : {}),
            ...(payload.hospitalAddress ? { hospitalAddress: payload.hospitalAddress.trim() } : {}),
            ...(payload.patientName ? { patientName: payload.patientName.trim() } : {}),
            ...(typeof payload.patientAge === "number" ? { patientAge: payload.patientAge } : {}),
            ...(payload.patientBloodGroup ? { patientBloodGroup: payload.patientBloodGroup } : {}),
            ...(typeof payload.bloodUnits === "number" ? { bloodUnits: payload.bloodUnits } : {}),
            ...(typeof payload.isEmergency === "boolean" ? { isEmergency: payload.isEmergency } : {}),
            ...(payload.contactNumber ? { contactNumber: payload.contactNumber.trim() } : {}),
            ...(payload.dateOfDonation ? { dateOfDonation: new Date(payload.dateOfDonation) } : {}),
            ...(payload.description ? { description: payload.description.trim() } : {}),
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.requestToDonorId ? { requestToDonorId: payload.requestToDonorId } : {}),
        },
        include: bloodRequestInclude,
    });
    return updatedRequest;
};
const softDeleteBloodRequest = async (id, currentUser) => {
    const bloodRequest = await prisma.bloodRequest.findFirst({
        where: {
            id,
            isDeleted: false,
        },
    });
    if (!bloodRequest) {
        throw new AppError(status.NOT_FOUND, "Blood request not found.");
    }
    await assertCanManageBloodRequest(bloodRequest, currentUser);
    const deletedRequest = await prisma.bloodRequest.update({
        where: {
            id,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
        include: bloodRequestInclude,
    });
    return deletedRequest;
};
export const BloodRequestService = {
    getBloodRequests,
    getBloodRequestById,
    createBloodRequest,
    updateBloodRequest,
    softDeleteBloodRequest,
};
