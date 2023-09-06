import path from "path";
import fs from "fs";
import mongoose from "mongoose";

export const filePath = path.join(__dirname, "..", "..", "..", "files");
export const walletsPath = path.join(filePath, "wallets");
export const containersPath = path.join(filePath, "containers");

export const mkdirFilePath = () => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
};

export const mkdirWalletPath = () => {
  mkdirFilePath();
  if (!fs.existsSync(walletsPath)) {
    fs.mkdirSync(walletsPath);
  }
};

export const mkdirContainerPath = () => {
  mkdirFilePath();
  if (!fs.existsSync(containersPath)) {
    fs.mkdirSync(containersPath);
  }
};

export const getCIDFile = (keeperId: mongoose.Types.ObjectId) => {
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
  const walletPath = path.join(walletsPath, getWalletFileName(address));
  return fs.readFileSync(walletPath);
};

export const writeWalletFiles = ({
  address,
  keystore,
  password,
}: writeWalletFileInput) => {
  mkdirWalletPath();
  const walletPath = path.join(walletsPath, getWalletFileName(address));
  const passPath = path.join(walletsPath, getPassFileName(address));
  fs.writeFileSync(walletPath, keystore);
  fs.writeFileSync(passPath, password);
  return walletPath;
};
