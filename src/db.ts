import mongoose from "mongoose";

const connectDB = async () => {
  const {
    MONGODB_PROTOCOL,
    MONGODB_HOST,
    MONGODB_DATABASE_NAME,
    MONGODB_PORT,
  } = process.env;

  const dbUrl = `${MONGODB_PROTOCOL}://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE_NAME}`;

  try {
    await mongoose.connect(dbUrl);
    console.log("db connected", MONGODB_DATABASE_NAME);
  } catch (err) {
    console.log(err);
  }
};

export default connectDB;
