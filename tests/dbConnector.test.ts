import mongoose from "mongoose";
import { Logger } from "pino";
import sinon, { SinonSandbox, SinonStub, SinonStubbedInstance } from "sinon";

import { connectorFactory, connectDB, getMongoDBUrl } from "../src/db";

describe("getMongoDBUrl", () => {
  it("should construct the MongoDB connection URL correctly", () => {
    const dbParams = {
      protocol: "mongodb",
      host: "localhost",
      database: "testdb",
      port: "27017",
    };

    const expectedUrl = "mongodb://localhost:27017/testdb";

    const url = getMongoDBUrl(dbParams);

    expect(url).toEqual(expectedUrl);
  });
});

describe("connectDB", () => {
  let sandbox: SinonSandbox;
  let loggerStub: Logger;
  let mongooseConnectStub: SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerStub = {
      trace: sandbox.stub(),
      debug: sandbox.stub(),
      info: sandbox.stub(),
      error: sandbox.stub(),
      child: sandbox.stub().returnsThis(),
    } as unknown as SinonStubbedInstance<Logger>;
    mongooseConnectStub = sandbox.stub(mongoose, "connect");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should connect to the database successfully", async () => {
    const dbUrl = "mongodb://localhost:27017/testdb";
    const database = "testdb";

    const connection = await connectDB(dbUrl, database, loggerStub);

    // Assert that the mongoose.connect method is called with the correct arguments
    expect(mongooseConnectStub.calledOnceWith(dbUrl)).toBeTruthy();

    // Ensure that the connection object is returned with correct parameters
    expect(connection.params.dbUrl).toEqual(dbUrl);
    expect(connection.params.database).toEqual(database);
    expect(connection.params.logger).toEqual(loggerStub);

    // Assert that the logger methods are called with the expected messages
    expect(
      (loggerStub.trace as any).calledWith(
        `Preparing to connect to the MongoDB database: ${database}`
      )
    ).toBeTruthy();
    expect(
      (loggerStub.debug as any).calledWith(
        `Attempting to connect to the mongodb database: ${database}`
      )
    ).toBeTruthy();
    expect(
      (loggerStub.info as any).calledWith(
        `Connected to the mongodb database: ${database}`
      )
    ).toBeTruthy();

    // Ensure that the error method is not called
    expect((loggerStub.error as any).notCalled).toBeTruthy();
  });

  it("should handle connection errors", async () => {
    const dbUrl = "mongodb://localhost:27017/testdb";
    const database = "testdb";
    const error = new Error("Connection error");

    mongooseConnectStub.rejects(error);

    await expect(connectDB(dbUrl, database, loggerStub)).rejects.toThrow(error);

    // Assert that the trace and debug and error method is called with the error object
    expect(
      (loggerStub.trace as any).calledWith(
        `Preparing to connect to the MongoDB database: ${database}`
      )
    ).toBeTruthy();
    expect(
      (loggerStub.debug as any).calledWith(
        `Attempting to connect to the mongodb database: ${database}`
      )
    ).toBeTruthy();
    expect(
      (loggerStub.error as any).calledWith(`Error connecting to the database`, {
        error,
      })
    ).toBeTruthy();

    // Ensure that info method are not called
    expect((loggerStub.info as any).notCalled).toBeTruthy();
  });
});

describe("connectorFactory", () => {
  let sandbox: SinonSandbox;
  let loggerStub: SinonStubbedInstance<Logger>;
  let mongooseConnectStub: SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerStub = {
      trace: sandbox.stub(),
      debug: sandbox.stub(),
      info: sandbox.stub(),
      error: sandbox.stub(),
      child: sandbox.stub().returnsThis(),
    } as unknown as SinonStubbedInstance<Logger>;
    mongooseConnectStub = sandbox.stub(mongoose, "connect");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return a function that connects to the database", async () => {
    const dbParams = {
      protocol: "mongodb",
      host: "localhost",
      database: "testdb",
      port: "27017",
    };

    // Call connectorFactory to get the connector function
    const connector = connectorFactory(dbParams, loggerStub);

    const { params } = await connector();

    //// Ensure that connector is called with the correct arguments
    expect(params.dbUrl).toEqual(getMongoDBUrl(dbParams));
    expect(params.database).toEqual(dbParams.database);
    expect(params.logger).toEqual(loggerStub);
  });
});
