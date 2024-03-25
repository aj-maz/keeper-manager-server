import UserModel from "../../models/user.model";
import { bufferToHex } from "ethereumjs-util";
import { recoverPersonalSignature } from "eth-sig-util";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "user",
});

const addUser = async (address: string) => {
  const addUserLogger = logger.child({ method: "addUser" });
  addUserLogger.trace("Adding user");

  try {
    if (!(await get(address))) {
      addUserLogger.debug("Creating new user");
      const user = new UserModel({ address: address.toLowerCase() });
      return await user.save();
    } else {
      addUserLogger.debug("User already exists");
    }
  } catch (error) {
    addUserLogger.error("Error occurred while adding user", { error });
    throw error;
  }
};

const generateNonce = async (address: string) => {
  const generateNonceLogger = logger.child({ method: "generateNonce" });
  generateNonceLogger.trace("Generating nonce");

  try {
    const nonce = Math.floor(Math.random() * 1000000);
    const result = await UserModel.updateOne(
      { address: address.toLowerCase() },
      { $set: { nonce } }
    );
    generateNonceLogger.debug("Nonce generated", { nonce });
    return result;
  } catch (error) {
    generateNonceLogger.error("Error occurred while generating nonce", {
      error,
    });
    throw error;
  }
};

const getAll = async () => {
  const getAllLogger = logger.child({ method: "getAll" });
  getAllLogger.trace("Getting all users");

  try {
    const users = await UserModel.find({});
    getAllLogger.debug("Retrieved all users", { count: users.length });
    return users;
  } catch (error) {
    getAllLogger.error("Error occurred while getting all users", { error });
    throw error;
  }
};

const get = async (address: string) => {
  const getLogger = logger.child({ method: "get" });
  getLogger.trace("Getting user", { address });

  try {
    const user = await UserModel.findOne({ address: address.toLowerCase() });
    getLogger.debug("Retrieved user", { user });
    return user;
  } catch (error) {
    getLogger.error("Error occurred while getting user", { error });
    throw error;
  }
};

const verifySign = ({
  signature,
  publicAddress,
  nonce,
}: {
  signature: string;
  publicAddress: string;
  nonce: number;
}) => {
  const verifySignLogger = logger.child({ method: "verifySign" });
  verifySignLogger.trace("Verifying signature", { publicAddress, nonce });

  try {
    const msgBufferHex = bufferToHex(
      Buffer.from(
        `Signin to Keeper Manager Dashboard with nonce: ${nonce}`,
        "utf8"
      )
    );

    const address = recoverPersonalSignature({
      data: msgBufferHex,
      sig: signature,
    });

    if (address.toLowerCase() === publicAddress.toLowerCase()) {
      verifySignLogger.debug("Signature verified successfully");
      return true;
    } else {
      verifySignLogger.debug("Signature verification failed");
      return false;
    }
  } catch (error) {
    verifySignLogger.error("Error occurred while verifying signature", {
      error,
    });
    throw error;
  }
};

const Users = {
  addUser,
  generateNonce,
  getAll,
  get,
  verifySign,
};

export default Users;
