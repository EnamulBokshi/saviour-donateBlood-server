import { Router } from "express";
import { AuthRoute } from "../modules/auth/auth.route.js";
import donorRouter from "../modules/donor/donor.route.js";
import donationRouter from "../modules/donation/donation.route.js";
import bloodRequestRouter from "../modules/bloodRequest/bloodRequest.route.js";

const indexRouter:Router = Router();

indexRouter.use("/auth", AuthRoute)
indexRouter.use("/donors", donorRouter)
indexRouter.use("/donations", donationRouter)
indexRouter.use("/blood-requests", bloodRequestRouter)

export default indexRouter;