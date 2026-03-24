import { DfnsApiClient } from "@dfns/sdk";
import crypto from "crypto";

export async function createDfnsSigner(dfnsClient: DfnsApiClient, walletId: string) {
    // 1. Fetch wallet info to know the public key
    const wallet = await dfnsClient.wallets.getWallet({ walletId });
    if (wallet.status !== "Active") {
        throw new Error(`Wallet ${walletId} is not active. Status: ${wallet.status}`);
    }

    // Convert public key to standard format if needed
    // DFNS returns public key as hex.
    const publicKeyHex = wallet.signingKey?.publicKey; 
    if (!publicKeyHex) throw new Error("Public key not found in wallet");
    
    // We map the network/scheme to standard JWT algorithms
    // Common is ES256K for secp256k1 (Ethereum)
    const alg = wallet.signingKey?.scheme === "ECDSA" ? "ES256K" : "EdDSA"; // Simplification

    // 2. The signer function expected by @sd-jwt/core
    // It takes the header and payload as a string: "ey... . ey..."
    // and returns the signature as base64url.
    const signer = async (data: string): Promise<string> => {
        const hash = crypto.createHash("sha256").update(data).digest("hex");
        
        // Generate signature via DFNS
        const sigRes = await dfnsClient.wallets.generateSignature({
            walletId,
            body: {
                kind: "Hash",
                hash: `0x${hash}`
            }
        });

        if (!sigRes.signature) {
            throw new Error("Failed to generate signature via DFNS");
        }

        // DFNS returns signature usually in hex format like 0x[r][s][v]
        // We need r and s concatenated and base64url encoded for JWT.
        const encodedSig = (sigRes.signature as any).r ? 
            `${(sigRes.signature as any).r.replace(/^0x/, "")}${(sigRes.signature as any).s.replace(/^0x/, "")}` :
            // Some schemes return a flat hex string `0x...`
            (sigRes.signature as any).replace(/^0x/, "").substring(0, 128);

        return Buffer.from(encodedSig, "hex").toString("base64url");
    };

    return {
        signer,
        alg,
        publicKeyHex
    };
}
