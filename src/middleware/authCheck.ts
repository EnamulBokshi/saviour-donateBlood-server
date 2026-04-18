import { NextFunction, Request, Response } from "express";
import { UserRole, UserStatus } from "../generated/prisma/enums.js";
import { cookieUtils } from "../utils/cookie.js";
import prisma from "../config/prisma.js";
import AppError from "../helpers/errorHelpers/AppError.js";
import status from "http-status";
import { jwtUtils } from "../utils/jwt.js";
import { envVar } from "../config/envVar.js";

const getBearerToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) {
        return undefined;
    }

    const [type, token] = authorizationHeader.split(" ");
    if (type?.toLowerCase() !== "bearer" || !token) {
        return undefined;
    }

    return token;
};

export const  authCheck = (...roles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction)=> {
        try {
            // session token check
            console.log("Checking authentication for request to:", req.path);
            const sessionToken = cookieUtils.getBetterAuthSessionToken(req) || getBearerToken(req.headers.authorization);
            if(!sessionToken) {
                return res.status(401).json({
                    success: false,
                    message: "You need to sign in to continue."
                })
            }
            const sessionExists = await prisma.session.findFirst({
                where: {
                    token: sessionToken,
                    expiresAt: {
                        gt: new Date()
                    },
                
                },
                include: {
                    user: true
                }
                
            })
            if(sessionExists && sessionExists.user) {
                const user = sessionExists.user;

                const now = new Date();
                const expiresAt = sessionExists.expiresAt;
                const createdAt = sessionExists.createdAt;

                const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
                const timeLeft = expiresAt.getTime() - now.getTime();

                const percentageLeft = (timeLeft / sessionLifeTime) * 100;
                if(percentageLeft < 20) {
                    res.setHeader("X-Session-Refresh", 'true');
                    res.setHeader('X-Session-Expires-At', expiresAt.toDateString());

                    res.setHeader("X-Session-Remaining-Time", timeLeft.toString());
                    console.log(`Session for user ${user.email} is about to expire. Time left: ${timeLeft} ms (${percentageLeft.toFixed(2)}%)`);
                }

                if(user.status === UserStatus.BANNED) {
                    throw new AppError(status.UNAUTHORIZED, 'Your account has been suspended. Please contact support for more information.');
                }
                if(user.status === UserStatus.DELETED) {
                    throw new AppError(status.UNAUTHORIZED, 'Your account has been deleted. Please contact support for more information.');
                }
                if(roles.length > 0 && !roles.includes(user.role as UserRole)) {
                    throw new AppError(status.FORBIDDEN, "Forbidden: You don't have permission to access this resource");
                }

                req.user = {
                   userId: user.id,
                     email: user.email,
                     role: user.role as UserRole,
                }
            }

            
            const accessToken = cookieUtils.getCookie(req, "accessToken") || getBearerToken(req.headers.authorization);
            if(!accessToken) {
                throw new AppError(status.UNAUTHORIZED, "Your login session is missing. Please sign in again.");
            }

            const verifiedToken = jwtUtils.verifyToken(accessToken, envVar.ACCESS_TOKEN_SECRET as string);
            if(!verifiedToken.success){
                throw new AppError(status.UNAUTHORIZED, "Your session has expired. Please sign in again.");
            }
            
            if(verifiedToken.data!.role && roles.length > 0 && !roles.includes(verifiedToken.data!.role as UserRole)) {
                throw new AppError(status.FORBIDDEN, "Forbidden: You don't have permission to access this resource");
            }
            
            // Ensure req.user is always set from access token if not already set from session
            if (!req.user) {
                req.user = {
                    userId: verifiedToken.data!.userId,
                    email: verifiedToken.data!.email,
                    role: verifiedToken.data!.role as UserRole,
                };
            }
            
            console.log("Authentication successful for user:", verifiedToken.data!.email);
            next();
        } catch (error) {
            next(error)
        }
    }
}


export default authCheck;