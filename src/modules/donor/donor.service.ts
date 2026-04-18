import status from "http-status";
import prisma from "../../config/prisma.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { Donor, Prisma } from "../../generated/prisma/client.js";
import { UserRole } from "../../generated/prisma/enums.js";
import type { IRequestUser } from "../../types";
import { IQueryParams } from "../../types/query.interface.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";
import { donorFilterableFields, donorSearchableFields } from "./donor.constants.js";

type DonorUpdatePayload = {
  fullName?: string;
  age?: number;
  bloodGroup?: import("../../generated/prisma/enums.js").BloodGroup;
  contactNumber?: string;
  address?: string;
  lastDonationDate?: string | Date;
  isAvailable?: boolean;
  totalDonations?: number;
};

const donorInclude = {
  user: true,
  donations: true,
  bloodRequests: true,
} satisfies Prisma.DonorInclude;

const isAdminOrSuperAdmin = (role: IRequestUser["role"]) =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

const getDonors = async (query: IQueryParams) => {
  const baseQueryBuilder = new QueryBuilder<Donor, Prisma.DonorWhereInput, Prisma.DonorInclude>(
    prisma.donor,
    query,
    {
      filterableFields: donorFilterableFields,
      searchableFields: donorSearchableFields,
    },
  );

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

const getDonorById = async (id: string) => {
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

const assertCanManageDonor = (donor: { userId: string }, currentUser: IRequestUser) => {
  if (isAdminOrSuperAdmin(currentUser.role)) {
    return;
  }

  if (currentUser.role === UserRole.DONOR && donor.userId === currentUser.userId) {
    return;
  }

  throw new AppError(status.FORBIDDEN, "You are not allowed to modify this donor profile.");
};

const updateDonor = async (
  id: string,
  payload: DonorUpdatePayload,
  currentUser: IRequestUser,
) => {
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

const softDeleteDonor = async (id: string, currentUser: IRequestUser) => {
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