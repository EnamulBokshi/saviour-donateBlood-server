import { Router } from "express";
import { AuthRoute } from "../modules/auth/auth.route";

const indexRouter:Router = Router();

indexRouter.use("/auth", AuthRoute)

export default indexRouter;