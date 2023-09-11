import axios from "axios";

class Covalent {
  covalentAddress: string = "http://206.188.197.109/v1";
  covalentNetworkIdentifier: string;
  covalentKey: string;

  constructor(covalentNetworkIdentifier: string) {
    this.covalentKey = String(process.env.COVALENT_KEY);
    this.covalentNetworkIdentifier = covalentNetworkIdentifier;
  }

  async getKeeperTransactions(keeperAddress: string) {
    return axios.get(
      `${this.covalentAddress}/${this.covalentNetworkIdentifier}/address/${keeperAddress}/transactions_v3/page/0/`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        //@ts-ignore
        auth: {
          username: this.covalentKey,
        },
      }
    );
  }
}

export default Covalent;
