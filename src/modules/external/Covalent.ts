import axios from "axios";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "covalent",
});

class Covalent {
  covalentAddress: string = "https://api.covalenthq.com/v1";
  covalentNetworkIdentifier: string;
  covalentKey: string;

  constructor(covalentNetworkIdentifier: string) {
    const constructorLogger = logger.child({
      method: "constructor",
    });
    constructorLogger.trace("Instantiating a covalent api handler");
    this.covalentKey = String(process.env.COVALENT_KEY);
    this.covalentNetworkIdentifier = covalentNetworkIdentifier;
    constructorLogger.debug("Logger instantiated", {
      covalentNetworkIdentifier,
    });
  }

  async getKeeperTransactions(keeperAddress: string) {
    const getKeeperTransactionsLogger = logger.child({
      method: "getKeeperTransactions",
      keeperAddress,
    });
    getKeeperTransactionsLogger.info("Getting keeper transaction address");
    const sleep = (time: number) =>
      new Promise((res) => setTimeout(res, time, "done sleeping"));

    getKeeperTransactionsLogger.trace("generating a random delay");
    const randomDelay = Math.floor(Math.random() * 10000); // Random delay between 0 and 10 seconds (in milliseconds)
    getKeeperTransactionsLogger.debug("generated the random delay", {
      delay: randomDelay,
    });

    getKeeperTransactionsLogger.trace(
      "Sleeping randomley to not get rate limited",
      {
        delay: randomDelay,
      }
    );
    await sleep(randomDelay);
    getKeeperTransactionsLogger.debug(
      "Slept randomley to not get rate limited",
      {
        delay: randomDelay,
      }
    );
    try {
      const targetUrl = `${this.covalentAddress}/${this.covalentNetworkIdentifier}/address/${keeperAddress}/transactions_v3/page/0/`;

      getKeeperTransactionsLogger.trace("Requesting covalent api", {
        targetUrl,
      });
      const transactions = axios.get(targetUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        //@ts-ignore
        auth: {
          username: this.covalentKey,
        },
      });
      getKeeperTransactionsLogger.debug("Got the response from covalent api", {
        transactions,
      });

      return transactions;
    } catch (err) {
      throw err;
    }
  }
}

export default Covalent;
