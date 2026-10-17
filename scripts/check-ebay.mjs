import { PrismaClient } from "../src/generated/prisma/index.js";
const db = new PrismaClient();
const jobs = await db.job.findMany({ where: { slug: "ebay", isActive: true }, orderBy: { createdAt: "desc" }, select: { title: true, location: true, createdAt: true } });
console.log("eBay active jobs in DB:", jobs.length);
jobs.forEach(j => console.log(j.createdAt + " | " + j.title + " | " + j.location));
await db.$disconnect();
