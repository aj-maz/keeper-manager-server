import axios from "axios";

class Covalent {
  covalentAddress: string = "https://api.covalenthq.com/v1";
  covalentNetworkIdentifier: string;
  covalentKey: string;

  constructor(covalentNetworkIdentifier: string) {
    this.covalentKey = String(process.env.COVALENT_KEY);
    this.covalentNetworkIdentifier = covalentNetworkIdentifier;
  }

  async getKeeperTransactions(keeperAddress: string) {
    const sleep = (time: number) =>
      new Promise((res) => setTimeout(res, time, "done sleeping"));

    const randomDelay = Math.floor(Math.random() * 10000); // Random delay between 0 and 10 seconds (in milliseconds)

    await sleep(randomDelay);
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
