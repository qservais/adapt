# ADAPT — Configuration Push Notifications iOS

## Contexte du projet

- **App** : ADAPT (coaching fitness)
- **Stack** : Expo (React Native) + Express API + PostgreSQL
- **Bundle ID réel dans TestFlight** : `app.replit.adaptbylmj`
- **Compte EAS Replit interne** : `replit-private-971cbe58-3054-4fc7-a517-57cfa262a1f9`
- **Projet EAS Replit** : `adapt-by-lmj`
- **Team ID Apple Developer** : `43DC8SQ9ZJ`
- **Apple ID** : `quentin.servais@hotmail.fr`

---

## Ce qui a été fait

### 1. Clé APNs créée sur Apple Developer
- **Key ID** : `ZMC5WV9VMP`
- **Nom** : ADAPT Push Notifications
- **Type** : Team Scoped (All topics) — couvre tous les Bundle IDs du compte
- **Environnement** : Sandbox & Production
- **Fichier** : `AuthKey_ZMC5WV9VMP.p8`

### 2. Certificats de distribution créés
- iOS Distribution (Mar 2027)
- Distribution x2 (May 2027) — créés depuis ce Mac (clé privée présente dans le Trousseau)

### 3. Push certificates créés pour `app.replit.adapt`
- Apple Sandbox Push Services — exp. 2027/06/19
- Apple Push Services — exp. 2027/06/19
- **Note** : créés pour `app.replit.adapt` mais l'app réelle utilise `app.replit.adaptbylmj`

### 4. Provisioning Profile créé
- **Nom** : ADAPT Distribution
- **Type** : App Store
- **Bundle ID** : `app.replit.adapt`
- **Expiration** : 2027/05/20

### 5. Credentials configurés sur expo.dev (compte done-agency)
- Distribution certificate : Valid
- Provisioning profile : Valid
- Push key `ZMC5WV9VMP` : enregistrée
- **Note** : ces credentials sont sur le compte `done-agency`, PAS sur le compte Replit interne — donc non utilisés par les builds actuels

### 6. app.json — état actuel
```json
{
  "expo": {
    "name": "ADAPT",
    "slug": "athlete-app",
    "ios": {
      "bundleIdentifier": "com.adaptsystem.athlete"
    },
    "extra": {}
  }
}
```
- `owner: "done-agency"` et `projectId` ont été retirés car ils causaient une erreur `EXPO_UNAUTHORIZED` lors du publish Replit

---

## Le problème actuel

### Erreur lors du test de notification push

```json
{
  "data": {
    "status": "error",
    "message": "Could not find APNs credentials for app.replit.adaptbylmj (@replit-private-971cbe58-3054-4fc7-a517-57cfa262a1f9/adapt-by-lmj). You may need to generate or upload new push credentials.",
    "details": {
      "error": "InvalidCredentials"
    }
  }
}
```

### Cause racine

Replit construit l'app via son propre compte EAS interne (`replit-private-971cbe58...`) avec le Bundle ID `app.replit.adaptbylmj`. Ce projet EAS interne n'a **aucune clé APNs enregistrée**.

Les credentials configurés sur expo.dev (`done-agency/adapt`) ne sont **pas utilisés** par les builds Replit.

### Erreur EXPO_UNAUTHORIZED lors du publish

Quand on essaie de republier depuis Replit, l'UI affiche :
```
{"type":"ApiError","code":"EXPO_UNAUTHORIZED","message":"You need to be authenticated with Expo for this route."}
```
C'est une erreur côté plateforme Replit — leur token Expo est invalide/expiré.

---

## Token push en base (production)

| Email | Push Token |
|-------|-----------|
| `quent.servais@gmail.com` | `ExponentPushToken[VDwB4vBMBZCJj3AJJRbdhA]` |
| `adnane.kabaj@gmail.com` | `ExponentPushToken[1WyM3GLno_QW2xm9S0u25-]` |
| `cocoalessio02@gmail.com` | `ExponentPushToken[h73-jVBoxZ0sPO_jUu5Rtf]` |

Les tokens sont des `ExponentPushToken[...]` — ils passent obligatoirement par les serveurs Expo, qui ont besoin des credentials APNs enregistrés dans le projet EAS.

---

## Architecture code push notifications

### `artifacts/athlete-app/hooks/usePushNotifications.ts`
- Au login, appelle `Notifications.getExpoPushTokenAsync()` pour obtenir le token
- POST vers `/api/users/push-token` pour sauvegarder en base
- Le token est mis en cache dans AsyncStorage pour éviter les re-registrations inutiles

### `artifacts/api-server/src/routes/users.ts`
- `POST /api/users/push-token` — sauvegarde le token dans `users.push_token`

### `artifacts/api-server/src/services/web-push.service.ts`
- Service d'envoi de notifications (actuellement web push)

---

## État du build 24 (TestFlight)

Confirmation depuis App Store Connect — métadonnées du build 24 :

| Champ | Valeur |
|-------|--------|
| Identifiant de lot | `app.replit.adaptbylmj` |
| aps-environment | **production** ✅ |
| application-identifier | `43DC8SQ9ZJ.app.replit.adaptbylmj` |
| Team Identifier | `43DC8SQ9ZJ` |

**Le build est déjà compilé avec l'entitlement push notifications en production.** L'app est prête — il manque uniquement les credentials APNs côté Expo.

---

## Ce qu'il faut faire pour débloquer

### Solution prioritaire — Contacter Replit Support

Envoyer ce message au support Replit :

> "When trying to send push notifications from my app, I get this error:
> `Could not find APNs credentials for app.replit.adaptbylmj (@replit-private-971cbe58-3054-4fc7-a517-57cfa262a1f9/adapt-by-lmj)`
>
> The APNs key has been created on Apple Developer portal:
> - Key ID: `ZMC5WV9VMP`
> - Team ID: `43DC8SQ9ZJ`
> - Type: Team Scoped (All topics), Sandbox & Production
>
> Also, publishing fails with EXPO_UNAUTHORIZED.
>
> Can you register the APNs key in the internal Replit EAS project `adapt-by-lmj` and fix the publish authentication?"

### Alternative — Accès direct au projet Replit privé

Tenter d'accéder à :
```
https://expo.dev/accounts/replit-private-971cbe58-3054-4fc7-a517-57cfa262a1f9/projects/adapt-by-lmj/credentials
```
Si accessible, uploader la Push Key `ZMC5WV9VMP` (fichier `.p8` + Key ID + Team ID).

---

## Identifiants Apple Developer — récapitulatif

| Élément | Valeur |
|---------|--------|
| Team ID | `43DC8SQ9ZJ` |
| APNs Key ID | `ZMC5WV9VMP` |
| Fichier APNs | `AuthKey_ZMC5WV9VMP.p8` |
| Bundle ID (builds Replit) | `app.replit.adaptbylmj` |
| Bundle ID (app.json) | `com.adaptsystem.athlete` |
| Compte Expo Replit | `replit-private-971cbe58-3054-4fc7-a517-57cfa262a1f9` |
| Projet Expo Replit | `adapt-by-lmj` |
