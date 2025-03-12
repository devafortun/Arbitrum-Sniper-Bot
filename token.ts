import { Token } from "@uniswap/sdk-core";
import { Signer, BigNumber, BigNumberish, Contract, providers } from "ethers";
import { CHAIN_ID, signer } from "./config";
import { Provider } from "@ethersproject/providers";
import axios, { AxiosRequestConfig } from "axios";
import { config as loadEnvironmentVariables } from "dotenv";

loadEnvironmentVariables();

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function allowance(address, address) external view returns (uint256)",
  "function approve(address, unit) external returns (bool)",
  "function balanceOf(address) external view returns(uint256)",
];

type TokenWithContract = {
  contract: Contract;
  walletHas: (signer: Signer, requireAmount: BigNumberish) => Promise<boolean>;
  token: Token;
};

const buildERC20TokenWithContract = async (
  address: string,
  provider: Provider
): Promise<TokenWithContract | null> => {
  try {
    const contract = new Contract(address, ERC20_ABI, provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    return {
      contract: contract,

      walletHas: async (signer, requireAmount) => {
        const signerBalance = await contract
          .connect(signer)
          .balanceOf(await signer.getAddress());

        return signerBalance.gte(BigNumber.from(requireAmount));
      },

      token: new Token(CHAIN_ID, address, decimals, symbol, name),
    };
  } catch (error) {
    console.error(
      `Failed to fetch token details for address ${address};`,
      error
    );
    return null;
  }
};

//Example usage for ARBITRUM
const provider = new providers.JsonRpcProvider(process.env.RPC);

type Tokens = {
  Token0: TokenWithContract | null;
  Token1: TokenWithContract | null;
};

export const getTokens = async (): Promise<Tokens> => {
  try {
    let data = JSON.stringify({
      query:
        'query {\n  EVM(network: arbitrum) {\n    Events(\n      limit: {count:1}\n      orderBy: {descending: Block_Time}\n      where: {Log: {Signature: {Name: {is: "PoolCreated"}}, SmartContract: {is: "0x1F98431c8aD98523631AE4a59f267346ea31F984"}}, Arguments: {startsWith: {Value: {Address: {is: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"}}}}}\n    ) {\n      Transaction {\n        Hash\n      }\n      Block {\n        Time\n      }\n      Log {\n        Signature {\n          Name\n        }\n      }\n      Arguments {\n        Name\n        Type\n        Value {\n          ... on EVM_ABI_Integer_Value_Arg {\n            integer\n          }\n          ... on EVM_ABI_String_Value_Arg {\n            string\n          }\n          ... on EVM_ABI_Address_Value_Arg {\n            address\n          }\n          ... on EVM_ABI_BigInt_Value_Arg {\n            bigInteger\n          }\n          ... on EVM_ABI_Bytes_Value_Arg {\n            hex\n          }\n          ... on EVM_ABI_Boolean_Value_Arg {\n            bool\n          }\n        }\n      }\n    }\n  }\n}\n',
      variables: "{}",
    });
    const axiosConfig: AxiosRequestConfig = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BITQUERY_TOKEN}`, // put your oauth token here
      },
      data: data,
    };

    const response = await axios.request(axiosConfig);

    const token0Address =
      response.data.data.EVM.Events[0].Arguments[0].Value.address;
    const token1Address =
      response.data.data.EVM.Events[0].Arguments[0].Value.address;

    return { Token0, Token1 };
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return { Token0: null, Token1: null };
  }
};
