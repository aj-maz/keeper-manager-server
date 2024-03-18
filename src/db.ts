import mongoose from "mongoose";
import { Logger } from "pino";

export interface MongoDBConnectionParams {
  protocol: string;
  host: string;
  database: string;
  port: string;
}

export const getMongoDBUrl = ({
  protocol,
  host,
  database,
  port,
}: MongoDBConnectionParams) => {
  const dbUrl = `${protocol}://${host}:${port}/${database}`;
  return dbUrl;
};

export const connectDB = async (
  dbUrl: string,
  database: string,
  logger: Logger
) => {
  logger.trace(`Preparing to connect to the MongoDB database: ${database}`);

  try {
    logger.debug(`Attempting to connect to the mongodb database: ${database}`);
    const connection = await mongoose.connect(dbUrl);
    logger.info(`Connected to the mongodb database: ${database}`);

    return {
      params: {
        dbUrl,
        database,
        logger,
      },
      connection,
    };
  } catch (err) {
    logger.error(`Error connecting to the database`, {
      error: err,
    });
    throw err; // Re-throw the error to propagate it upwards
  }
};

export const connectorFactory = (
  { protocol, host, database, port }: MongoDBConnectionParams,
  logger: Logger
) => {
  const dbUrl = getMongoDBUrl({ protocol, host, database, port });

  const mdbLogger = logger.child({
    contenxt: "database",
    variant: "mongodb",
    functionality: "connection",
    dbName: database,
    dbUrl,
  });

  return () => connectDB(dbUrl, database, mdbLogger);
};
