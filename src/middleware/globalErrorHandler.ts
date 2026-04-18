import { NextFunction, Request, Response } from "express";

import status from "http-status";
import z from "zod";
import { envVar } from "../config/envVar.js";
import { Prisma } from "../generated/prisma/client.js";
import { IErrorResponse, IErrorSource } from "../types/error.types.js";
import { handlePrismaClientKnownRequestError, handlePrismaClientUnknownError, handlePrismaClientValidationError, handlerPrismaClientInitializationError, handlerPrismaClientRustPanicError } from "../helpers/errorHelpers/prismaError.js";
import zodErrorHelper from "../helpers/errorHelpers/zodErrorHelper.js";
import AppError from "../helpers/errorHelpers/AppError.js";

export const globalErrorHandler = async (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  void next;
  if (envVar.NODE_ENV === "development") {
    console.error("Error from global error handler:", err);
  }


  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "An unexpected error occurred";
  let stack = undefined;
  let errorSources: IErrorSource[] = [];

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaClientKnownRequestError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const simplifiedError = handlePrismaClientUnknownError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaClientValidationError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientRustPanicError) {
    const simplifiedError = handlerPrismaClientRustPanicError();
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    const simplifiedError = handlerPrismaClientInitializationError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof z.ZodError) {
    const zodErrorResponse = zodErrorHelper(err);
    statusCode = zodErrorResponse.statusCode;
    message =
      zodErrorResponse.message +
      `: ${zodErrorResponse.errorSources.map((source: IErrorSource) => `${source.message}`).join(", ")}`;
    errorSources = [...zodErrorResponse.errorSources];
    stack = err.stack;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  const errorResponse: IErrorResponse = {
    statusCode,
    success: false,
    message,
    errorSources,
    stack: envVar.NODE_ENV === "development" ? stack : undefined,
    error: envVar.NODE_ENV === "development" ? err : undefined,
  };

  res.status(statusCode).json(errorResponse);
};
