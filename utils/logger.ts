import pino from "pino";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import path from "path";
import fs from "fs";

dayjs.extend(utc);
dayjs.extend(timezone);

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure Pino transport for file, error file, and pretty console
const transport = pino.transport({
  targets: [
    {
      target: "pino/file",
      options: { destination: path.join(logDir, "app.log"), mkdir: true },
      level: "info",
    },
    {
      target: "pino/file",
      options: { destination: path.join(logDir, "error.log"), mkdir: true },
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
    level: process.env.LOG_LEVEL || "info",
    timestamp: () =>
      `,"time":"${dayjs().tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss.SSS")}"`,
  },
  transport
);

export default logger;
export { logger };

