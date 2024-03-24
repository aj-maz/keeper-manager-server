import path from "path";
import fs from "fs";
import mongoose from "mongoose";

import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "files",
});

export const filePath = path.join(__dirname, "..", "..", "..", "files");
export const walletsPath = path.join(filePath, "wallets");
export const containersPath = path.join(filePath, "containers");

export const mkdirFilePath = () => {
  logger.trace("making directory file path", {
    filePath,
  });
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
    logger.info("file path directory created", {
      filePath,
    });
  } else {
    logger.trace("file path directory existed so ignoring the creation", {
      filePath,
    });
  }
};

export const mkdirWalletPath = () => {
  mkdirFilePath();
  logger.trace("making directory wallet path", {
    walletsPath,
  });
  if (!fs.existsSync(walletsPath)) {
    fs.mkdirSync(walletsPath);
    logger.info("wallet path directory created", {
      walletsPath,
    });
  } else {
    logger.trace("wallet path directory existed so ignoring the creation", {
      walletsPath,
    });
  }
};

export const mkdirContainerPath = () => {
  mkdirFilePath();
  logger.trace("making directory container path", {
    filePath,
  });
  if (!fs.existsSync(containersPath)) {
    fs.mkdirSync(containersPath);
    logger.info("container path directory created", {
      filePath,
    });
  } else {
    logger.trace("container path directory existed so ignoring the creation", {
      filePath,
    });
  }
};

export const getCIDFile = (keeperId: mongoose.Types.ObjectId) => {
  logger.trace("getting CID file", {
    keeperId,
  });
  mkdirContainerPath();
  return path.join(containersPath, `./cid-${keeperId}`);
};

export const getLogsFile = (keeperId: mongoose.Types.ObjectId) => {
  mkdirContainerPath();
  const logsPath = path.join(containersPath, `./${keeperId}.logs`);
  if (!fs.existsSync(logsPath)) {
    fs.writeFileSync(logsPath, "");
  }
  return logsPath;
};

interface writeWalletFileInput {
  address: string;
  keystore: string;
  password: string;
}

export const getWalletFileName = (address: string) => `./key-${address}.json`;
export const getPassFileName = (address: string) => `./${address}.pass`;

export const getWalletFile = (address: string) => {
  logger.trace("getting wallet file", {
    address,
    method: "getWalletFile",
  });
  const walletPath = path.join(walletsPath, getWalletFileName(address));
  logger.trace("wallet file path founded", {
    address,
    walletPath,
    method: "getWalletFile",
  });
  return fs.readFileSync(walletPath);
};

export const writeWalletFiles = ({
  address,
  keystore,
  password,
}: writeWalletFileInput) => {
  logger.trace("writing wallet files", {
    address,
    method: "writeWalletFiles",
  });
  mkdirWalletPath();
  const walletPath = path.join(walletsPath, getWalletFileName(address));
  const passPath = path.join(walletsPath, getPassFileName(address));
  logger.trace("writing wallet files", {
    address,
    method: "writeWalletFiles",
  });
  fs.writeFileSync(walletPath, keystore);
  logger.trace("wrote wallet keystore", {
    address,
    walletPath,
    method: "writeWalletFiles",
  });
  fs.writeFileSync(passPath, password);
  logger.trace("wrote wallet pass", {
    address,
    passPath,
    method: "writeWalletFiles",
  });
  return walletPath;
};
