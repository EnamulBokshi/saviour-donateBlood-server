import status from "http-status";
import catchAsync from "../../helpers/catchAsync.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { sendResponse } from "../../helpers/sendResponse.js";
import { DonationService } from "./donation.service.js";
const getDonations = catchAsync(async (req, res) => {
    const result = await DonationService.getDonations(req.query, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: result.data,
        meta: result.meta,
        message: "Donations retrieved successfully",
    });
});
const getDonationById = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Donation id is required.");
    }
    const donation = await DonationService.getDonationById(id, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: donation,
        message: "Donation retrieved successfully",
    });
});
const createDonation = catchAsync(async (req, res) => {
    const donation = await DonationService.createDonation(req.body, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        data: donation,
        message: "Donation created successfully",
    });
});
const updateDonation = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Donation id is required.");
    }
    const donation = await DonationService.updateDonation(id, req.body, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: donation,
        message: "Donation updated successfully",
    });
});
const softDeleteDonation = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Donation id is required.");
    }
    const donation = await DonationService.softDeleteDonation(id, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: donation,
        message: "Donation deleted successfully",
    });
});
export const DonationController = {
    getDonations,
    getDonationById,
    createDonation,
    updateDonation,
    softDeleteDonation,
};
