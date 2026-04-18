# Saviour Server

Backend API for the Saviour blood donation platform.

## Overview

This service provides:

- Email/password authentication
- Role-based signup for `USER` and `DONOR`
- Donor profile creation during signup
- Email verification OTP
- Forgot password OTP flow
- Password change and reset
- Profile image upload/update
- Access token, refresh token, and Better Auth session support

The API is designed to work well with both web clients and Flutter mobile apps.

## Base URL

Local development:

- `http://localhost:5000/api/v1`

Production:

- Use your deployed Vercel or server URL with the same `/api/v1` prefix.

## Tech Stack

- Express
- TypeScript
- Prisma
- Better Auth
- Zod validation
- Cloudinary for images
- Nodemailer + EJS for email templates

## Getting Started

### Install

```bash
pnpm install
```

### Generate Prisma Client

```bash
pnpm generate
```

### Run in Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Environment Variables

Minimum required variables:

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `ENV_MODE`
- `JWT_SECRET`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `FRONTEND_URL`
- `BACKEND_URL`

Email and Cloudinary:

- `EMAIL_SENDER_SMTP_USER`
- `EMAIL_SENDER_SMTP_PASSWORD`
- `EMAIL_SENDER_SMTP_HOST`
- `EMAIL_SENDER_SMTP_PORT`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

OAuth optional:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

## Authentication Model

The app uses a hybrid auth approach:

1. Better Auth session token
2. Access token for request authorization
3. Refresh token for renewal

Supported token locations:

- Cookies
- `Authorization: Bearer <token>` header
- JSON body for refresh endpoints

This makes the API suitable for Flutter apps, where cookie handling can be inconsistent.

## Roles

- `USER`
- `DONOR`
- `ADMIN`
- `SUPER_ADMIN`

Signup is currently intended for `USER` and `DONOR`.

## Auth API Reference

### 1. Sign Up

`POST /api/v1/auth/sign-up/email`

Creates a new account.

#### Content Type

`multipart/form-data`

#### Fields

- `data` — JSON string with signup data
- `image` — optional profile image file

#### Example `data` for USER

```json
{
  "name": "Enamul",
  "email": "enamul@example.com",
  "password": "Password123!",
  "role": "USER"
}
```

#### Example `data` for DONOR

```json
{
  "name": "Donor User",
  "email": "donor@example.com",
  "password": "Password123!",
  "role": "DONOR",
  "donorProfile": {
    "fullName": "Donor User",
    "age": 28,
    "bloodGroup": "O_POSITIVE",
    "contactNumber": "+8801700000000",
    "address": "Dhaka",
    "lastDonationDate": "2026-01-15T00:00:00.000Z"
  }
}
```

#### Donor profile is required for `DONOR`

If `role` is `DONOR`, the `donorProfile` object is required.

#### Response

Returns:

- user data
- donor profile data when applicable
- access token
- refresh token
- Better Auth session token

#### Notes

- Signup is not blocked if profile image upload fails.
- A welcome email is sent after successful signup.

---

### 2. Sign In

`POST /api/v1/auth/sign-in/email`

#### Body

```json
{
  "email": "enamul@example.com",
  "password": "Password123!"
}
```

#### Response

Returns:

- user/session info
- access token
- refresh token
- Better Auth session token

---

### 3. Get Current User

`GET /api/v1/auth/me`

#### Authorization

Use either:

- `Authorization: Bearer <accessToken>`
- or authenticated cookies

#### Response

Returns the current user profile, including donor profile when available.

---

### 4. Refresh Token

`POST /api/v1/auth/refresh-token`

#### Body

```json
{
  "refreshToken": "your-refresh-token",
  "sessionToken": "your-better-auth-session-token"
}
```

#### Notes

- This endpoint is Flutter-friendly.
- It accepts refresh tokens from body, header, or cookies.
- It returns a new access token and refresh token.

---

### 5. Change Password

`POST /api/v1/auth/change-password`

#### Authorization

`Authorization: Bearer <accessToken>`

#### Body

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Notes

- Social login accounts cannot change password this way.
- Other active sessions may be revoked.

---

### 6. Logout

`POST /api/v1/auth/logout`

#### Authorization

`Authorization: Bearer <sessionToken or accessToken>`

#### Notes

- Clears cookies where applicable.
- Signs out the Better Auth session.

---

### 7. Verify Email

`POST /api/v1/auth/verify-email`

#### Body

```json
{
  "email": "enamul@example.com",
  "otp": "123456"
}
```

#### Notes

- Used after signup to verify email address.
- Verification OTP is sent by email.

---

### 8. Resend OTP

`POST /api/v1/auth/resend-otp`

#### Body

```json
{
  "email": "enamul@example.com"
}
```

#### Notes

- Resends verification OTP if email is not verified yet.

---

### 9. Forgot Password

`POST /api/v1/auth/forget-password`

#### Body

```json
{
  "email": "enamul@example.com"
}
```

#### Notes

- Sends a password reset OTP.
- Only available for email/password accounts.

---

### 10. Reset Password

`POST /api/v1/auth/reset-password`

#### Body

```json
{
  "email": "enamul@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}
```

#### Notes

