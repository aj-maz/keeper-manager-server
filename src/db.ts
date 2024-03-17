import mongoose from "mongoose";

import logger from "@lib/logger";

const connectDB = async () => {
  const {
    MONGODB_PROTOCOL,
    MONGODB_HOST,
    MONGODB_DATABASE_NAME,
    MONGODB_PORT,
  } = process.env;

  const dbUrl = `${MONGODB_PROTOCOL}://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE_NAME}`;

  const mdbLogger = logger.child({
    contenxt: "databse",
    variant: "mongodb",
    functionality: "connection",
    dbName: MONGODB_DATABASE_NAME,
    dbUrl,
  });

  mdbLogger.trace(
    `Preparing to connect to the MongoDB database: ${MONGODB_DATABASE_NAME}`
  );

  try {
    mdbLogger.debug(
      `Attempting to connect to the mongodb database: ${MONGODB_DATABASE_NAME}`
    );
    await mongoose.connect(dbUrl);
    mdbLogger.info(
      `Connected to the mongodb database: ${MONGODB_DATABASE_NAME}`
    );
  } catch (err) {
    mdbLogger.error(`Error connecting to the database`, {
      error: err,
    });
    throw err; // Re-throw the error to propagate it upwards
  }
};

export default connectDB;
