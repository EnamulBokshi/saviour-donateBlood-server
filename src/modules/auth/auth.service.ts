import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../config/prisma";
import { envVar } from "../../config/envVar";
import AppError from "../../helpers/errorHelpers/AppError";
import { deleteFileCloudinary } from "../../config/cloudinary";
import { auth } from "../../lib/auth";
import { sendEmail } from "../../utils/email";
import { uploadFileToCloudinary } from "../../config/cloudinary";
import { tokenUtils } from "../../utils/token";
import { jwtUtils } from "../../utils/jwt";
import { IRequestUser } from "../../types";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import {
  IChangePasswordPayload,
  RegisterDonorProfilePayload,
  RegisterUserPayload,
} from "./auth.interface";

const assertAccountUsable = (userStatus: UserStatus, isDeleted: boolean) => {
  if (isDeleted || userStatus === UserStatus.DELETED) {
    throw new AppError(
      status.FORBIDDEN,
      "This account is no longer available. Please contact support if this is unexpected.",
    );
  }

  if (userStatus === UserStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account is currently restricted. Please contact support.",
    );
  }

  if (userStatus === UserStatus.INACTIVE) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account is currently inactive. Please verify your email or contact support.",
    );
  }
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const ensureDonorProfilePayload = (
  donorProfile: RegisterDonorProfilePayload | undefined,
) => {
  if (!donorProfile) {
    throw new AppError(
      status.BAD_REQUEST,
      "Donor profile details are required when you sign up as a donor.",
    );
  }

  return donorProfile;
};

const uploadImageWithTimeout = async (
  file: { buffer: Buffer; originalname: string },
  timeoutMs = 10000,
) => {
  const uploadPromise = uploadFileToCloudinary(file.buffer, file.originalname);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new AppError(status.REQUEST_TIMEOUT, "Image upload timed out.")), timeoutMs);
  });

  return Promise.race([uploadPromise, timeoutPromise]);
};

const registerUser = async (payload: RegisterUserPayload) => {
  const normalizedEmail = normalizeEmail(payload.email);
  const role = payload.role ?? UserRole.USER;

  if (role !== UserRole.USER && role !== UserRole.DONOR) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please choose a valid role: USER or DONOR.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new AppError(
      status.CONFLICT,
      "An account with this email already exists. Please sign in instead.",
    );
  }

  let signUpResult: Awaited<ReturnType<typeof auth.api.signUpEmail>>;
  try {
    signUpResult = await auth.api.signUpEmail({
      body: {
        name: payload.name.trim(),
        email: normalizedEmail,
        password: payload.password,
        image: payload.image,
        role,
        status: UserStatus.ACTIVE,
      },
    });
  } catch (error) {
    console.error("signUpEmail failed:", error);
    throw new AppError(
      status.BAD_REQUEST,
      "We could not create your account right now. Please check your details and try again.",
    );
  }

  if (!signUpResult?.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Account created partially, but we could not complete sign up. Please try again.",
    );
  }

  try {
    let donor = null;
    if (role === UserRole.DONOR) {
      const donorProfile = ensureDonorProfilePayload(payload.donorProfile);
      donor = await prisma.donor.create({
        data: {
          fullName: donorProfile.fullName.trim(),
          age: donorProfile.age,
          bloodGroup: donorProfile.bloodGroup,
          contactNumber: donorProfile.contactNumber.trim(),
          address: donorProfile.address.trim(),
          lastDonationDate: donorProfile.lastDonationDate
          ? new Date(donorProfile.lastDonationDate)
          : new Date(),
          userId: signUpResult.user.id,
        },
      });
    }

    const tokenPayload = {
      userId: signUpResult.user.id,
      email: signUpResult.user.email,
      name: signUpResult.user.name,
      role: signUpResult.user.role,
      emailVerified: signUpResult.user.emailVerified,
      isDeleted: signUpResult.user.isDeleted,
      status: signUpResult.user.status,
    };

    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    if (payload.imageFile) {
      try {
        const uploadedImage = await uploadImageWithTimeout(payload.imageFile, 10000);

        if (uploadedImage?.secure_url) {
          await prisma.user.update({
            where: { id: signUpResult.user.id },
            data: { image: uploadedImage.secure_url },
          });
        }
      } catch (error) {
        console.error("Signup image upload failed; continuing without profile image:", error);
      }
    }

    await sendEmail({
      to: signUpResult.user.email,
      subject: "Welcome to Saviour",
      template: "welcome-user",
      templateData: {
        name: signUpResult.user.name,
        role,
      },
    }).catch((error) => {
      // Welcome email delivery should not fail account creation.
      console.error("Failed to send welcome email:", error);
    });

    return {
      ...signUpResult,
      donor,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Failed to complete role profile setup:", error);

    await prisma.user.delete({
      where: {
        id: signUpResult.user.id,
      },
    });

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Your account could not be completed. Please try signing up again.",
    );
  }
};

