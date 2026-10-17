import { PrismaClient } from "../src/generated/prisma/index.js";
const db = new PrismaClient();
const jobs = await db.job.findMany({ where: { slug: "ebay" }, select: { id: true, title: true, location: true, createdAt: true, isActive: true } });
jobs.filter(j => j.title.includes("P&A")).forEach(j => console.log(JSON.stringify(j)));
await db.$disconnect();
