import dotenv from 'dotenv';
dotenv.config();
const splitCsv = (value) => (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const defaultDevOrigins = ["http://localhost:3000", "http://localhost:5000"];
export const envVar = {
    ENV_MODE: process.env.ENV_MODE || 'development',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || '',
    PORT: process.env.PORT || '5000',
    // JWT config
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 60 * 60), // 1 hour
    REFRESH_TOKEN_EXPIRES_IN: Number(process.env.REFRESH_TOKEN_EXPIRES_IN || 60 * 60 * 24 * 30), // 30 days
    BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: Number(process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN || 60 * 60 * 24 * 7), // 7 days
    // better-auth config
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
    // BETTER_AUTH_EXPIRES_IN: process.env.BETTER_AUTH_EXPIRES_IN || '7d',
    // BETTER_AUTH_UPDATE_AGE: process.env.BETTER_AUTH_UPDATE_AGE || '1d',
    BETTER_AUTH_EXPIRES_IN: 60 * 60 * 24 * 7, // 7 days in seconds
    BETTER_AUTH_UPDATE_AGE: 60 * 60 * 24, // 1 day in seconds
    // social providers
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',
    // urls 
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:5000/api/auth/better',
    frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendURL: process.env.BACKEND_URL || 'http://localhost:5000',
    CORS_ALLOWED_ORIGINS: splitCsv(process.env.CORS_ALLOWED_ORIGINS),
    BETTER_AUTH_TRUSTED_ORIGINS: splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    DEFAULT_DEV_ORIGINS: defaultDevOrigins,
    // Super admin config
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_PHONE: process.env.SUPER_ADMIN_PHONE,
    SUPER_ADMIN_PROFILE_PHOTO_URL: process.env
        .SUPER_ADMIN_PROFILE_PHOTO_URL,
    // SMTP config
    SMTP_SENDER: {
        USER: process.env.EMAIL_SENDER_SMTP_USER,
        PASSWORD: process.env.EMAIL_SENDER_SMTP_PASSWORD,
        HOST: process.env.EMAIL_SENDER_SMTP_HOST,
        PORT: parseInt(process.env.EMAIL_SENDER_SMTP_PORT, 10),
    },
    // Cloudinary config
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        API_KEY: process.env.CLOUDINARY_API_KEY,
        API_SECRET: process.env.CLOUDINARY_API_SECRET,
    },
};