- After successful reset, the server invalidates existing sessions.
- A password reset confirmation email is sent after success.

---

### 11. Update Profile Image

`PATCH /api/v1/auth/profile-image`

#### Authorization

`Authorization: Bearer <accessToken>`

#### Content Type

`multipart/form-data`

#### Fields

- `image` — image file

#### Notes

- The image is uploaded to Cloudinary after the request is authenticated.
- Profile update is not blocked if signup image upload fails.

## Auth Flow Summary

### Signup Flow

1. User submits signup form.
2. Server creates account.
3. If role is `DONOR`, donor profile is created.
4. Server attempts to upload profile image.
5. Server sends welcome email.
6. OTP verification email is sent by Better Auth.

### Login Flow

1. User logs in with email and password.
2. Server returns access token, refresh token, and session token.
3. Client stores tokens securely.

### Token Refresh Flow

1. Access token expires.
2. Client calls `/refresh-token` with refresh token and session token.
3. Server issues fresh tokens.

### Password Reset Flow

1. User requests forgot password OTP.
2. User submits OTP and new password.
3. Server resets password.
4. Server sends password reset confirmation email.

## Flutter Integration Guide

### Recommended Storage

Store tokens securely:

- `flutter_secure_storage` for access token, refresh token, and session token

Avoid plain shared preferences for sensitive tokens.

### Suggested Flutter Packages

- `dio` or `http`
- `flutter_secure_storage`
- `image_picker`
- `file_picker` if you allow PDF/image selection

### Signup Request in Flutter

Send signup as multipart form data.

Pseudo flow:

1. Build a JSON string for `data`
2. Attach the image file under `image`
3. POST to `/auth/sign-up/email`

#### Example payload structure

```json
{
  "data": "{\"name\":\"Enamul\",\"email\":\"enamul@example.com\",\"password\":\"Password123!\",\"role\":\"USER\"}"
}
```

### Login Request in Flutter

Send normal JSON.

Save returned values:

- `accessToken`
- `refreshToken`
- `sessionToken`

### Authenticated Requests

For protected endpoints, send:

```http
Authorization: Bearer <accessToken>
```

If cookies are available, the backend can also use them.

### Refresh Token in Flutter

When a request returns unauthorized or the access token expires:

1. Read stored refresh token and session token
2. Call `/auth/refresh-token`
3. Replace stored tokens with returned ones
4. Retry the original request

### Flutter Example: Refresh Token Logic

High-level flow:

```dart
final response = await dio.post(
  '$baseUrl/api/v1/auth/refresh-token',
  data: {
    'refreshToken': refreshToken,
    'sessionToken': sessionToken,
  },
);

await secureStorage.write(key: 'accessToken', value: response.data['data']['accessToken']);
await secureStorage.write(key: 'refreshToken', value: response.data['data']['refreshToken']);
await secureStorage.write(key: 'sessionToken', value: response.data['data']['sessionToken']);
```

### Flutter Example: Multipart Signup

```dart
final formData = FormData.fromMap({
  'data': jsonEncode({
    'name': 'Enamul',
    'email': 'enamul@example.com',
    'password': 'Password123!',
    'role': 'USER',
  }),
  'image': await MultipartFile.fromFile(imagePath),
});

final response = await dio.post(
  '$baseUrl/api/v1/auth/sign-up/email',
  data: formData,
);
```

### Flutter Example: Protected Request

```dart
final token = await secureStorage.read(key: 'accessToken');

final response = await dio.get(
  '$baseUrl/api/v1/auth/me',
  options: Options(
    headers: {
      'Authorization': 'Bearer $token',
    },
  ),
);
```

## Postman Collection

A ready-to-import Postman collection is included at:

- [postman/saviour-auth.collection.json](postman/saviour-auth.collection.json)

It contains:

- signup requests for `USER` and `DONOR`
- sign in
- me
- refresh token
- change password
- verify email
- resend OTP
- forgot password
- reset password
- update profile image
- logout

## Deployment Notes

### Vercel

The project includes:

- [vercel.json](vercel.json)
- [api/index.ts](api/index.ts)

This routes all requests to the Express app in serverless mode.

### Important

- Make sure environment variables are configured in Vercel.
- Prisma client generation must succeed during build.
- Cloudinary and SMTP settings must be present for image/email flows.

## Common Errors

### Image upload timeout

If Cloudinary is slow or unavailable, signup still completes. The profile image is optional and failure is logged.

### Invalid donor signup

If `role` is `DONOR`, provide `donorProfile`.

### Refresh token issues

Send both:

- `refreshToken`
- `sessionToken`

### Wrong password reset account type

Password reset only works for email/password accounts.

## Example Success Responses

### Signup

```json
{
  "success": true,
  "message": "Your account has been created successfully.",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "token": "..."
  }
}
```

### Login

```json
{
  "success": true,
  "message": "You have signed in successfully.",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "token": "..."
  }
}
```

## Project Structure

- `src/app.ts` — Express app configuration
- `src/server.ts` — runtime bootstrap
- `src/modules/auth` — auth controller/service/validation
- `src/templates` — email templates
- `postman` — API collection

## License

Internal project use.