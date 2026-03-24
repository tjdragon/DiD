import { SDJwtInstance } from "@sd-jwt/core";
import fs from "fs";
import crypto from "crypto";

async function run() {
    console.log("=== UTILISATEUR (Détenteur) ===");
    console.log("Chargement de l'attestation depuis 'credential.txt'...");
    
    if (!fs.existsSync("credential.txt")) {
        throw new Error("L'attestation (credential.txt) est introuvable. Avez-vous exécuté l'Émetteur ?");
    }
    
    const credential = fs.readFileSync("credential.txt", "utf-8");
    
    // Instanciation du SD-JWT pour le détenteur. 
    // Pas besoin de clés ici car on ne fait pas de Holder Binding complexe pour cet exemple.
    const sdjwt = new SDJwtInstance({
        hasher: (data: string | ArrayBuffer | Uint8Array) => {
            let dataStr = typeof data === 'string' ? data : Buffer.from(data as any);
            return crypto.createHash("sha256").update(dataStr).digest();
        },
        hashAlg: "sha-256",
    });

    console.log("Génération de la présentation...");
    console.log("L'utilisateur choisit de RÉVÉLER 'isOver18' et de MASQUER 'birthdate'.");

    // Création de la présentation. Le presentationFrame indique ce qu'on veut révéler.
    // true = révéler ce champ. Tout le reste sera masqué par défaut.
    const presentation = await sdjwt.present(credential, {
        isOver18: true
    });

    // Sauvegarde de la présentation
    fs.writeFileSync("presentation.txt", presentation);
    console.log("Présentation générée et sauvegardée dans 'presentation.txt'.");
    console.log("Vous pouvez vérifier 'presentation.txt' pour constater que la date de naissance n'y figure pas en clair.");
}

run().catch(console.error);
