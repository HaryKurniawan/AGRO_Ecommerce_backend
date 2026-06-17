import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT as string, 10),
  apiPrefix: process.env.API_PREFIX,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["*"],
}));
