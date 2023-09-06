import UserModel from "../../models/user.model";
import { bufferToHex } from "ethereumjs-util";
import { recoverPersonalSignature } from "eth-sig-util";

const addUser = async (address: string) => {
  if (!(await get(address))) {
    const user = new UserModel({ address: address.toLowerCase() });
    return await user.save();
  }
};

const generateNonce = async (address: string) => {
  return await UserModel.updateOne(
    { address: address.toLowerCase() },
    { $set: { nonce: Math.floor(Math.random() * 1000000) } }
  );
};

const getAll = async () => {
  return await UserModel.find({});
};

const get = async (address: string) => {
  return await UserModel.findOne({ address: address.toLowerCase() });
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
    return true;
  } else {
    return false;
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
