import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import qs from 'qs';
import path from 'node:path';
import { envVar } from './config/envVar';
import indexRouter from './route';

const app:Application = express();

app.set("query parser", (str:string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src/views"));

app.use(cors({
    origin: [envVar.frontendURL, envVar.backendURL, envVar.BETTER_AUTH_URL, "http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// routes
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ message: "Server is healthy",
        request:{
            method: req.method,
            url: req.url,
            ip: req.ip,
           
        }
     });
})

app.use("/api/v1", indexRouter);



export default app;