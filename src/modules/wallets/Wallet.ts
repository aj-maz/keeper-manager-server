import EthereumWallet from "ethereumjs-wallet";
import path from "path";
import fs from "fs";
import { ethers } from "ethers";

import { filePath, writeWalletFiles, walletsPath } from "../files";

class Wallet {
  address: string | undefined;
  path: string | undefined;
  keystore: string = walletsPath;

  constructor() {}

  generateNewWallet() {}

  async load(address: string) {
    this.address = address;
  }

  async generateKeyPassFile(privateKey: string, password: string) {
    const privateKeyBuffer = Buffer.from(privateKey.substring(2), "hex");
    const wallet = EthereumWallet.fromPrivateKey(privateKeyBuffer);
    const keystore = await wallet.toV3String(password);
    const keyObject = JSON.parse(keystore);
    this.path = writeWalletFiles({
      address: keyObject.address,
      keystore,
      password,
    });
    this.address = keyObject.address;
  }
}

export default Wallet;
