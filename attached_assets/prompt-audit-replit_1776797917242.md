# 🔍 AUDIT TECHNIQUE COMPLET — MODE CORRECTION NON-DESTRUCTIVE

## ⚠️ RÈGLES ABSOLUES (À RESPECTER AVANT TOUTE ACTION)

1. **NE RIEN REFACTORER** : ne modifie AUCUNE architecture, AUCUNE logique métier, AUCUN flow utilisateur existant.
2. **NE RIEN SUPPRIMER** : aucune fonctionnalité, aucun composant, aucune route, aucun endpoint, aucune variable d'environnement.
3. **NE RIEN AJOUTER** qui ne soit pas strictement nécessaire pour faire fonctionner ce qui est DÉJÀ prévu dans le code.
4. **CORRIGER UNIQUEMENT** : bugs, erreurs, dysfonctionnements, liens cassés, imports manquants, typages incorrects, appels API défaillants, etc.
5. **PRÉSERVER** : le design, les textes, les couleurs, les animations, les traductions, la structure des fichiers, les noms de variables.
6. Si un doute existe entre "corriger" et "modifier le comportement", tu **dois me demander** avant d'agir.

---

## 🧭 DÉTECTION AUTONOME DU CONTEXTE

Avant toute autre action, tu dois **deviner le contexte du projet par toi-même** en inspectant le code. Ne me pose aucune question sur le contexte.

Produis en sortie un bloc :

```
## CONTEXTE DÉTECTÉ
- Nom probable du projet : ...
- Type d'application : [Web / Mobile / Hybride / API / Dashboard / E-commerce / Landing page / etc.]
- Framework principal : ... (+ version)
- Stack complète détectée : ... (langages, libs UI, ORM, styling, animations, state management)
- Plateforme de déploiement cible : ...
- Intégrations tierces identifiées : [Resend, Stripe, Supabase, Firebase, Shopify, HubSpot, etc.]
- Langues supportées (i18n) : ...
- Public cible supposé : [B2B / B2C / Admin interne / etc.]
- Fonctionnalités principales déduites : ...
```

Base-toi sur : `package.json`, `README.md` (si présent), structure des dossiers, noms de routes, contenu des composants, variables d'environnement référencées, commentaires, textes visibles.

---

## 📋 PHASE 1 — INVENTAIRE COMPLET (lecture seule, AUCUNE modification)

Produis un rapport structuré en Markdown listant :

### 1.1 Structure du projet
- Arborescence complète des dossiers/fichiers pertinents
- Stack technique détectée (framework, versions, librairies principales)
- Type d'app (web/mobile/hybride), plateforme cible

### 1.2 Fonctionnalités prévues
Pour chaque feature identifiée dans le code, indique :
- Nom et emplacement (fichier, route, écran)
- État : ✅ Fonctionne | ⚠️ Partiellement cassé | ❌ Non fonctionnel | 🔍 Non testable sans contexte
- Preuve (extrait de code, logs, erreur console)

### 1.3 Points d'entrée et flux critiques
- Routes / navigation / deep links
- Formulaires et soumissions
- Appels API (internes et externes)
- Authentification et sessions
- Uploads / downloads / fichiers
- Paiements, notifications, emails
- Intégrations tierces

---

## 🐛 PHASE 2 — DÉTECTION DES ERREURS

Analyse et reporte sans correction immédiate :

### 2.1 Erreurs bloquantes (priorité 1)
- Erreurs de build / compilation / typage (TypeScript, ESLint)
- Imports manquants ou cassés
- Variables d'environnement référencées mais absentes
- Dépendances manquantes dans `package.json`
- Erreurs console (runtime) au chargement et à l'interaction
- Routes ou écrans qui plantent
- Appels API qui retournent 4xx/5xx

### 2.2 Erreurs fonctionnelles (priorité 2)
- Boutons / liens sans action ou mal câblés
- Formulaires qui ne soumettent pas
- Données qui ne s'affichent pas alors qu'elles sont fetchées
- États de chargement / erreur / vide non gérés
- Logique conditionnelle incorrecte (if/else, guards, permissions)
- Problèmes de timezone, formats de date, devise
- Traductions manquantes (i18n)

