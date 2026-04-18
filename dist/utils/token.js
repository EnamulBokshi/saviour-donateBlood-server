import { jwtUtils } from "./jwt.js";
import { envVar } from "../config/envVar.js";
import { cookieUtils } from "./cookie.js";
const isProduction = envVar.NODE_ENV === "production";
const cookieSameSite = isProduction ? "none" : "lax";
const getAccessToken = (payload) => {
    const accessToken = jwtUtils.createToken(payload, envVar.ACCESS_TOKEN_SECRET, { expiresIn: envVar.ACCESS_TOKEN_EXPIRES_IN });
    return accessToken;
};
const getRefreshToken = (payload) => {
    const refreshToken = jwtUtils.createToken(payload, envVar.REFRESH_TOKEN_SECRET, { expiresIn: envVar.REFRESH_TOKEN_EXPIRES_IN });
    return refreshToken;
};
const setAccessTokenCookie = (res, token) => {
    cookieUtils.setCookie(res, "accessToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        // Express cookie maxAge expects milliseconds.
        maxAge: envVar.ACCESS_TOKEN_EXPIRES_IN * 1000,
        path: "/"
    });
};
const setRefreshTokenCookie = (res, token) => {
    cookieUtils.setCookie(res, "refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        // 7d
        maxAge: envVar.REFRESH_TOKEN_EXPIRES_IN * 1000,
        path: "/"
    });
};
const setBetterAuthSessionCookie = (res, token) => {
    cookieUtils.setCookie(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: cookieSameSite,
        maxAge: envVar.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN * 1000,
        path: "/"
    });
};
export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setBetterAuthSessionCookie
};
