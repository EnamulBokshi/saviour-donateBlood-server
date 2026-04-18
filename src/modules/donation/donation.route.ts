import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import authCheck from "../../middleware/authCheck.js";
import requestValidator from "../../middleware/requestValidator.js";
import { DonationController } from "./donation.controller.js";
import { DonationValidation } from "./donation.validation.js";

const donationRouter = Router();

donationRouter.get(
  "/",
  authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.DONOR),
  DonationController.getDonations,
);
donationRouter.get(
  "/:id",
  authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.DONOR),
  DonationController.getDonationById,
);
donationRouter.post(
  "/",
  authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DONOR),
  requestValidator(DonationValidation.createDonationValidationSchema),
  DonationController.createDonation,
);
donationRouter.patch(
  "/:id",
  authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DONOR),
  requestValidator(DonationValidation.updateDonationValidationSchema),
  DonationController.updateDonation,
);
donationRouter.delete(
  "/:id",
  authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DONOR),
  DonationController.softDeleteDonation,
);

export default donationRouter;