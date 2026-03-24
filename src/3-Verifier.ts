import { SDJwtInstance } from "@sd-jwt/core";
import fs from "fs";
import crypto from "crypto";

// Fonction utilitaire pour vérifier les signatures (simulera la résolution du DID)
import { dfnsClient, getIssuerWalletId } from "./config.js";

async function run() {
    console.log("=== LE BAR (Vérificateur) ===");
    console.log("Réception de la présentation depuis 'presentation.txt'...");
    
    if (!fs.existsSync("presentation.txt")) {
        throw new Error("La présentation (presentation.txt) est introuvable. Avez-vous exécuté le Détenteur ?");
    }
    
    const presentation = fs.readFileSync("presentation.txt", "utf-8");

    // Dans la réalité, le vérificateur extrait le DID de l'émetteur (iss) depuis le header/payload,
    // puis utilise un resolver DID (ex: ethr-did-resolver) pour obtenir la clé publique.
    // Pour cet exemple, on récupère directement la clé publique via l'API DFNS du Gouvernement.
    const issuerWalletId = getIssuerWalletId();
    const wallet = await dfnsClient.wallets.getWallet({ walletId: issuerWalletId });
    const publicKeyHex = wallet.signingKey?.publicKey;
    
    if (!publicKeyHex) {
        throw new Error("Impossible de trouver la clé publique du Gouvernement.");
    }
    
    console.log(`Clé publique du Gouvernement résolue : ${publicKeyHex.substring(0, 32)}...`);

    // Fonction de vérification de signature pour @sd-jwt/core
    const verifier = async (data: string, signatureBase64Url: string): Promise<boolean> => {
        // En vrai, il faut utiliser la fonction de vérification cryptographique (ES256K ou EdDSA) 
        // localement (ex: avec la librairie 'jose' ou 'crypto').
        // Ici, on utilise le module 'crypto' natif de Node pour vérifier une signature ECDSA SHA256.
        
        try {
            // Conversion de la clé publique hexadecimale non-compressée vers un format compris par Node crypto (SPKI / PEM)
            // Pour simplifier l'exemple, nous allons utiliser 'jose' qui gère bien les formats JWK.
            const jose = await import("jose");
            
            // Reconstruire le JWK à partir de la clé publique brute.
            // Ceci est une simplification. Normalement le DID Resolver retourne un JWK ou un PEM.
            // 04 + X (32 octets) + Y (32 octets) pour ECDSA secp256k1
            const xHex = publicKeyHex.substring(2, 66);
            const yHex = publicKeyHex.substring(66, 130);
            
            const jwk = {
                kty: "EC",
                crv: wallet.signingKey?.scheme === "ECDSA" ? "secp256k1" : "Ed25519",
                x: Buffer.from(xHex, "hex").toString("base64url"),
                y: Buffer.from(yHex, "hex").toString("base64url"),
            };
            
            const publicKey = await jose.importJWK(jwk, wallet.signingKey?.scheme === "ECDSA" ? "ES256K" : "EdDSA");
            
            const encoder = new TextEncoder();
            const signature = Buffer.from(signatureBase64Url, "base64url");
            
            await jose.jwtVerify(
                `${data.split('.')[0]}.${data.split('.')[1]}.${signatureBase64Url}`, 
                publicKey
            );
            return true;
        } catch (e) {
            console.error("Erreur de vérification de signature:", e);
            return false;
        }
    };

    const sdjwt = new SDJwtInstance({
        verifier,
        hasher: (data: string | ArrayBuffer | Uint8Array) => {
            let dataStr = typeof data === 'string' ? data : Buffer.from(data as any);
            return crypto.createHash("sha256").update(dataStr).digest();
        },
        hashAlg: "sha-256",
    });

    console.log("Vérification de la présentation et de la signature...");
    
    try {
        const verified = await sdjwt.verify(presentation);
        
        console.log("✅ Signature valide ! L'attestation provient bien du Gouvernement.");
        console.log("Contenu révélé (Payload) : ", verified.payload);
        
        // On vérifie la condition métier
        if ((verified.payload as any).isOver18 === true) {
            console.log("✅ Accès autorisé : La personne a prouvé avoir plus de 18 ans !");
        } else {
            console.log("❌ Accès refusé : Condition sur l'âge non remplie ou non divulguée.");
        }
        
        if ((verified.payload as any).birthdate !== undefined) {
            console.log("⚠️ Attention: La date de naissance a fuité !");
        } else {
            console.log("✅ Parfait: La date de naissance reste cachée.");
        }
        
    } catch (e: any) {
        console.error("❌ Échec de la vérification :", e.message);
    }
}

run().catch(console.error);
