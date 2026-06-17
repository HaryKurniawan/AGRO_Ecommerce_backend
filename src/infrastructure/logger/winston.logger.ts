import * as winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, context, ...meta }) => {
    const ctx = context ? `[${context}]` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${ctx} ${message}${stack ? `\n${stack}` : ""}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  defaultMeta: { service: "agro-api" },
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === "production"
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
};

export const logger = winston.createLogger(winstonConfig);
