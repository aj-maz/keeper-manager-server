const getAllRpcUris = (chainIdentifier: string) => {
  const rpcUris = [];
  console.log(process.env[`${chainIdentifier}_RPC_URI_${1}`]);
  for (let i = 1; ; i++) {
    const uri = process.env[`${chainIdentifier}_RPC_URI_${i}`];
    if (!uri) break;
    rpcUris.push(uri);
  }
  console.log(rpcUris);
  return rpcUris;
};

const rpcGetter = (chainIdentifier: string) => {
  const rpcUris = getAllRpcUris(chainIdentifier);
  if (rpcUris.length > 0) {
    const randomIndex = Math.floor(Math.random() * rpcUris.length);
    return rpcUris[randomIndex];
  } else {
    // Handle the case where no valid RPC URIs are defined
    throw new Error(`No valid ${chainIdentifier}_RPC_URI variables found.`);
  }
};

export const networks = {
  mainnet: {
    get rpc_uri() {
      return rpcGetter("MAINNET");
    }
  },
  goerli: {
    get rpc_uri() {
      return rpcGetter("GOERLI");
    }
  }
};

export const systems = [
  {
    name: "RAI",
    image: process.env.RAI_KEEPER_IMAGE,
    networks: [
      {
        name: "Mainnet",
        covalentNetworkIdentifier: "eth-mainnet",
        nativeCoin: "ETH",
        systemCoin: "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919",
        collaterals: [
          {
            name: "ETH-A",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
          }
        ]
      }
    ]
  },
  {
    name: "HAI",
    image: process.env.HAI_KEEPER_IMAGE,
    networks: [
      {
        name: "Optimism Goerli",
        covalentNetworkIdentifier: "optimism-goerli",
        nativeCoin: "ETH",
        systemCoin: "0x82535c9585A070BfA914924F6D83F7162D17A869",
        collaterals: [
          {
            name: "WETH",
            address: "0x4200000000000000000000000000000000000006"
          },
          {
            name: "OP",
            address: "0x4200000000000000000000000000000000000042"
          },
          {
            name: "SNX",
            address: "0x2E5ED97596a8368EB9E44B1f3F25B2E813845303"
          },
          {
            name: "WBTC",
            address: "0xA5553A3ec007914fC12d648cd9A00164535BFf98"
          },
          {
            name: "STONES",
            address: "0x07Fe26b7a9247311b1587510BAd5B02CD33a7F64"
          },
          {
            name: "TOTEM",
            address: "0x51d5F9Cc09394Ee3cF2601b18F8Af931e19460Bd"
          }
        ]
      }
    ]
  },
  {
    name: "TAI",
    image: process.env.TAI_KEEPER_IMAGE,
    networks: [
      {
        name: "Mainnet",
        nativeCoin: "ETH",
        covalentNetworkIdentifier: "eth-mainnet",
        systemCoin: "0xf915110898d9a455ad2da51bf49520b41655ccea",
        collaterals: [
          {
            name: "ETH-A",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
          },
          {
            name: "ETH-B",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
          },
          {
            name: "ETH-C",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
          },
          {
            name: "WSTETH-A",
            address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"
          },
          {
            name: "WSTETH-B",
            address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"
          },
          {
            name: "RETH-A",
            address: "0xae78736cd615f374d3085123a210448e74fc6393"
          },
          {
            name: "RETH-B",
            address: "0xae78736cd615f374d3085123a210448e74fc6393"
          },
          {
            name: "RAI-A",
            address: "0x03ab458634910aad20ef5f1c8ee96f1d6ac54919"
          }
        ]
      },
      {
        name: "Goerli",
        nativeCoin: "GoerliETH",
        covalentNetworkIdentifier: "eth-goerli",
        systemCoin: "0x752001fd47365d7fb84a5fdb0b3212f56d5ee4e0",
        collaterals: [
          {
            name: "ETH-A",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
          },
          {
            name: "ETH-B",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
          },
          {
            name: "ETH-C",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
          },
          {
            name: "WSTETH-A",
            address: "0xf000322855db5f20e1702b136b2845cc7addd25f"
          },
          {
            name: "WSTETH-B",
            address: "0xf000322855db5f20e1702b136b2845cc7addd25f"
          },
          {
            name: "RETH-A",
            address: "0x6a41a5856f2cf481fcf84610de6a90e3fb57d514"
          },
          {
            name: "RETH-B",
            address: "0x6a41a5856f2cf481fcf84610de6a90e3fb57d514"
          },
          {
            name: "RAI-A",
            address: "0x8c96beb6a913945107730f85acef21c240c21985"
          }
        ]
      }
    ]
  }
];

export const getSystems = () => {
  return systems;
};