const loginUser = async (payload: { email: string; password: string }) => {
  const normalizedEmail = normalizeEmail(payload.email);

  let loginResult: Awaited<ReturnType<typeof auth.api.signInEmail>>;
  try {
    loginResult = await auth.api.signInEmail({
      body: {
        email: normalizedEmail,
        password: payload.password,
      },
    });
  } catch (error) {
    console.error("signInEmail failed:", error);
    throw new AppError(
      status.UNAUTHORIZED,
      "The email or password you entered is not correct.",
    );
  }

  if (!loginResult?.user) {
    throw new AppError(
      status.UNAUTHORIZED,
      "The email or password you entered is not correct.",
    );
  }

  assertAccountUsable(loginResult.user.status as UserStatus, loginResult.user.isDeleted);

  const tokenPayload = {
    userId: loginResult.user.id,
    email: loginResult.user.email,
    name: loginResult.user.name,
    role: loginResult.user.role,
    emailVerified: loginResult.user.emailVerified,
    isDeleted: loginResult.user.isDeleted,
    status: loginResult.user.status,
  };

  const accessToken = tokenUtils.getAccessToken(tokenPayload);
  const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

  return {
    ...loginResult,
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const userRecord = await prisma.user.findUnique({
    where: {
      id: user.userId,
      isDeleted: false,
    },
    include: {
      donor: true,
    },
  });

  if (!userRecord) {
    throw new AppError(status.NOT_FOUND, "User account not found.");
  }

  assertAccountUsable(userRecord.status, userRecord.isDeleted);

  return userRecord;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  const session = await prisma.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Your session could not be found. Please sign in again.",
    );
  }

  assertAccountUsable(session.user.status, session.user.isDeleted);

  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    envVar.REFRESH_TOKEN_SECRET,
  );

  if (!verifiedRefreshToken.success) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Your refresh token is invalid or expired. Please sign in again.",
    );
  }

  const decoded = verifiedRefreshToken.data as JwtPayload;
  if (decoded.userId !== session.user.id) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Your session does not match this refresh token. Please sign in again.",
    );
  }

  const tokenPayload = {
    userId: decoded.userId,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
    emailVerified: decoded.emailVerified,
    isDeleted: decoded.isDeleted,
    status: decoded.status,
  };

  const accessToken = tokenUtils.getAccessToken(tokenPayload);
  const newRefreshToken = tokenUtils.getRefreshToken(tokenPayload);

  const updatedSession = await prisma.session.update({
    where: {
      token: sessionToken,
    },
    data: {
      expiresAt: new Date(
        Date.now() + envVar.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN * 1000,
      ),
      updatedAt: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionToken: updatedSession.token,
  };
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  const session = await auth.api.getSession({
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!session?.user) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Your session is not valid. Please sign in again.",
    );
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (account?.providerId && !["email", "credential"].includes(account.providerId)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Password change is not available for social sign-in accounts.",
    );
  }

  let result: Awaited<ReturnType<typeof auth.api.changePassword>>;
  try {
    result = await auth.api.changePassword({
      body: {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        revokeOtherSessions: true,
      },
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch (error) {
    console.error("changePassword failed:", error);
    throw new AppError(
      status.BAD_REQUEST,
      "Could not change password. Please verify your current password and try again.",
    );
  }

  const tokenPayload = {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    emailVerified: session.user.emailVerified,
    isDeleted: session.user.isDeleted,
    status: session.user.status,
  };

  const accessToken = tokenUtils.getAccessToken(tokenPayload);
  const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (sessionToken: string) => {
  return auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
};

const verifyEmail = async (otp: string, email: string) => {
  const normalizedEmail = normalizeEmail(email);

  let result: Awaited<ReturnType<typeof auth.api.verifyEmailOTP>>;
  try {
    result = await auth.api.verifyEmailOTP({
      body: {
        email: normalizedEmail,
        otp,
      },
    });
  } catch (error) {
    console.error("verifyEmailOTP failed:", error);
    throw new AppError(
      status.BAD_REQUEST,
      "The verification code is invalid or expired. Please request a new one.",
    );
  }

  if (result?.user?.emailVerified) {
    await prisma.user.update({
      where: {
        email: normalizedEmail,
      },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }
};

const resendVerificationOtp = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError(
      status.NOT_FOUND,
      "No account was found with this email address.",
    );
  }

  if (user.emailVerified) {
    throw new AppError(
      status.BAD_REQUEST,
      "This email is already verified. You can sign in now.",
    );
  }

  assertAccountUsable(user.status, user.isDeleted);

  await auth.api.sendVerificationOTP({
    body: {
      email: normalizedEmail,
      type: "email-verification",
    },
  });
};

const forgetPassword = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError(
      status.NOT_FOUND,
      "No account was found with this email address.",
    );
  }

  if (!user.emailVerified) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please verify your email before requesting a password reset.",
    );
  }

  assertAccountUsable(user.status, user.isDeleted);

  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (account?.providerId && !["email", "credential"].includes(account.providerId)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Password reset is not available for social sign-in accounts.",
    );
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email: normalizedEmail,
    },
  });
};

