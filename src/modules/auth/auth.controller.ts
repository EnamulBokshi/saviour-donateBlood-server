import status from "http-status";
import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import AppError from "../../helpers/errorHelpers/AppError.js";
import catchAsync from "../../helpers/catchAsync.js";
import { sendResponse } from "../../helpers/sendResponse.js";
import { cookieUtils } from "../../utils/cookie.js";
import { tokenUtils } from "../../utils/token.js";
import { envVar } from "../../config/envVar.js";

const isProduction = envVar.NODE_ENV === "production";
const cookieSameSite: "lax" | "none" = isProduction ? "none" : "lax";

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

const resolveRefreshToken = (req: Request) => {
  return (
    req.cookies?.refreshToken ||
    getBearerToken(req.headers.authorization) ||
    req.body?.refreshToken
  );
};

const resolveSessionToken = (req: Request) => {
  return (
    cookieUtils.getBetterAuthSessionToken(req) ||
    getBearerToken(req.headers.authorization) ||
    req.body?.sessionToken
  );
};

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body?.data ? JSON.parse(req.body.data) : req.body;
  const imagePath = req.file?.path;

  const data = await AuthService.registerUser({
    ...payload,
    ...(imagePath ? { imageFile: req.file } : {}),
  });

  const { accessToken, refreshToken, token, ...rest } = data;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  if (token) {
    tokenUtils.setBetterAuthSessionCookie(res, token);
  }

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Your account has been created successfully.",
    data: {
      token: token || null,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const data = await AuthService.loginUser(payload);
  const { accessToken, refreshToken, token, ...rest } = data;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  if (token) {
    tokenUtils.setBetterAuthSessionCookie(res, token);
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "You have signed in successfully.",
    data: {
      token: token || null,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(status.UNAUTHORIZED, "Please sign in to continue.");
  }

  const data = await AuthService.getMe(req.user);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile loaded successfully.",
    data,
  });
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = resolveRefreshToken(req);
  const sessionToken = resolveSessionToken(req);

  if (!refreshToken) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Refresh token not found. Please sign in again.",
    );
  }

  if (!sessionToken) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Session token not found. Please sign in again.",
    );
  }

  const result = await AuthService.getNewToken(refreshToken, sessionToken);
  const {
    accessToken,
    refreshToken: newRefreshToken,
    sessionToken: newSessionToken,
  } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, newSessionToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your session was refreshed successfully.",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionToken: newSessionToken,
    },
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = resolveSessionToken(req);

  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Please sign in to change your password.");
  }

  const result = await AuthService.changePassword(req.body, sessionToken);
  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  if (token) {
    tokenUtils.setBetterAuthSessionCookie(res, token);
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your password has been changed successfully.",
    data: {
      ...result,
      accessToken,
      refreshToken,
      token: token || null,
    },
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = resolveSessionToken(req);

  if (!sessionToken) {
    throw new AppError(status.BAD_REQUEST, "No active session found to sign out.");
  }

  await AuthService.logoutUser(sessionToken);

  cookieUtils.clearCookie(res, "accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: "/",
  });

  cookieUtils.clearCookie(res, "refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: "/",
  });

  cookieUtils.clearBetterAuthSessionCookies(res, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: "/",
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "You have been signed out successfully.",
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { otp, email } = req.body;
  await AuthService.verifyEmail(otp, email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your email has been verified successfully.",
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.resendVerificationOtp(email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "A new verification code has been sent to your email.",
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.forgetPassword(email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "If your account exists, a password reset code has been sent to your email.",
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  await AuthService.resetPassword({ email, otp, newPassword });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your password has been reset successfully. Please sign in again.",
  });
});

const updateProfileImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(status.UNAUTHORIZED, "Please sign in to update your profile image.");
  }

  if (!req.file) {
    throw new AppError(status.BAD_REQUEST, "Please upload an image file.");
  }

  const updatedUser = await AuthService.updateProfileImage(req.user.userId, req.file);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your profile image has been updated successfully.",
    data: updatedUser,
  });
});

export const AuthController = {
  loginUser,
  registerUser,
  getNewToken,
  getMe,
  changePassword,
  logoutUser,
  verifyEmail,
  resendOtp,
  forgetPassword,
  resetPassword,
  updateProfileImage,
};
