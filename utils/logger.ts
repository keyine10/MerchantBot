import pino from "pino";
import path from "path";

// Ensure logs directory exists
import fs from "fs";
const logDir = path.join(__dirname, "../logs");
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

const logger = pino(transport);

export default logger;

