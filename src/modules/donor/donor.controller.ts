import status from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { sendResponse } from "../../helpers/sendResponse.js";
import { DonorService } from "./donor.service.js";

const getDonors = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.getDonors(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    data: result.data,
    meta: result.meta,
    message: "Donors retrieved successfully",
  });
});

const getDonorById = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id) {
    throw new AppError(status.BAD_REQUEST, "Donor id is required.");
  }

  const donor = await DonorService.getDonorById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    data: donor,
    message: "Donor retrieved successfully",
  });
});

const updateDonor = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id) {
    throw new AppError(status.BAD_REQUEST, "Donor id is required.");
  }

  const donor = await DonorService.updateDonor(id, req.body, req.user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    data: donor,
    message: "Donor updated successfully",
  });
});

const softDeleteDonor = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id) {
    throw new AppError(status.BAD_REQUEST, "Donor id is required.");
  }

  const donor = await DonorService.softDeleteDonor(id, req.user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    data: donor,
    message: "Donor deleted successfully",
  });
});

export const DonorController = {
  getDonors,
  getDonorById,
  updateDonor,
  softDeleteDonor,
};