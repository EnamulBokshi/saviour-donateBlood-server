import dotenv from 'dotenv';
import { envVar } from './envVar';
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../generated/prisma/client"
dotenv.config();

const connectionString = envVar.DATABASE_URL;

const adapter = new PrismaPg({
connectionString,
});


const prisma = new PrismaClient({adapter});


export default prisma;
