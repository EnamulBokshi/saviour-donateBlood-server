import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import authCheck from "../../middleware/authCheck.js";
import requestValidator from "../../middleware/requestValidator.js";
import { DonorController } from "./donor.controller.js";
import { DonorValidation } from "./donor.validation.js";

const donorRouter = Router();

donorRouter.get("/", DonorController.getDonors);
donorRouter.get("/:id", DonorController.getDonorById);
donorRouter.patch(
	"/:id",
	authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DONOR),
	requestValidator(DonorValidation.updateDonorValidationSchema),
	DonorController.updateDonor,
);
donorRouter.delete(
	"/:id",
	authCheck(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DONOR),
	DonorController.softDeleteDonor,
);

export default donorRouter;