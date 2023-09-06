import { DecodedParam } from "./TransactionTypes";

export interface NotificationPayload {
  context: string;
  name: string;
  params: Array<DecodedParam | string>;
  stringifiedParam?: string;
}

export interface INotification {
  keeperAddress: string;
  payload: NotificationPayload;
  seen: boolean;
  uniqueHelper: string;
  createdAt: string;
}
