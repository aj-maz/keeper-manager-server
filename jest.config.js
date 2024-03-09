module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@lib/logger$": "<rootDir>/src/lib/logger",
    // Add more mappings if necessary
  },
};
