import pino from "pino";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import path from "path";
import fs from "fs";

dayjs.extend(utc);
dayjs.extend(timezone);

const baseLogDir = path.join("logs");
const appLogDir = path.join(baseLogDir, "app");
const errorLogDir = path.join(baseLogDir, "error");
for (const d of [baseLogDir, appLogDir, errorLogDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Configure Pino transport for file, error file, and pretty console
const transport = pino.transport({
  targets: [
    {
      target: "pino-roll",
      options: {
        file: path.join(appLogDir, 'app'),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        extension: ".log",
        mkdir: true,
      },
      level: "info",
    },
    {
      target: "pino-roll",
      options: {
        file: path.join(errorLogDir, 'error'),
        frequency: "daily",
        dateFormat: "yyyy-MM-dd",
        extension: ".log",
        mkdir: true,
      },
      level: "error",
    },
    {
      target: "pino-pretty",
      options: { colorize: true },
      level: "info",
    },
  ],
});

// Custom timestamp to GMT+7
const logger = pino(
  {
    timestamp: () =>
      `,"time":"${dayjs()
        .tz("Asia/Bangkok")
        .format("YYYY-MM-DD HH:mm:ss.SSS")}"`,
  },
  transport
);

export default logger;
export { logger };
