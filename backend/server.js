import dns from "dns";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import mongoose from "mongoose";
import createApp from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const REQUIRED_ENV = ["GROQ_API_KEY", "MONGODB_URI", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

// Some networks refuse the SRV lookups mongodb+srv needs. Set DNS_SERVERS= (empty) to use the system resolver.
const dnsServers = (process.env.DNS_SERVERS ?? "8.8.8.8,1.1.1.1")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

const PORT = process.env.PORT || 5000;

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 1,
});

const app = createApp({ aiClient: client });

await connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const shutdown = () => {
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