const resetPassword = async (payload: {
  email: string;
  otp: string;
  newPassword: string;
}) => {
  const normalizedEmail = normalizeEmail(payload.email);

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError(
      status.NOT_FOUND,
      "No account was found with this email address.",
    );
  }

  if (!user.emailVerified) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please verify your email before resetting your password.",
    );
  }

  assertAccountUsable(user.status, user.isDeleted);

  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (account?.providerId && !["email", "credential"].includes(account.providerId)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Password reset is not available for social sign-in accounts.",
    );
  }

  try {
    await auth.api.resetPasswordEmailOTP({
      body: {
        email: normalizedEmail,
        otp: payload.otp,
        password: payload.newPassword,
      },
    });
  } catch (error) {
    console.error("resetPasswordEmailOTP failed:", error);
    throw new AppError(
      status.BAD_REQUEST,
      "The OTP is invalid or expired. Please request a new password reset code.",
    );
  }

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Your Saviour password was changed",
    template: "password-reset-success",
    templateData: {
      name: user.name,
      changedAt: new Date().toISOString(),
    },
  }).catch((error) => {
    // Password reset should remain successful even if email delivery fails.
    console.error("Failed to send password reset success email:", error);
  });
};

const updateProfileImage = async (
  userId: string,
  file: { buffer: Buffer; originalname: string },
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User account not found.");
  }

  assertAccountUsable(user.status, user.isDeleted);

  const uploadedImage = await uploadImageWithTimeout(file, 15000).catch((error) => {
    throw new AppError(
      status.BAD_GATEWAY,
      error instanceof Error ? error.message : "Failed to upload profile image.",
    );
  });

  if (user.image && uploadedImage?.secure_url && user.image !== uploadedImage.secure_url) {
    await deleteFileCloudinary(user.image).catch((error) => {
      // Image cleanup should not fail the profile update flow.
      console.error("Failed to remove previous profile image:", error);
    });
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      image: uploadedImage?.secure_url,
      updatedAt: new Date(),
    },
  });
};

export const AuthService = {
  registerUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  resendVerificationOtp,
  forgetPassword,
  resetPassword,
  updateProfileImage,
};
