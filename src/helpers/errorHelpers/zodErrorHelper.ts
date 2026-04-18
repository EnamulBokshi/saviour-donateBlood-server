import z from "zod";

import status from "http-status";
import { IErrorResponse, IErrorSource } from "../../types/error.types.js";

const zodErrorHelper = (err: z.ZodError):IErrorResponse => {

    const statusCode = status.BAD_REQUEST;
    const message = "Zod Validation error";
    const errorSources: IErrorSource[] = [];
    err.issues.forEach((issue)=> {
      errorSources.push({
        path: issue.path.join(' '),
        message: issue.message
      })
    })
    return {
        success: false,
        statusCode,
        message,
        errorSources

    }
}

export default zodErrorHelper;