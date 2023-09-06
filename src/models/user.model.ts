import mongoose from "mongoose";

import { IUser } from "../types";

const UserSchema = new mongoose.Schema<IUser>({
  address: {
    type: String,
    required: true,
  },
  nonce: {
    type: Number,
    required: false,
  },
});

const UserModel = mongoose.model("user", UserSchema);

export default UserModel;
