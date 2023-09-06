import mongoose from "mongoose";

import { IKeeper, KeeperStatus } from "../types";

const KeeperSchema = new mongoose.Schema<IKeeper>(
  {
    system: {
      type: "string",
      required: true,
    },
    network: {
      type: "string",
      required: true,
    },
    collateral: {
      type: "string",
      required: true,
    },
    wallet: {
      type: "string",
      required: true,
    },
    status: {
      type: "number",
      default: KeeperStatus.INITIALIZING,
      enum: [
        KeeperStatus.INITIALIZING,
        KeeperStatus.PREPARING,
        KeeperStatus.RUNNING,
        KeeperStatus.STOPPING,
        KeeperStatus.FAILED,
        KeeperStatus.STOPPED,
        KeeperStatus.RECOVERING,
      ],
    },
    options: {
      type: ["string"],
    },
    containerId: {
      type: "string",
    },
    tries: {
      type: "number",
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const KeeperModel = mongoose.model("keeper", KeeperSchema);

export default KeeperModel;
