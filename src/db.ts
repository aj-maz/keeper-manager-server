import mongoose from "mongoose";

import parentLogger from "./lib/logger";

const logger = parentLogger.child({ module: "db" });

const connectDB = async () => {
  const connectLogger = logger.child({ method: "connect" });

  connectLogger.trace("Connecting to the database...");

  const {
    MONGODB_PROTOCOL,
    MONGODB_HOST,
    MONGODB_DATABASE_NAME,
    MONGODB_PORT,
  } = process.env;

  const dbUrl = `${MONGODB_PROTOCOL}://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE_NAME}`;

  try {
    await mongoose.connect(dbUrl);
    connectLogger.info(`Connected to the database: ${MONGODB_DATABASE_NAME}`);
  } catch (err) {
    connectLogger.error(`Error connecting to the database`, {
      err,
    });
    throw err;
  }
};

export default connectDB;
