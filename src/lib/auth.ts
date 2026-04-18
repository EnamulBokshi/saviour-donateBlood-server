import {betterAuth} from "better-auth";
import {envVar} from "../config/envVar";

export const auth = betterAuth({
    database: envVar.DATABASE_URL,
    secret: envVar.BETTER_AUTH_SECRET,
    expiresIn: envVar.BETTER_AUTH_EXPIRES_IN,
})