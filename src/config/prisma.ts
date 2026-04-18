import dotenv from 'dotenv';
import { envVar } from './envVar.js';
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../generated/prisma/client.js"
dotenv.config();

const connectionString = envVar.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		"Missing DATABASE_URL. Set it in your environment variables so Prisma can connect to the database.",
	);
}

const adapter = new PrismaPg({
connectionString,
});


const prisma = new PrismaClient({adapter});


export default prisma;
