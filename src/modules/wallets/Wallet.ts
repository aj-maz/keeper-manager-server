import EthereumWallet from "ethereumjs-wallet";
import path from "path";
import fs from "fs";
import { ethers } from "ethers";

import { filePath, writeWalletFiles, walletsPath } from "../files";

import parentLogger from "../../lib/logger";

const logger = parentLogger.child({ module: "wallet" });

class Wallet {
  address: string | undefined;
  path: string | undefined;
  keystore: string = walletsPath;

  constructor() {
    const constructorLogger = logger.child({ method: "constructor" });
    constructorLogger.trace("Initializing wallet");

    // No specific initialization logic for the wallet constructor

    constructorLogger.debug("Wallet initialized");
  }

  generateNewWallet() {}

  async load(address: string) {
    const loadLogger = logger.child({ method: "load" });
    loadLogger.trace(`Loading wallet with address: ${address}`);

    this.address = address;
    loadLogger.debug(`Wallet loaded successfully with address: ${address}`);
  }

  async generateKeyPassFile(privateKey: string, password: string) {
    const generateLogger = logger.child({ method: "generateKeyPassFile" });
    generateLogger.trace(
      `Generating key/pass file for wallet with private key: ${privateKey}`
    );

    try {
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

      generateLogger.debug(
        `Key/pass file generated successfully for wallet with address: ${keyObject.address}`,
        {
          address: this.address,
        }
      );
    } catch (error) {
      generateLogger.error(`Error generating key/pass file`, {
        error,
      });
      throw error;
    }
  }
}

export default Wallet;
