import mongoose from "mongoose";

const DB_NAME = "geb_keepers_controller_1";

const connectDB = async () => {
  try {
    await mongoose.connect(`mongodb://127.0.0.1:27017/${DB_NAME}`);
    console.log("db connected", DB_NAME);
  } catch (err) {
    console.log(err);
  }
};

export default connectDB;
