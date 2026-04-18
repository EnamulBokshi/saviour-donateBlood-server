import express from "express";
import cors from "cors";
import qs from "qs";
import path from "node:path";
import cookieParser from "cookie-parser";
import { envVar } from "./config/envVar.js";
import indexRouter from "./route/index.js";
import { NotFoundMiddleware } from "./middleware/notFound.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
const app = express();
const isProduction = envVar.NODE_ENV === "production";
const configuredOrigins = isProduction
    ? envVar.CORS_ALLOWED_ORIGINS
    : [
        ...new Set([
            ...envVar.CORS_ALLOWED_ORIGINS,
            envVar.frontendURL,
            envVar.backendURL,
            ...envVar.DEFAULT_DEV_ORIGINS,
        ]),
    ];
const corsOriginValidator = (requestOrigin, callback) => {
    // Native mobile clients typically have no Origin header; allow them.
    if (!requestOrigin) {
        callback(null, true);
        return;
    }
    if (configuredOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
    }
    callback(new Error(`Origin ${requestOrigin} is not allowed by CORS`));
};
app.set("query parser", (str) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src/views"));
app.use(cors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to the Saviour API" });
});
// routes
app.get("/health", (req, res) => {
    res.status(200).json({
        message: "Server is healthy",
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
        },
    });
});
app.use("/api/v1", indexRouter);
app.use(NotFoundMiddleware);
app.use(globalErrorHandler);
export default app;
