import status from "http-status";
import prisma from "../../config/prisma.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { Donation, Prisma } from "../../generated/prisma/client.js";
import { UserRole, DonationStatus } from "../../generated/prisma/enums.js";
import type { IRequestUser } from "../../types";
import { IQueryParams } from "../../types/query.interface.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import { donationFilterableFields, donationSearchableFields } from "./donation.constants.js";

type DonationUpdatePayload = {
  donationDate?: string | Date;
  status?: DonationStatus;
};

type DonationCreatePayload = {
  donorId: string;
  bloodRequestId: string;
  donationDate?: string | Date;
  status?: DonationStatus;
};

const donationInclude = {
  donor: {
    include: {
      user: true,
    },
  },
  bloodRequest: {
    include: {
      user: true,
      requestToDonor: true,
    },
  },
} satisfies Prisma.DonationInclude;

const isAdminOrSuperAdmin = (role: IRequestUser["role"]) =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

const getAccessWhere = async (currentUser: IRequestUser): Promise<Prisma.DonationWhereInput> => {
  if (isAdminOrSuperAdmin(currentUser.role)) {
    return { isDeleted: false };
  }

  if (currentUser.role === UserRole.DONOR) {
    const donor = await prisma.donor.findFirst({
      where: {
        userId: currentUser.userId,
        isDeleted: false,
      },
    });

    if (!donor) {
      throw new AppError(status.FORBIDDEN, "Donor profile not found for the current user.");
    }

    return {
      isDeleted: false,
      donorId: donor.id,
    };
  }

  return {
    isDeleted: false,
    bloodRequest: {
      userId: currentUser.userId,
      isDeleted: false,
    },
  };
};

const assertCanManageDonation = async (donation: { donorId: string; bloodRequest: { userId: string } }, currentUser: IRequestUser) => {
  if (isAdminOrSuperAdmin(currentUser.role)) {
    return;
  }

  if (currentUser.role === UserRole.DONOR) {
    const donor = await prisma.donor.findFirst({
      where: {
        userId: currentUser.userId,
        isDeleted: false,
      },
    });

    if (donor && donor.id === donation.donorId) {
      return;
    }
  }

  if (currentUser.role === UserRole.USER && donation.bloodRequest.userId === currentUser.userId) {
    return;
  }

  throw new AppError(status.FORBIDDEN, "You are not allowed to modify this donation.");
};

const getDonations = async (query: IQueryParams, currentUser: IRequestUser) => {
  const where = await getAccessWhere(currentUser);

  const queryBuilder = new QueryBuilder<Donation, Prisma.DonationWhereInput, Prisma.DonationInclude>(
    prisma.donation,
    query,
    {
      filterableFields: donationFilterableFields,
      searchableFields: donationSearchableFields,
    },
  );

  return await queryBuilder
    .filter()
    .where(where)
    .search()
    .include(donationInclude)
    .paginate()
    .sort()
    .execute();
};

const getDonationById = async (id: string, currentUser: IRequestUser) => {
  const donation = await prisma.donation.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: donationInclude,
  });

  if (!donation) {
    throw new AppError(status.NOT_FOUND, "Donation not found.");
  }

  await assertCanManageDonation(donation, currentUser);

  return donation;
};

const createDonation = async (payload: DonationCreatePayload, currentUser: IRequestUser) => {
  const donor = await prisma.donor.findFirst({
    where: {
      id: payload.donorId,
      isDeleted: false,
    },
  });

  if (!donor) {
    throw new AppError(status.NOT_FOUND, "Donor not found.");
  }

  const bloodRequest = await prisma.bloodRequest.findFirst({
    where: {
      id: payload.bloodRequestId,
      isDeleted: false,
    },
  });

  if (!bloodRequest) {
    throw new AppError(status.NOT_FOUND, "Blood request not found.");
  }

  if (currentUser.role === UserRole.DONOR) {
    const currentDonor = await prisma.donor.findFirst({
      where: {
        userId: currentUser.userId,
        isDeleted: false,
      },
    });

    if (!currentDonor || currentDonor.id !== donor.id) {
      throw new AppError(status.FORBIDDEN, "You can only create donations for your own donor profile.");
    }
  }

  if (bloodRequest.donationId) {
    throw new AppError(status.CONFLICT, "This blood request already has a donation record.");
  }

  if (bloodRequest.requestToDonorId && bloodRequest.requestToDonorId !== donor.id) {
    throw new AppError(status.BAD_REQUEST, "This blood request is assigned to a different donor.");
  }

  const donationDate = payload.donationDate ? new Date(payload.donationDate) : new Date();
  const statusValue = payload.status ?? DonationStatus.CONFIRMED;

  const result = await prisma.$transaction(async (transaction) => {
    const createdDonation = await transaction.donation.create({
      data: {
        donorId: donor.id,
        bloodRequestId: bloodRequest.id,
        donationDate,
        status: statusValue,
      },
      include: donationInclude,
    });

    await transaction.donor.update({
      where: { id: donor.id },
      data: {
        totalDonations: {
          increment: 1,
        },
        lastDonationDate: donationDate,
      },
    });

    await transaction.bloodRequest.update({
      where: { id: bloodRequest.id },
      data: {
        status: "FULFILLED",
        requestToDonorId: bloodRequest.requestToDonorId ?? donor.id,
      },
    });

    return createdDonation;
  });

  return result;
};

const updateDonation = async (
  id: string,
  payload: DonationUpdatePayload,
  currentUser: IRequestUser,
) => {
  const donation = await prisma.donation.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      bloodRequest: {
        select: {
          userId: true,
        },
      },
      donor: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!donation) {
    throw new AppError(status.NOT_FOUND, "Donation not found.");
  }

  await assertCanManageDonation(donation, currentUser);

  const updatedDonation = await prisma.donation.update({
    where: {
      id,
    },
    data: {
      ...(payload.donationDate ? { donationDate: new Date(payload.donationDate) } : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
    include: donationInclude,
  });

  return updatedDonation;
};

const softDeleteDonation = async (id: string, currentUser: IRequestUser) => {
  const donation = await prisma.donation.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      bloodRequest: {
        select: {
          userId: true,
        },
      },
      donor: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!donation) {
    throw new AppError(status.NOT_FOUND, "Donation not found.");
  }

  await assertCanManageDonation(donation, currentUser);

  const deletedDonation = await prisma.donation.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
    include: donationInclude,
  });

  return deletedDonation;
};

export const DonationService = {
  getDonations,
  getDonationById,
  createDonation,
  updateDonation,
  softDeleteDonation,
};