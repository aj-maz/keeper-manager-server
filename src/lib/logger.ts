import pino from "pino";
const { ecsFormat } = require("@elastic/ecs-pino-format");

// Create a Pino logger instance
const logger = pino(
  {
    level: 10,
    ...ecsFormat({
      formatters: {
        // @ts-ignore
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
    }),
  },
  pino.destination("/app/logs/server.log")
);

export default logger;
