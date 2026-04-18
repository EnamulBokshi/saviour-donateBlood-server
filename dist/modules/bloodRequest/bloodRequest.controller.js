import status from "http-status";
import catchAsync from "../../helpers/catchAsync.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import { sendResponse } from "../../helpers/sendResponse.js";
import { BloodRequestService } from "./bloodRequest.service.js";
const getBloodRequests = catchAsync(async (req, res) => {
    const result = await BloodRequestService.getBloodRequests(req.query, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: result.data,
        meta: result.meta,
        message: "Blood requests retrieved successfully",
    });
});
const getBloodRequestById = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Blood request id is required.");
    }
    const bloodRequest = await BloodRequestService.getBloodRequestById(id, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: bloodRequest,
        message: "Blood request retrieved successfully",
    });
});
const createBloodRequest = catchAsync(async (req, res) => {
    const bloodRequest = await BloodRequestService.createBloodRequest(req.body, req.user);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        data: bloodRequest,
        message: "Blood request created successfully",
    });
});
const updateBloodRequest = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Blood request id is required.");
    }
    const bloodRequest = await BloodRequestService.updateBloodRequest(id, req.body, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: bloodRequest,
        message: "Blood request updated successfully",
    });
});
const softDeleteBloodRequest = catchAsync(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new AppError(status.BAD_REQUEST, "Blood request id is required.");
    }
    const bloodRequest = await BloodRequestService.softDeleteBloodRequest(id, req.user);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        data: bloodRequest,
        message: "Blood request deleted successfully",
    });
});
export const BloodRequestController = {
    getBloodRequests,
    getBloodRequestById,
    createBloodRequest,
    updateBloodRequest,
    softDeleteBloodRequest,
};
