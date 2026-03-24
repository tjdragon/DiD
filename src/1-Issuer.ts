import { SDJwtInstance } from "@sd-jwt/core";
import { dfnsClient, getIssuerWalletId } from "./config.js";
import { createDfnsSigner } from "./dfnsSigner.js";
import fs from "fs";

async function run() {
    console.log("=== GOUVERNEMENT (Émetteur) ===");
    console.log("Initialisation du portefeuille DFNS...");
    const walletId = getIssuerWalletId();
    
    const { signer, alg, publicKeyHex } = await createDfnsSigner(dfnsClient, walletId);
    console.log(`Clé publique (hex): ${publicKeyHex}`);
    console.log(`Algorithme de signature: ${alg}`);

    // Création d'un DID simple basé sur la clé publique (did:pkh ou did:ethr)
    // Pour cet exemple, on peut utiliser un identifiant factice "did:example:issuer" 
    // ou "did:ethr:..." si c'est une adresse Ethereum. On utilise la clé publique.
    const issuerDid = `did:dfns:${walletId}`;

    const sdjwt = new SDJwtInstance({
        signer,
        signAlg: alg,
        hasher: (data: string | ArrayBuffer | Uint8Array) => {
            // @sd-jwt/core nécessite une fonction de hachage pour créer les 'disclosures'
            const crypto = require("crypto");
            let dataStr = typeof data === 'string' ? data : Buffer.from(data as any);
            return crypto.createHash("sha256").update(dataStr).digest();
        },
        hashAlg: "sha-256",
    });

    console.log("Création de l'attestation SD-JWT...");
    
    // Le contenu (claims) que le Gouvernement atteste. 
    // On spécifie que "birthdate" et "isOver18" sont masquables.
    const credential = await sdjwt.issue({
        iss: issuerDid,
        iat: Math.floor(Date.now() / 1000),
        vct: "AgeCredential", // Verifiable Credential Type
        birthdate: "1990-01-01",
        isOver18: true
    }, {
        // Options de divulgation sélective :
        // On permet au détenteur de masquer/révéler ces champs indépendamment.
        _sd: ["birthdate", "isOver18"]
    });

    // on sauvegarde le credential
    fs.writeFileSync("credential.txt", credential);
    console.log("Attestation générée et sauvegardée dans 'credential.txt'.");
    console.log("Aperçu du SD-JWT :", credential.substring(0, 100) + "...");
}

run().catch(console.error);
