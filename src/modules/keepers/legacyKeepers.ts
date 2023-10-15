/*

  async handleContainer() {
    if (this.status === KeeperStatus.STOPPED) {
      return;
    }
    if (this.containerExists()) {
      this.setContainerId();
      await this.startContainer();
    } else {
      await this.runContainer();
    }
  }

    handleContainerEvents() {
    if (!this.container) {
      throw new Error("Can't handle container events before container exists");
    }

    this.container.stdout?.on("data", async (data) => {
      await this.handleRunningStatus();
      await this.setLogs();
    });

    this.container.stderr?.on("data", async (data) => {
      await this.handleRunningStatus();
      await this.setLogs();
    });

    this.container.on("exit", async (r) => {
      console.log(`keeper is exiting `, r);
      if (this.status !== KeeperStatus.STOPPING) {
        await this.changeKeeperStatus(KeeperStatus.FAILED);
        await this.handleTries();
        if (RECOVER_LIMIT > this.tries) {
          console.log(
            `recovering keeper ${this._id} for the ${this.tries} time`
          );
          this.handleContainer();
        } else {
          console.log(
            `giving up on recovering keeper ${this._id} after ${this.tries} failed attempt`
          );
        }
      } else {
        await this.handleTries();
        await this.changeKeeperStatus(KeeperStatus.STOPPED);
      }
    });
  }

    containerExists() {
    if (!this._id) {
      throw new Error("Keeper is not initialized properly");
    }
    return fs.existsSync(getCIDFile(this._id));
  }

    setContainerId() {
    if (!this._id) {
      return;
      //throw new Error("Keeper is not initialized properly");
    }
    if (this.containerExists()) {
      this.containerId = fs.readFileSync(getCIDFile(this._id)).toString();
      console.log(`container id setted: ${this.containerId}`);
    }
  }

    async isContainerRunning() {
    if (!this.containerId)
      throw new Error("Can't check the container without container id");
    return new Promise((resolve, reject) => {
      // Use the `docker ps` command to list running containers and grep for the container ID
      const cmd = `docker ps --quiet --filter "id=${this.containerId}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          // If there's an error running the command, reject the promise
          reject(error);
          return;
        }
        // If the container ID is in the output, it means the container is running
        const isRunning = this.containerId?.includes(stdout.trim());
        resolve(isRunning);
      });
    });
  }

    async setLogs(forced: boolean = false) {
    if (!this._id) {
      return;
    }
    this.setContainerId();
    if (fs.existsSync(getCIDFile(this._id))) {
      if (!this.haveSetLogs || forced) {
        console.log("docker", [
          "logs",
          "-f",
          String(this.containerId),
          ">",
          getLogsFile(this._id),
          "2>&1",
        ]);
        spawn(
          "docker",
          [
            "logs",
            "-f",
            String(this.containerId),
            ">",
            getLogsFile(this._id),
            "2>&1",
          ],
          {
            shell: true,
          }
        );
        this.haveSetLogs = true;
      }
    }
  }


    async startContainer() {
    if (!this.containerId) {
      throw new Error("Can't start the keeper with no containerId");
    }
    this.handleTries();

    if (await this.isContainerRunning()) {
      await this.changeKeeperStatus(KeeperStatus.RUNNING);
    } else if (this.tries > 0) {
      await this.changeKeeperStatus(KeeperStatus.RECOVERING);
    } else {
      await this.changeKeeperStatus(KeeperStatus.PREPARING);
    }
    this.container = spawn("docker", ["start", "-a", this.containerId]);

    this.handleContainerEvents();
  }


    async runContainer() {
    await this.changeKeeperStatus(KeeperStatus.PREPARING);
    this.container = spawn("docker", this.getRunningContainerArray());
    this.handleContainerEvents();
  }


    getRunningContainerArray() {
    // TODO: must add options to this
    if (
      !this.wallet?.path ||
      !this._id ||
      !this.rpcUri ||
      !this.systemImage ||
      !this.wallet.address ||
      !this.collateral ||
      !this.options
    ) {
      throw new Error("Keeper is not initialized properly");
    }
    return [
      "run",
      "-v",
      `${this.wallet.keystore}:/keystore`,
      "--cidfile",
      getCIDFile(this._id),
      this.systemImage,
      "--rpc-uri",
      this.rpcUri,
      "--safe-engine-system-coin-target",
      "ALL",
      "--eth-from",
      ethers.getAddress(this.wallet.address),
      "--eth-key",
      `key_file=/keystore/key-${this.wallet.address.toLowerCase()}.json,pass_file=/keystore/${this.wallet.address.toLowerCase()}.pass`,
      "--collateral-type",
      this.collateral,
      ...this.options.map((option) => `--${option}`),
    ];
  }

    async handleRunningStatus() {
    if (this.status !== KeeperStatus.STOPPING) {
      this.startingTime = new Date();
      await this.changeKeeperStatus(KeeperStatus.RUNNING);
    }
  }

    async handleTries() {
    if (
      (this.startingTime &&
        Number(new Date()) - Number(this.startingTime) > 10 * 60 * 1000) ||
      this.status === KeeperStatus.STOPPED
    ) {
      this.tries = 0;
    } else {
      this.tries += 1;
    }
    await KeeperModel.updateOne(
      { _id: this._id },
      {
        tries: this.tries,
      }
    );
  }

    async resetTries() {
    this.tries = 0;
    await KeeperModel.updateOne(
      { _id: this._id },
      {
        tries: this.tries,
      }
    );
  }
*/
