# Publication ADAPT — iOS (App Store / TestFlight) + Android (Google Play)

Ce document liste **tout ce que tu dois faire toi-même** pour publier l'app.
Tout ce qui peut être préparé côté code est déjà en place :

- `app.json` configuré pour iOS **et** Android (bundle ID, package, adaptive icon, permissions, FCM)
- `eas.json` avec les profils `development`, `preview`, `production`
- `expo-notifications` déjà branché côté client + serveur
- L'API serveur envoie déjà les push via Expo Push (route automatique vers APNs/FCM)

Il te reste à créer les comptes/credentials externes et à remplacer les valeurs marquées `REPLACE_WITH_*`.

---

## 0. Pré-requis : installer la CLI EAS sur ton ordi

```bash
npm install -g eas-cli
eas login        # ton compte Expo
```

(Compte Expo gratuit sur https://expo.dev — pas de carte bancaire.)

Puis depuis le dossier `artifacts/athlete-app` :

```bash
eas init
```

Cette commande crée le projet sur expo.dev et te donne un **projectId** + ton **owner** (nom d'utilisateur Expo).
👉 Reporte ces deux valeurs dans `app.json` :

```json
"extra": { "eas": { "projectId": "..." } },
"owner": "ton-username-expo"
```

---

## 1. Vérifier le bundle iOS existant (TestFlight)

Le `bundleIdentifier` est actuellement `com.adaptsystem.athlete` dans `app.json`.

⚠️ **Si ton build TestFlight actuel utilise un identifiant différent**, change-le dans `app.json` pour qu'il corresponde — sinon EAS créera une nouvelle app au lieu de mettre à jour l'existante.

Tu peux vérifier dans App Store Connect → Mes apps → ADAPT → onglet « Informations sur l'app » → Bundle ID.

---

## 2. Configurer le domaine de l'API de production

Dans `eas.json`, deux endroits contiennent `REPLACE_WITH_PROD_API_DOMAIN`.
Remplace par le domaine du serveur API en production, sans `https://`. Exemples :

- `adapt-api.replit.app` (déploiement Replit)
- `api.adapt-system.com` (domaine custom)

L'app utilise cette variable pour appeler l'API et c'est aussi ce domaine qui reçoit les inscriptions push token.

---

## 3. Android — créer le projet Firebase pour FCM

Les push Android passent obligatoirement par Firebase Cloud Messaging (gratuit, illimité, pas de carte).

1. Va sur https://console.firebase.google.com → **Ajouter un projet** → nomme-le `ADAPT` (ou ce que tu veux).
2. Désactive Google Analytics (pas nécessaire pour les push).
3. Une fois le projet créé, clique sur l'icône Android pour ajouter une app Android :
   - **Nom du package** : `com.adaptsystem.athlete` (doit correspondre EXACTEMENT à `android.package` dans `app.json`)
   - **Surnom** : ADAPT (libre)
   - **SHA-1** : laisse vide pour l'instant, EAS le fournira plus tard si besoin
4. **Télécharge `google-services.json`** et place-le à la racine de `artifacts/athlete-app/google-services.json`.
5. Tu peux ignorer les étapes "Ajouter le SDK Firebase" — Expo gère ça tout seul via le plugin `expo-notifications`.

⚠️ **Ce fichier contient une clé d'API publique** — elle est conçue pour être dans le code client (cf. doc Google). Tu peux la committer ou la gitignorer, c'est ton choix. Si tu la gitignores, tu devras la fournir à EAS Build via `eas secret:create FILE google-services.json --value ./google-services.json`.

---

## 4. Compte Google Play (25 $ une seule fois)

1. https://play.google.com/console/signup
2. Paie les 25 $ (carte bancaire ou PayPal, paiement unique à vie).
3. Validation Google : ~24-48h.
4. Une fois validé, dans la console Play :
   - **Créer une application** → Nom : ADAPT → Langue par défaut : Français → Application gratuite
   - Remplis la fiche : description courte/longue, captures d'écran (5 minimum, format téléphone), icône 512x512, image fonctionnalité 1024x500, classification du contenu, public cible, politique de confidentialité (URL : `https://ton-domaine/privacy` — la page existe déjà côté landing).

---

## 5. Premier build Android

Depuis `artifacts/athlete-app/` :

```bash
# Build de test interne (.aab pour Play Store)
eas build --platform android --profile production
```

EAS te demandera de :
- Te connecter à Google (pour récupérer/créer les credentials FCM côté serveur)
- Générer un **keystore** Android — accepte que EAS le gère pour toi (il sera stocké chiffré sur expo.dev)

Le build prend ~15-30 min. À la fin tu obtiens un fichier `.aab` téléchargeable.

---

## 6. Premier upload sur Google Play

**Option A — Manuel (recommandé pour la première fois)** :
1. Console Play → ADAPT → Test → Test interne → Créer une nouvelle version
2. Upload le `.aab` téléchargé depuis EAS
3. Ajoute des testeurs par email (jusqu'à 100, gratuit)
4. Publie sur la piste de test interne → validation immédiate

**Option B — Automatisé via EAS Submit** (plus tard, après le 1er upload manuel) :
1. Crée un compte de service Google Play (Console Play → Configuration → Accès API → Créer un compte de service)
2. Télécharge la clé JSON, place-la dans `artifacts/athlete-app/play-store-service-account.json`
3. ⚠️ **Ajoute ce fichier au `.gitignore`** — c'est une vraie clé secrète
4. Puis : `eas submit --platform android --profile production`

---

## 7. Pour iOS (rappel, déjà partiellement en place)

Comme l'app est déjà sur TestFlight, le compte Apple Developer et l'app dans App Store Connect existent.

Pour faire une nouvelle build :

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Avant le premier `eas submit`, remplace dans `eas.json` :
- `REPLACE_WITH_APPLE_ID_EMAIL` → ton email Apple Developer
- `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` → l'ID numérique de l'app dans App Store Connect (visible dans l'URL : `apps.apple.com/.../id1234567890`)
- `REPLACE_WITH_APPLE_TEAM_ID` → ton Team ID (Apple Developer → Membership)

---

## 8. Récapitulatif checklist

À faire toi :

- [ ] `npm install -g eas-cli` + `eas login`
- [ ] `eas init` dans `artifacts/athlete-app` → reporte `projectId` et `owner` dans `app.json`
- [ ] Vérifier que `ios.bundleIdentifier` correspond à TestFlight
- [ ] Dans `eas.json`, remplacer les `REPLACE_WITH_PROD_API_DOMAIN` par le vrai domaine API
- [ ] Créer projet Firebase + télécharger `google-services.json` à la racine du dossier athlete-app
- [ ] Créer compte Google Play (25 $)
- [ ] Préparer captures d'écran + icône 512x512 + image fonctionnalité 1024x500
- [ ] `eas build --platform android --profile production`
- [ ] Upload manuel du `.aab` en test interne sur Play Console
- [ ] (Plus tard) automatiser via `eas submit`

À ma charge (déjà fait) :

- [x] Config `app.json` Android (package, versionCode, adaptive icon, permissions, FCM file ref)
- [x] Profils EAS Build (`eas.json`)
- [x] Code push Expo côté client + serveur
- [x] Document de publication

---

## Coûts récapitulatifs

| Item | Coût | Récurrence |
|---|---|---|
| Compte Apple Developer | 99 € | par an |
| Compte Google Play | 25 $ (≈ 23 €) | une fois à vie |
| EAS Build | gratuit pour démarrer | (option payante 19 $/mois si besoin) |
| Push FCM (Android) | gratuit, illimité | — |
| Push APNs (iOS) | gratuit, illimité | — |
| Push Expo (relais) | gratuit, illimité | — |
