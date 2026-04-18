import {betterAuth} from "better-auth";
import {envVar} from "../config/envVar";
import {prismaAdapter} from "better-auth/adapters/prisma";
import prisma from "../config/prisma";
import { UserRole, UserStatus } from "../generated/prisma/browser";
import { bearer, emailOTP, oAuthProxy } from "better-auth/plugins";

const isProduction = envVar.ENV_MODE === "production";
const cookieSameSite = isProduction ? "none":"lax"
export const auth = betterAuth({
    baseURL: envVar.BETTER_AUTH_URL,
    secret: envVar.BETTER_AUTH_SECRET,
    trustedOrigins: isProduction ? [envVar.frontendURL, envVar.backendURL] : ["http://localhost:3000", "http://localhost:5000"],
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                default: UserRole.USER,
            },
            status: {
                type: "string",
                required: true,
                default: UserStatus.ACTIVE
            },
             isDeleted: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },
        deletedAt: {
          type: "date",
          required: false,
          defaultValue: null,
        }
        }
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },

    socialProviders: {
        google: {
            clientId: envVar.GOOGLE_CLIENT_ID,
            clientSecret: envVar.GOOGLE_CLIENT_SECRET,
            callbackURL: envVar.GOOGLE_CALLBACK_URL,

            mapProfileToUser: () => {
                return {
                    role: UserRole.USER,
                    status: UserStatus.ACTIVE,
                    isEmailVerified: true,
                    isDeleted: false,
                    deletedAt: null,

                }
            }
        }
    },
    emailVerification: {
        sendOnSignIn: false,
        sendOnSignUp: true,
        autoSignInAfterVerification: true
    },
    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({email, otp, type}) {
                // const user = await prisma.user.findUnique({where: {email}});
                // if(!user) return;

                // send otp to email using nodemailer or any other email service provider
                console.log(`Sending OTP ${otp} to email ${email} for ${type}`);
            }
        })
    ],
    session: {
        expiresIn: envVar.BETTER_AUTH_EXPIRES_IN,
        updateAge: envVar.BETTER_AUTH_UPDATE_AGE,
        cookieCache: {
            enabled: true,
            maxAge: envVar.BETTER_AUTH_EXPIRES_IN, // should be same as expiresIn
            
        }
    },

    advanced: {
        disableCSRFCheck: !isProduction, // disable CSRF check in development for easier testing, enable in production for security
        sessionToken: {
            name: "better-auth.session_token",
            attributes: {
                sameSite: cookieSameSite,
                secure: isProduction,
                httpOnly: true,
                path: "/"
            }
        }
    }
})