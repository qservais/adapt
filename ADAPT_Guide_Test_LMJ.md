# ADAPT by LMJ — Guide de test v1
**Destinataire :** Loic Mehdi Jaumotte (Coach)
**Version :** V1 — Prototype fonctionnel
**Date :** Mars 2026

---

## Ce que tu as entre les mains

Tu accèdes à deux interfaces distinctes :

1. **Le dashboard coach** (navigateur web, sur ordinateur ou téléphone) — ta vue centrale pour gérer tes athlètes
2. **L'app athlète** (smartphone, via Expo Go) — l'expérience que vivent tes athlètes au quotidien

---

## 1. Dashboard Coach — Accès navigateur

**URL :**
```
https://971cbe58-3054-4fc7-a517-57cfa262a1f9-00-2ma14lu0ae9v5.worf.replit.dev/coach-dashboard
```

**Tes identifiants :**
| Champ | Valeur |
|-------|--------|
| Email | `coach@adapt.demo` |
| Mot de passe | `Demo1234!` |

### Ce que tu peux faire dans le dashboard

**Onglet Clients**
- Voir la liste de tes athlètes actifs
- Cliquer sur un athlète pour voir son profil complet : infos, programme actif, alertes, historique de check-ins
- Modifier le mode de séance (Normal / Performance / Adapt / Recovery) directement depuis le profil athlète
- Lier un nouvel athlète via son code d'invitation

**Onglet Programmes**
- Voir et éditer les programmes créés (BLOC 0, BLOC 1)
- Dans un programme : modifier les séances semaine par semaine — tu édites uniquement la variante "Normal", les 3 autres (Perf / Adapt / Recovery) se génèrent automatiquement

**Onglet Alertes**
- Les check-ins avec signaux négatifs (fatigue élevée, douleurs, etc.) remontent ici pour que tu puisses intervenir rapidement

**Onglet Messages**
- Messagerie directe avec tes athlètes (interface en place, envoi de messages)

---

## 2. App Athlète — Accès smartphone

L'app athlète tourne sur **Expo Go** — une app gratuite qui permet de tester des apps mobiles sans passer par l'App Store.

### Étape 1 — Installer Expo Go

- **iPhone :** App Store → chercher "Expo Go" → installer
- **Android :** Play Store → chercher "Expo Go" → installer

### Étape 2 — Ouvrir l'app de test

Une fois Expo Go installé, ouvre le lien suivant depuis ton téléphone (ou scanne le QR dans le navigateur) :

```
https://971cbe58-3054-4fc7-a517-57cfa262a1f9-00-2ma14lu0ae9v5.expo.worf.replit.dev
```

> Si la connexion ne se lance pas directement, ouvre Expo Go → "Enter URL manually" → colle l'adresse ci-dessus.

### Étape 3 — Se connecter

Deux comptes de test sont disponibles :

**Compte athlète démo (Owen Soontjens) :**
| Champ | Valeur |
|-------|--------|
| Email | `o.soontjens@gmail.com` |
| Mot de passe | `Owen1234!` |

> Owen est inscrit au programme BLOC 0 qui démarre le 23 mars 2026. C'est le compte le plus complet pour tester le parcours athlète.

### Ce que tu peux faire dans l'app athlète

**Accueil**
- Voir la carte de la séance du jour (avec nom, durée estimée, nombre d'exercices)
- Si la séance est terminée → carte "Séance terminée" avec le bilan de la journée

**Check-in quotidien**
- Évaluer son état du jour (sommeil, énergie, stress, courbatures, motivation)
- L'algorithme détermine automatiquement le mode de séance : Normal / Performance / Adapt / Recovery
- Si un double check-in est tenté → message d'erreur en français

**Séance**
- La séance s'ouvre uniquement après le check-in
- Exercice par exercice avec : nom, sets × reps, charge en kg, repos, cue du coach
- Variante adaptée au mode du jour (charges recalculées automatiquement)

**Profil**
- Informations personnelles (prénom, date de naissance, genre)
- Nom du coach affiché
- Option "Délier mon coach" (pour tester le flow de séparation)

---

## 3. Points à valider pour ton retour

Voici les aspects sur lesquels ton retour est le plus utile :

### Côté coach (dashboard)
- [ ] Les informations athlète (recap hebdo, check-ins) sont claires et utiles ?
- [ ] L'éditeur de programme (séances, exercices, charges) est compréhensible ?
- [ ] Le système d'alertes correspond à ce dont tu as besoin ?
- [ ] Quelque chose manque dans le profil athlète ?
- [ ] La navigation globale est intuitive ?

### Côté athlète (app)
- [ ] Le check-in est simple et rapide à faire ?
- [ ] La présentation de la séance du jour est claire ?
- [ ] Les exercices sont bien affichés (charges, séries, cues) ?
- [ ] Il manque quelque chose pour qu'un athlète puisse s'en sortir seul ?
- [ ] Le langage / les textes sont bons ?

### Questions ouvertes
- Quels types de programmes veux-tu pouvoir créer au-delà du format actuel ?
- Comment veux-tu gérer les athlètes qui n'ont pas encore de programme ?
- Y a-t-il des métriques que tu veux suivre et qui ne sont pas encore là ?

---

## 4. Informations techniques importantes

> **Note :** L'app est en mode développement actif sur notre serveur. Elle fonctionne tant que le serveur est actif. Si tu tombes sur une page blanche ou une erreur de connexion, signale-le pour que je relance le serveur.

> **Les données sont réelles** — tes actions (édition de programme, modification de charge, etc.) sont enregistrées en base de données. Tu peux tester librement, on pourra remettre à zéro à tout moment.

---

## 5. Comment me donner ton retour

**Format libre** — un message vocal, un voice note WhatsApp, des screenshots annotés, ou un doc texte, tout convient.

**Idéalement, réponds à :**
1. Ce qui fonctionne bien et que tu veux garder
2. Ce qui ne correspond pas à ta façon de travailler
3. Ce qui manque pour la V2
4. Une note globale sur l'expérience (0 à 10)

---

*Document préparé pour la phase de test V1 — ADAPT by LMJ*
