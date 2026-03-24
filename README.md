# Tutoriel : Identité Décentralisée (DID) & Divulgation Sélective (Selective Disclosure)

Ce tutoriel démontre comment utiliser les **Identifiants Décentralisés (DID)** et les **SD-JWT** (Selective Disclosure for JWTs) pour créer des *Verifiable Credentials* (Attestations Vérifiables).
Le cas d'usage implémenté est de prouver qu'une personne a "plus de 18 ans" sans révéler sa date de naissance exacte.

Toutes les clés utilisées pour signer les attestations et présentations sont sécurisées de manière décentralisée via [DFNS](https://www.dfns.co/).

## Cas Pratique

1. **Le Gouvernement (Émetteur)** connaît votre date de naissance. Il émet une attestation (Credential) contenant votre date de naissance (`birthdate`) et une confirmation que vous avez plus de 18 ans (`isOver18`). Ces deux champs sont "masquables" (Selectively Disclosable).
2. **L'Utilisateur (Détenteur)** reçoit cette attestation et la stocke.
3. Pour entrer dans un **Bar (Vérificateur)**, l'utilisateur génère une preuve de présentation (Presentation) où il choisit de **révéler uniquement `isOver18`**, tout en masquant sa date de naissance. Le Bar vérifie cryptographiquement que la preuve vient bien du Gouvernement et que la condition d'âge est remplie.

## Prérequis et Installation

### 1. Configuration DFNS

Pour utiliser ce tutoriel, vous devez configurer un Service Account DFNS pour le Gouvernement (Issuer) et pour l'Utilisateur (Holder).

1. Allez sur le Dashboard DFNS (ou via l'API/CLI).
2. Créez une application (`App ID`).
3. Créez un Service Account et générez un `Service Account Credential` (clé privée et `credential ID`).
4. Créez un portefeuille (Wallet) au sein de votre App pour le Gouvernement (récupérez l'ID du Wallet, ex: `wa-...`).
5. (Optionnel) Créez un autre portefeuille pour le Holder.

### 2. Variables d'environnement

Créez un fichier `.env` à la racine de ce dossier en copiant le modèle `.env.example` :

```env
DFNS_APP_ID="app-..."
DFNS_SERVICE_ACCOUNT_CREDENTIAL_ID="sec-..."
DFNS_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
DFNS_ISSUER_WALLET_ID="wa-..."
# Optionnel: Wallet pour le Holder s'il signe sa présentation
DFNS_HOLDER_WALLET_ID="wa-..."
```

*(Si vous n'avez pas de portefeuille Holder configuré, le tutoriel utilisera un portefeuille local généré à la volée pour la simplicité de l'exemple du Holder.)*

### 3. Installation des dépendances

```bash
npm install
```

## Déroulement du Tutoriel

Les scripts sont situés dans le dossier `src/` et doivent être exécutés dans l'ordre.

### Étape 1 : Le Gouvernement émet l'Attestation
Exécutez :
```bash
npx tsx src/1-Issuer.ts
```
**Ce qu'il se passe** : Le script se connecte à DFNS avec le portefeuille du Gouvernement. Il crée un SD-JWT contenant les champs `birthdate` et `isOver18` et les marque comme sélectivement divulguables. Le JWT est signé par le portefeuille DFNS et sauvegardé dans `credential.txt`.

### Étape 2 : L'Utilisateur prépare sa Présentation
Exécutez :
```bash
npx tsx src/2-Holder.ts
```
**Ce qu'il se passe** : Le script agit comme le portefeuille de l'utilisateur. Il lit `credential.txt`, génère une présentation SD-JWT en sélectionnant **uniquement le champ `isOver18`**. La présentation générée est sauvegardée dans `presentation.txt`. Si vous lisez `presentation.txt`, vous verrez qu'il n'y a aucune trace de la date de naissance !

### Étape 3 : Le Bar vérifie la Présentation
Exécutez :
```bash
npx tsx src/3-Verifier.ts
```
**Ce qu'il se passe** : Le script agit comme le Bar. Il reçoit `presentation.txt`, en extrait les données divulguées (`isOver18: true`). Il vérifie ensuite de manière cryptographique la signature de l'émetteur (le Gouvernement) grâce à sa clé publique. Le Bar est ainsi certain de l'âge de l'utilisateur sans connaître sa date de naissance.

## Technologies Utilisées

- **DFNS SDK** (`@dfns/sdk`, `@dfns/sdk-keysigner`) : Gestion d'infrastructure de clés (Wallets MPC).
- **SD-JWT** (`@sd-jwt/core`) : Implémentation du standard W3C IETF SD-JWT pour la divulgation sélective.
- **TypeScript** : Typage et structure rigoureuse des scripts.

## Comment la cryptographie protège vos données ?

Ce tutoriel s'appuie sur la cryptographie asymétrique (clés publiques/privées) et les fonctions de hachage probabilistes pour fonctionner :

1. **Génération avec la Clé Privée (L'Émetteur)** : Le Gouvernement (via son portefeuille DFNS) possède une **clé privée** hautement sécurisée. Lors de l'émission, il hache avec un sel aléatoire chaque donnée (ex: `birthdate` et `isOver18`) pour en faire des empreintes illisibles, puis il signe numériquement l'ensemble du document avec sa clé privée. La donnée originelle en clair est détachée dans des petits paquets annexes appelés "disclosures".
2. **Divulgation Sélective (Le Détenteur)** : L'utilisateur reçoit l'attestation signée accompagnée de toutes ses "disclosures" en clair. Lors de son entrée dans le Bar, l'utilisateur prépare son QR Code / sa requête : il transmet le document signé, mais décide de **ne joindre que la disclosure de `isOver18`**, en omettant celle de la date de naissance.
3. **Vérification avec la Clé Publique (Le Vérificateur)** : 
   - Le Bar reçoit le document. À la place de la date de naissance, il ne voit qu'une empreinte hachée impossible à inverser ! L'âge, en revanche, est lisible et correspond au hachage attendu dans le document.
   - Le Bar récupère alors la **clé publique** du Gouvernement (qui est publique et connue de tous, via son DID).
   - Grâce à la clé publique, le calcul mathématique permet d'affirmer de manière absolue : *"Oui, ce document et ces empreintes ont bien été signés par la clé privée du Gouvernement"*. L'âge est donc prouvé, sans révéler le moindre détail superflu.
