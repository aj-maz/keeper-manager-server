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
    },
  },
  goerli: {
    get rpc_uri() {
      return rpcGetter("GOERLI");
    },
  },
  optimism: {
    get rpc_uri() {
      return rpcGetter("OPTIMISM");
    },
  },
  optimismgoerli: {
    get rpc_uri() {
      return rpcGetter("OPTIMISMGOERLI");
    },
  },
  optimismsepolia: {
    get rpc_uri() {
      return rpcGetter("OPTIMISMSEPOLIA");
    },
  },
};

interface System {
  name: string;
  image: string | undefined;
  networks: Array<Network>;
}

interface Network {
  name: string;
  covalentNetworkIdentifier: string;
  nativeCoin: string;
  systemCoin: string;
  fromBlock: undefined | string | number;
  selector: undefined | string;
  collaterals: Array<Collateral>;
}

interface Collateral {
  name: string;
  address: string;
}

export const systems: Array<System> = [
  {
    name: "RAI",
    image: process.env.RAI_KEEPER_IMAGE,
    networks: [
      {
        name: "Mainnet",
        covalentNetworkIdentifier: "eth-mainnet",
        nativeCoin: "ETH",
        systemCoin: "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919",
        fromBlock: undefined,
        selector: undefined,
        collaterals: [
          {
            name: "ETH-A",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          },
        ],
      },
    ],
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
        fromBlock: undefined,
        selector: undefined,
        collaterals: [
          {
            name: "ETH-A",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          },
          {
            name: "ETH-B",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          },
          {
            name: "ETH-C",
            address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          },
          {
            name: "WSTETH-A",
            address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          },
          {
            name: "WSTETH-B",
            address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          },
          {
            name: "RETH-A",
            address: "0xae78736cd615f374d3085123a210448e74fc6393",
          },
          {
            name: "RETH-B",
            address: "0xae78736cd615f374d3085123a210448e74fc6393",
          },
          {
            name: "RAI-A",
            address: "0x03ab458634910aad20ef5f1c8ee96f1d6ac54919",
          },
        ],
      },
      {
        name: "Goerli",
        nativeCoin: "GoerliETH",
        covalentNetworkIdentifier: "eth-goerli",
        systemCoin: "0x752001fd47365d7fb84a5fdb0b3212f56d5ee4e0",
        fromBlock: undefined,
        selector: undefined,
        collaterals: [
          {
            name: "ETH-A",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
          },
          {
            name: "ETH-B",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
          },
          {
            name: "ETH-C",
            address: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
          },
          {
            name: "WSTETH-A",
            address: "0xf000322855db5f20e1702b136b2845cc7addd25f",
          },
          {
            name: "WSTETH-B",
            address: "0xf000322855db5f20e1702b136b2845cc7addd25f",
          },
          {
            name: "RETH-A",
            address: "0x6a41a5856f2cf481fcf84610de6a90e3fb57d514",
          },
          {
            name: "RETH-B",
            address: "0x6a41a5856f2cf481fcf84610de6a90e3fb57d514",
          },
          {
            name: "RAI-A",
            address: "0x8c96beb6a913945107730f85acef21c240c21985",
          },
        ],
      },
    ],
  },
  {
    name: "HAI",
    image: process.env.HAI_KEEPER_IMAGE,
    networks: [
      {
        name: "Optimism",
        nativeCoin: "ETH",
        covalentNetworkIdentifier: "optimism-mainnet",
        selector: "optimism",
        systemCoin: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
        fromBlock: 116055145,
        collaterals: [
          {
            name: "WETH",
            address: "0x4200000000000000000000000000000000000006",
          },
          {
            name: "WSTETH",
            address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
          },
          {
            name: "OP",
            address: "0x4200000000000000000000000000000000000042",
          },
          {
            name: "HAI",
            address: "0x2a75Aed026BBC73FeCdAa1acCE38b427fEa529D0",
          },
          {
            name: "KITE",
            address: "0x1BDf43597E9aCD371e88C8f76A24ebb311519f2b",
          },
        ],
      },
      {
        name: "OptimismGoerli",
        nativeCoin: "GoerliETH",
        covalentNetworkIdentifier: "optimism-goerli",
        systemCoin: "0xb2d541BDd0037e03d6B43490c9A72594a6c37A0f",
        fromBlock: 17538846,
        selector: "optimism-goerli",
        collaterals: [
          {
            name: "WETH",
            address: "0x4200000000000000000000000000000000000006",
          },
          {
            name: "OP",
            address: "0x4200000000000000000000000000000000000042",
          },
          {
            name: "WBTC",
            address: "0x72Bf28D2E3dfE44a7dD0BFE265fCc381fF8A74C8",
          },
          {
            name: "STN",
            address: "0x41944Bebe7Bfd3C708DBf96F4eE2d0c3b91843CA",
          },
          {
            name: "TTM",
            address: "0xdCfd86628e5e5eC7f7c1d8Ae9894E57dDF86c1f1",
          },
        ],
      },
      {
        name: "OptimismSepolia",
        nativeCoin: "SepoliaETH",
        covalentNetworkIdentifier: "optimism-sepolia",
        selector: "optimism-sepolia",
        systemCoin: '0xd87Dd8e541BB8027f5d7292b2096a59DCa056C76',
        fromBlock: 8291429,
        collaterals: [
          {
            name: "WETH",
            address: "0x4200000000000000000000000000000000000006",
          },
          {
            name: "OP",
            address: "0x4200000000000000000000000000000000000042",
          },
          {
            name: "WBTC",
            address: "0xdC0EE5C3248Eac059997259c2DfC0e4bF8943097",
          },
          {
            name: "STN",
            address: "0x056411ecF73C5be6fCeCF20330Ce3acd722aBD68",
          },
          {
            name: "TTM",
            address: "0x8831ee67C3aE92c35034155E6B8fb57817f337EE",
          },
        ],
      },
    ],
  },
];

export const getSystems = () => {
  return systems;
};
