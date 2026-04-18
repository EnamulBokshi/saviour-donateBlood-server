import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import { envVar } from "../config/envVar";
import { Response } from "express";
import { cookieUtils } from "./cookie";

const isProduction = envVar.NODE_ENV === "production";
const cookieSameSite: "lax" | "none" = isProduction ? "none" : "lax";

const getAccessToken = (payload: JwtPayload) => {
    const accessToken = jwtUtils.createToken(payload, envVar.ACCESS_TOKEN_SECRET, {expiresIn: envVar.ACCESS_TOKEN_EXPIRES_IN} as  SignOptions)
    return accessToken;
}

const getRefreshToken = (payload: JwtPayload) => {
    const refreshToken = jwtUtils.createToken(payload, envVar.REFRESH_TOKEN_SECRET, {expiresIn: envVar.REFRESH_TOKEN_EXPIRES_IN} as SignOptions)
    return refreshToken;
}

const setAccessTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, "accessToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,

        // Express cookie maxAge expects milliseconds.
        maxAge:  envVar.ACCESS_TOKEN_EXPIRES_IN * 1000,
        path: "/"
    })
}
 

const setRefreshTokenCookie = (res: Response, token: string) => {
    
    cookieUtils.setCookie(res, "refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        // 7d
        maxAge: envVar.REFRESH_TOKEN_EXPIRES_IN * 1000,
        path: "/"

    })
}

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    
    cookieUtils.setCookie(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVar.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN * 1000,
        path: "/"
    })
}

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setBetterAuthSessionCookie
}