export enum KeeperStatus {
  INITIALIZING,
  PREPARING,
  RUNNING,
  STOPPING,
  FAILED,
  STOPPED,
  RECOVERING,
}

export interface KeeperCreationInput {
  system: string;
  network: string;
  collateral: string;
  privateKey: string;
  options: string[];
}

export interface IKeeper {
  network: string;
  system: string;
  collateral: string;
  options: [string];
  wallet: string;
  status: KeeperStatus;
  containerId: string | undefined;
  tries: number;
  serviceName: string;
}

export interface KeeperBalances {
  native: bigint;
  system: bigint;
  collateral: bigint;
  systemCoinJoin: bigint;
  collateralCoinJoin: bigint;
}
