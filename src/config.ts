import { config } from "dotenv";
import { DfnsApiClient } from "@dfns/sdk";
import { AsymmetricKeySigner } from "@dfns/sdk-keysigner";

config();

export const DFNS_APP_ID = process.env.DFNS_APP_ID || "";
export const DFNS_SERVICE_ACCOUNT_CREDENTIAL_ID = process.env.DFNS_SERVICE_ACCOUNT_CREDENTIAL_ID || "";
export const DFNS_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.DFNS_SERVICE_ACCOUNT_PRIVATE_KEY || "";
export const DFNS_ISSUER_WALLET_ID = process.env.DFNS_ISSUER_WALLET_ID || "";
export const DFNS_HOLDER_WALLET_ID = process.env.DFNS_HOLDER_WALLET_ID || "";

const signer = new AsymmetricKeySigner({
  privateKey: DFNS_SERVICE_ACCOUNT_PRIVATE_KEY,
  credId: DFNS_SERVICE_ACCOUNT_CREDENTIAL_ID,
});

export const dfnsClient = new DfnsApiClient({
  appId: DFNS_APP_ID,
  authToken: "will-be-generated-by-signer",
  baseUrl: "https://api.dfns.ninja",
  signer,
} as any);

export const getIssuerWalletId = () => {
    if(!DFNS_ISSUER_WALLET_ID) {
        throw new Error("DFNS_ISSUER_WALLET_ID is missing in .env");
    }
    return DFNS_ISSUER_WALLET_ID;
}