### 2.3 Erreurs UI/UX (priorité 3)
- Éléments hors viewport, z-index cassés, overflow
- Responsive cassé (mobile / tablette / desktop)
- Images 404, favicon manquant, meta tags absents
- Accessibilité critique (alt text, aria, contraste < AA)
- Animations qui causent des reflows ou plantent

### 2.4 Erreurs mobiles spécifiques (si app mobile détectée)
- Permissions natives manquantes (caméra, location, notifications)
- Deep linking / universal links
- Safe areas, keyboard avoidance
- Performances (re-renders, FlatList vs map, etc.)
- Build iOS / Android (config, bundle ID, signing)

### 2.5 Sécurité et configuration
- Secrets exposés côté client
- CORS / CSP mal configurés
- Validation manquante côté serveur
- Tokens en localStorage sans besoin
- HTTPS / certificats

---

## 🔧 PHASE 3 — PLAN DE CORRECTION (avant exécution)

Avant de modifier quoi que ce soit, produis un tableau :

| # | Fichier | Ligne | Erreur détectée | Correction proposée | Risque de régression | Validation requise |
|---|---------|-------|-----------------|---------------------|----------------------|-------------------|
| 1 | ... | ... | ... | ... | Faible/Moyen/Élevé | Oui/Non |

**ATTENDS MA VALIDATION** avant d'exécuter les corrections marquées "Risque Moyen/Élevé".
Les corrections "Risque Faible" (imports, typos, variables manquantes) peuvent être appliquées directement.

---

## ✅ PHASE 4 — CORRECTION

Applique les corrections **une par une**, en respectant strictement :
- Aucune ligne modifiée hors du périmètre listé dans le plan
- Aucun formatage/reformat de code non lié à la correction
- Aucun renommage de variable, fonction, fichier
- Aucune modification des dépendances sauf si strictement nécessaire (et dans ce cas, justifie)

Après chaque correction, indique :
- ✅ Ce qui a été changé (diff lisible)
- 🧪 Comment vérifier que ça fonctionne
- ⚠️ Effets de bord potentiels à surveiller

---

## 🧪 PHASE 5 — TESTS DE VALIDATION

Pour chaque fonctionnalité corrigée, exécute ou simule :
- Test du flow utilisateur complet (happy path)
- Test des cas d'erreur (mauvaise saisie, offline, 404)
- Test responsive (mobile/desktop si web)
- Test des intégrations tierces (ping des API externes)
- Vérification console : 0 erreur, warnings documentés

Produis un rapport final :
- ✅ Corrections appliquées et validées
- ⚠️ Corrections appliquées mais nécessitant une vérification manuelle de ma part
- ❌ Problèmes détectés mais NON corrigés (avec raison : hors scope, besoin d'info, risque trop élevé)
- 📌 Recommandations pour plus tard (sans les appliquer)

---

## 🚫 CE QUE TU NE DOIS PAS FAIRE

- ❌ Me poser des questions sur le contexte du projet (devine-le)
- ❌ Proposer une "meilleure" architecture
- ❌ Remplacer une lib par une "plus moderne"
- ❌ Ajouter des tests unitaires si absents
- ❌ Mettre à jour les dépendances vers des versions majeures
- ❌ Modifier le design, les copies, les couleurs
- ❌ Toucher aux fichiers de configuration (`next.config`, `app.json`, `tsconfig`) sauf si c'est LA cause directe d'un bug
- ❌ Créer de nouveaux fichiers sauf si strictement nécessaire à une correction

---

## 📤 FORMAT DE SORTIE

1. Bloc **CONTEXTE DÉTECTÉ** (déduit par toi seul, sans me demander)
2. Rapport Phase 1 (inventaire)
3. Rapport Phase 2 (erreurs détectées, classées par priorité)
4. Plan Phase 3 (tableau de corrections) → **STOP et attends ma validation**
5. Exécution Phase 4 (avec diffs)
6. Rapport Phase 5 (validation finale)

**Commence maintenant par détecter le contexte, puis enchaîne sur la Phase 1.**
