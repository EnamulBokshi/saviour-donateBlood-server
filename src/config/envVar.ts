import dotenv from 'dotenv';

dotenv.config();

export const envVar = {
    ENV_MODE: process.env.ENV_MODE || 'development',
    DATABASE_URL: process.env.DATABASE_URL || '',
    PORT: process.env.PORT || '5000',

    // JWT config

    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

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

}