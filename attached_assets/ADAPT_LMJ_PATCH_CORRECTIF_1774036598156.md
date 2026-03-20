# ADAPT by LMJ — PATCH CORRECTIF COMPLET V1.1

## CONTEXTE

Tu travailles sur l'application ADAPT by LMJ, une app de coaching adaptatif construite avec React Native (Expo) + Node.js/Express + PostgreSQL. L'app est en production sur Replit mais présente de nombreux bugs critiques et problèmes UX. Ce document est le patch correctif exhaustif à appliquer. Traite-le comme une spécification impérative : chaque point doit être corrigé.

**Règle n°1 : TOUTE l'interface utilisateur doit être en français. Aucun texte anglais ne doit apparaître nulle part — boutons, labels, messages d'erreur, placeholders, notifications, tout.**

---

## PARTIE 1 — BUGS CRITIQUES À CORRIGER EN PRIORITÉ

### 1.1 Lancement de séance : écran blanc / spinner infini

**Symptôme :** Après le check-in, quand l'athlète appuie sur "Démarrer" la séance, l'écran devient blanc ou affiche un spinner infini.

**Causes probables et corrections :**

1. **Vérifier que l'endpoint `GET /sessions/today` retourne bien des données.** Le problème vient très probablement du fait qu'aucun programme n'est assigné à l'athlète, ou que les `session_variants` et `session_exercises` n'existent pas pour le mode calculé par le check-in.

2. **Ajouter des données seed obligatoires.** Créer un script `seed.ts` ou `seed.js` qui insère :
   - Un programme de démonstration (4 semaines, 3 séances/semaine)
   - Pour chaque séance : les 4 variantes (performance, normal, adapt, recovery)
   - Pour chaque variante : 5–8 exercices avec charges nominales
   - Une bibliothèque de 30+ exercices de base (squat, développé couché, rowing, etc.)

3. **Gérer le cas "pas de programme assigné" côté frontend.** Si `GET /sessions/today` retourne null ou 404, NE PAS afficher un écran blanc. Afficher à la place :
   ```
   Aucun programme actif
   Ton coach n'a pas encore créé de programme pour toi.
   [Contacter mon coach]  (si coach lié)
   [Explorer un programme démo]  (si pas de coach)
   ```

4. **Gérer les erreurs réseau avec un try/catch et un état d'erreur explicite.** Chaque écran qui fetch des données doit avoir 3 états :
   - `loading` → spinner court (max 3 secondes, puis timeout avec message)
   - `error` → message d'erreur en français + bouton "Réessayer"
   - `data` → affichage normal

5. **Vérifier la logique de sélection de variante.** Après le check-in, le `session_mode` est calculé (ex: "normal"). L'API doit ensuite chercher la variante correspondante dans `session_variants` WHERE `mode = session_mode` AND `session_id` = séance du jour. Si cette variante n'existe pas → fallback sur la variante "normal", et si aucune variante n'existe → erreur explicite.

### 1.2 Check-in → Séance : le flow complet doit fonctionner sans interruption

Après le check-in, le flow doit être :
1. Score ADAPT affiché (ex: 74/100)
2. Mode séance affiché (ex: NORMAL)
3. Bouton "Voir ma séance" → navigue vers l'écran séance
4. Écran séance affiche : titre, mode, durée estimée, nombre d'exercices, bouton "Démarrer"
5. Bouton "Démarrer" → appel `PUT /sessions/:id/start` → navigue vers l'écran exercice
6. Exercice par exercice avec charge pré-remplie, bouton série terminée
7. À la fin → écran feedback (RPE + ressenti + note)

**Chaque transition entre ces écrans doit être testée et fonctionnelle.**

---

## PARTIE 2 — INTERNATIONALISATION COMPLÈTE EN FRANÇAIS

### 2.1 Créer un fichier de traductions centralisé

Créer un fichier `src/i18n/fr.ts` (ou `translations/fr.json`) contenant TOUTES les chaînes de l'application. Ne JAMAIS écrire de texte en dur dans les composants.

### 2.2 Chaînes obligatoires (liste non exhaustive)

```json
{
  "common": {
    "loading": "Chargement...",
    "error": "Une erreur est survenue",
    "retry": "Réessayer",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "back": "Retour",
    "next": "Suivant",
    "done": "Terminé",
    "delete": "Supprimer",
    "edit": "Modifier",
    "close": "Fermer",
    "search": "Rechercher",
    "send": "Envoyer",
    "yes": "Oui",
    "no": "Non"
  },
  "auth": {
    "login": "Se connecter",
    "register": "Créer un compte",
    "email": "Adresse e-mail",
    "password": "Mot de passe",
    "confirmPassword": "Confirmer le mot de passe",
    "firstName": "Prénom",
    "lastName": "Nom de famille",
    "forgotPassword": "Mot de passe oublié ?",
    "alreadyHaveAccount": "J'ai déjà un compte",
    "noAccount": "Pas encore de compte ?",
    "logout": "Se déconnecter",
    "deleteAccount": "Supprimer mon compte"
  },
  "onboarding": {
    "welcome": "Bienvenue sur ADAPT",
    "letsStart": "Commencer",
    "step": "Étape",
    "of": "sur",
    "gender": "Tu es :",
    "genderMale": "Homme",
    "genderFemale": "Femme",
    "birthDate": "Date de naissance",
    "weight": "Poids (kg)",
    "height": "Taille (cm)",
    "fitnessLevel": "Ton niveau",
    "beginner": "Débutant",
    "intermediate": "Intermédiaire",
    "advanced": "Avancé",
    "primaryGoal": "Ton objectif principal",
    "goalPerformance": "Performance",
    "goalHealth": "Santé",
    "goalAesthetic": "Esthétique",
    "goalFitness": "Remise en forme",
    "trainingFrequency": "Combien de fois tu t'entraînes par semaine ?",
    "injuries": "Blessures actuelles (optionnel)",
    "injuriesPlaceholder": "Ex: douleur épaule droite, genou fragile...",
    "coachCode": "Code coach",
    "coachCodePlaceholder": "Entre le code de ton coach",
    "coachCodeExplain": "Si tu as un coach, entre son code d'invitation.",
    "continueWithoutCoach": "Continuer sans coach",
    "tutorialTitle1": "Check-in quotidien",
    "tutorialDesc1": "Chaque matin, 30 secondes pour évaluer ton état.",
    "tutorialTitle2": "Séance adaptée",
    "tutorialDesc2": "Ta séance s'ajuste automatiquement à ton état du jour.",
    "tutorialTitle3": "Progression intelligente",
    "tutorialDesc3": "Ton coach suit tout en temps réel et peut intervenir."
  },
  "home": {
    "greeting": "Bonjour",
    "checkinDone": "Check-in fait",
    "checkinPending": "Ton check-in du matin",
    "checkinCTA": "Faire mon check-in",
    "checkinSubtitle": "30 secondes pour adapter ta séance d'aujourd'hui",
    "sessionOfDay": "Séance du jour",
    "startSession": "Démarrer",
    "sessionLockedTitle": "Séance verrouillée",
    "sessionLockedDesc": "Fais ton check-in pour débloquer ta séance",
    "streak": "jours consécutifs",
    "lastSession": "Dernière séance",
    "noProgram": "Aucun programme actif",
    "noProgramDesc": "Ton coach n'a pas encore créé de programme pour toi.",
    "contactCoach": "Contacter mon coach",
    "adaptScore": "Score ADAPT",
    "minutes": "min",
    "exercises": "exercices"
  },
  "checkin": {
    "title": "Check-in",
    "howDidYouSleep": "Comment tu as dormi ?",
    "sleepBad": "Très mal",
    "sleepGood": "Parfaitement",
    "energyLevel": "Quel est ton niveau d'énergie ?",
    "energyLow": "Épuisé",
    "energyHigh": "Au max",
    "stressLevel": "Ton niveau de stress aujourd'hui ?",
    "stressLow": "Zen",
    "stressHigh": "Très stressé",
    "sorenessLevel": "As-tu des courbatures ?",
    "sorenessLow": "Aucune",
    "sorenessHigh": "Très intenses",
    "motivationLevel": "Ton envie de t'entraîner ?",
    "motivationLow": "Zéro",
    "motivationHigh": "Au max",
    "painToggle": "J'ai une douleur articulaire ou localisée",
    "painDescription": "Décris ta douleur",
    "painPlaceholder": "Ex: genou droit, douleur au mouvement",
    "painIntensity": "Intensité de la douleur",
    "cycleToggle": "Phase du cycle menstruel",
    "cycleMenstrual": "Menstruelle",
    "cycleFollicular": "Folliculaire",
    "cycleOvulatory": "Ovulatoire",
    "cycleLuteal": "Lutéale",
    "submit": "Valider mon check-in",
    "resultTitle": "Check-in terminé",
    "resultScore": "Score ADAPT",
    "resultMode": "Mode séance du jour",
    "viewSession": "Voir ma séance",
    "alreadyDone": "Tu as déjà fait ton check-in aujourd'hui.",
    "modifiableUntil": "Modifiable jusqu'à 14h.",
    "windowClosed": "La fenêtre de check-in est fermée (après 14h)."
  },
  "session": {
    "warmup": "Échauffement",
    "mainBlock": "Bloc principal",
    "exercise": "Exercice",
    "of": "sur",
    "set": "Série",
    "sets": "séries",
    "reps": "reps",
    "load": "Charge",
    "suggestedLoad": "Charge suggérée",
    "actualLoad": "Charge utilisée",
    "rest": "Repos",
    "restTimer": "Temps de repos",
    "skipRest": "Passer",
    "setComplete": "Série terminée",
    "coachNote": "Note du coach",
    "quitSession": "Quitter la séance",
    "quitConfirm": "Ta progression sera sauvegardée. Quitter ?",
    "sessionComplete": "Séance terminée !",
    "totalDuration": "Durée totale",
    "exercisesDone": "Exercices réalisés",
    "giveFeedback": "Donner mon feedback",
    "modePerformance": "PERFORMANCE",
    "modeNormal": "NORMAL",
    "modeAdapt": "ADAPT",
    "modeRecovery": "RECOVERY",
    "updatedByCoach": "Mise à jour par ton coach"
  },
  "feedback": {
    "title": "Feedback",
    "sessionDone": "Séance terminée",
    "howWasIt": "Comment tu as vécu cette séance ?",
    "rpeLabel": "RPE (Effort ressenti)",
    "rpeLow": "Trop facile",
    "rpeHigh": "À la limite",
    "tooEasy": "Trop facile",
    "wellCalibrated": "Bien calibrée",
    "tooHard": "Trop difficile",
    "noteOptional": "Note (optionnel)",
    "notePlaceholder": "Quelque chose à ajouter ?",
    "submit": "Valider mon feedback",
    "confirmation": "Super séance !",
    "streakMessage": "{count} jours consécutifs !"
  },
  "profile": {
    "title": "Mon profil",
    "personalInfo": "Informations personnelles",
    "firstName": "Prénom",
    "lastName": "Nom de famille",
    "email": "E-mail",
    "birthDate": "Date de naissance",
    "age": "Âge",
    "gender": "Genre",
    "weight": "Poids (kg)",
    "height": "Taille (cm)",
    "fitnessLevel": "Niveau",
    "primaryGoal": "Objectif principal",
    "trainingPreferences": "Préférences d'entraînement",
    "coachSection": "Mon coach",
    "noCoach": "Pas de coach lié",
    "linkCoach": "Lier un coach",
    "unlinkCoach": "Délier mon coach",
    "unlinkConfirm": "Tu perdras l'accès à tes programmes et à la messagerie. Continuer ?",
    "coachName": "Coach",
    "coachCode": "Code coach",
    "enterCoachCode": "Entrer un code coach",
    "cycleTracking": "Suivi du cycle menstruel",
    "notifications": "Notifications",
    "checkinReminder": "Rappel check-in",
    "sessionReminder": "Rappel séance",
    "coachMessages": "Messages du coach",
    "streakAlerts": "Alertes streak",
    "about": "À propos",
    "version": "Version",
    "privacyPolicy": "Politique de confidentialité",
    "termsOfService": "Conditions d'utilisation",
    "logout": "Se déconnecter",
    "deleteAccount": "Supprimer mon compte",
    "deleteConfirm": "Cette action est irréversible. Toutes tes données seront supprimées."
  },
  "history": {
    "title": "Historique",
    "last30Days": "30 derniers jours",
    "weekSummary": "Résumé de la semaine",
    "sessionsCompleted": "Séances faites",
    "avgRPE": "RPE moyen",
    "avgScore": "Score moyen",
    "progression": "Progression",
    "noData": "Pas encore de données",
    "completed": "Complétée",
    "missed": "Manquée",
    "adapted": "Adaptée",
    "recovery": "Récupération"
  },
  "messaging": {
    "title": "Messages",
    "placeholder": "Écrire un message...",
    "noMessages": "Pas encore de messages",
    "noCoach": "Lie un coach pour accéder à la messagerie",
    "sent": "Envoyé",
    "read": "Lu"
  },
  "modes": {
    "performance": "PERFORMANCE",
    "performanceDesc": "Séance à charge maximale, intensité élevée",
    "normal": "NORMAL",
    "normalDesc": "Séance standard, charges nominales",
    "adapt": "ADAPT",
    "adaptDesc": "Séance allégée, focus sur l'exécution",
    "recovery": "RECOVERY",
    "recoveryDesc": "Mobilité, léger cardio, étirements"
  },
  "errors": {
    "generic": "Une erreur est survenue. Réessaie.",
    "network": "Problème de connexion. Vérifie ton réseau.",
    "checkinAlreadyExists": "Tu as déjà fait ton check-in aujourd'hui.",
    "checkinWindowClosed": "La fenêtre de check-in est fermée (après 14h).",
    "sessionNotUnlocked": "Fais d'abord ton check-in pour accéder à ta séance.",
    "programNotFound": "Aucun programme trouvé.",
    "painOverrideActive": "Séance bloquée — ton coach doit valider ta reprise.",
    "invalidCredentials": "E-mail ou mot de passe incorrect.",
    "tokenExpired": "Session expirée, reconnecte-toi.",
    "coachCodeInvalid": "Code coach invalide ou expiré."
  },
  "nav": {
    "home": "Accueil",
    "session": "Séance",
    "history": "Stats",
    "messages": "Messages",
    "profile": "Profil"
  }
}
```

---

## PARTIE 3 — CORRECTIONS UX/UI CRITIQUES

### 3.1 Genre dans l'onboarding + condition cycle menstruel

**Ajouter un écran "Genre" dans l'onboarding**, AVANT l'écran profil de base :
- Deux choix : "Homme" / "Femme"
- Stocker dans la table `users` : nouveau champ `gender ENUM('male', 'female') NOT NULL`
- Migration DB : `ALTER TABLE users ADD COLUMN gender VARCHAR(10);`

**Conditionner le cycle menstruel :**
- Dans le check-in : l'étape "Phase du cycle" ne doit apparaître QUE si `user.gender === 'female' AND user.cycle_tracking === true`
- Dans le profil : le toggle "Suivi du cycle menstruel" ne doit apparaître QUE si `user.gender === 'female'`
- Si `gender === 'male'` → ces options sont complètement cachées, invisibles

### 3.2 Date de naissance au lieu de l'âge

**Remplacer le champ `age` par `birth_date` :**
- Migration DB : `ALTER TABLE users ADD COLUMN birth_date DATE; ALTER TABLE users DROP COLUMN age;`
- Onboarding : utiliser un DatePicker natif (pas un champ texte)
- Profil : afficher la date de naissance ET l'âge calculé automatiquement
- Calcul de l'âge : `Math.floor((Date.now() - birthDate) / (365.25 * 24 * 60 * 60 * 1000))`
- Format d'affichage : "JJ/MM/AAAA" (format belge/français)

### 3.3 Profil enrichi

L'écran profil doit contenir toutes ces sections, dans cet ordre :

**Section 1 — Informations personnelles**
- Avatar/photo (placeholder avec initiales si pas de photo)
- Prénom (modifiable)
- Nom de famille (modifiable)
- E-mail (lecture seule)
- Genre (lecture seule, défini à l'onboarding)
- Date de naissance (DatePicker)
- Poids en kg (input numérique avec step 0.5)
- Taille en cm (input numérique)

**Section 2 — Objectifs & niveau**
- Niveau fitness (Débutant / Intermédiaire / Avancé) — sélecteur
- Objectif principal (Performance / Santé / Esthétique / Remise en forme) — sélecteur
- Fréquence d'entraînement par semaine (1-7) — stepper
- Blessures actuelles (champ texte optionnel)

**Section 3 — Mon coach**
- Si coach lié : afficher le prénom du coach + option "Délier mon coach" (avec confirmation)
- Si pas de coach : afficher un champ "Entrer un code coach" avec bouton "Lier"
- Le code coach est un code de 6 caractères qu'on peut entrer à tout moment, pas uniquement à l'onboarding

**Section 4 — Préférences** (uniquement si `gender === 'female'`)
- Toggle "Suivi du cycle menstruel"

**Section 5 — Notifications**
- Toggle par type : Rappel check-in / Rappel séance / Messages coach / Alertes streak

**Section 6 — Compte**
- Se déconnecter
- Supprimer mon compte (avec double confirmation)
- Version de l'app

### 3.4 Connexion coach depuis le profil

L'athlète DOIT pouvoir lier un coach APRÈS l'onboarding. Workflow :
1. Profil → Section "Mon coach" → "Entrer un code coach"
2. Input de 6 caractères (auto-majuscule, format : XXXXXX)
3. Appel `POST /coach/link` avec `{ "invite_code": "XXXXXX" }`
4. Si valide → afficher le nom du coach, refresh des données
5. Si invalide → message d'erreur "Code coach invalide ou expiré"

**Nouvel endpoint backend si inexistant :**
```
POST /coach/link
Body: { "invite_code": "ABC123" }
Response 200: { "coach": { "id": "uuid", "first_name": "Loïc" } }
Response 404: { "error": { "code": "INVITE_CODE_INVALID" } }
```

---

## PARTIE 4 — REFONTE VISUELLE COMPLÈTE (DARK MODE / NEON SPORT)

### 4.1 Design System — Couleurs

Le design doit donner une sensation premium, sportive, moderne et sombre — inspiré par le site mouvup.be.

```javascript
const colors = {
  // Fond principal
  background: {
    primary: '#0A0A0A',      // Fond principal (quasi noir)
    secondary: '#141414',     // Cartes, surfaces surélevées
    tertiary: '#1E1E1E',      // Inputs, champs de saisie
    elevated: '#252525',      // Modales, overlays
  },
  
  // Accents néon
  accent: {
    primary: '#00F0FF',       // Cyan néon — accent principal (boutons, scores, highlights)
    secondary: '#A855F7',     // Violet — accent secondaire (badges, éléments premium)
    gradient: ['#00F0FF', '#A855F7'],  // Gradient cyan→violet pour les éléments clés
  },
  
  // Modes ADAPT (chaque mode a sa couleur identitaire)
  modes: {
    performance: '#3B82F6',   // Bleu vif
    normal: '#22C55E',        // Vert
    adapt: '#F59E0B',         // Orange/ambre
    recovery: '#EF4444',      // Rouge
  },
  
  // Texte
  text: {
    primary: '#FFFFFF',       // Texte principal
    secondary: '#A0A0A0',    // Texte secondaire / labels
    muted: '#666666',         // Texte désactivé / hints
    inverse: '#0A0A0A',       // Texte sur fond clair (boutons)
  },
  
  // Utilitaires
  border: '#2A2A2A',          // Bordures subtiles
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Gradients spéciaux
  scoreGlow: 'rgba(0, 240, 255, 0.15)',  // Glow autour du score ADAPT
  cardGlow: 'rgba(0, 240, 255, 0.05)',   // Glow subtil sur les cartes interactives
}
```

### 4.2 Design System — Typographie

```javascript
const typography = {
  fontFamily: {
    heading: 'DM Sans',       // Titres — ou 'Inter' si DM Sans non dispo
    body: 'DM Sans',          // Corps de texte
    mono: 'JetBrains Mono',   // Chiffres, scores, données
  },
  sizes: {
    hero: 48,       // Score ADAPT sur l'écran résultat
    h1: 28,         // Titres d'écran
    h2: 22,         // Sous-titres
    h3: 18,         // Titres de section
    body: 16,       // Texte courant
    caption: 14,    // Labels, hints
    small: 12,      // Metadata, timestamps
  },
  weights: {
    bold: '700',
    semibold: '600',
    medium: '500',
    regular: '400',
  }
}
```

### 4.3 Design System — Composants globaux

**Bouton principal :**
- Fond : gradient cyan→violet (`linear-gradient(135deg, #00F0FF, #A855F7)`)
- Texte : noir (#0A0A0A), bold
- Border-radius : 16px
- Hauteur min : 56px
- Effet press : scale(0.97) + opacité 0.9
- Shadow : `0 0 20px rgba(0, 240, 255, 0.3)`

**Bouton secondaire :**
- Fond : transparent
- Bordure : 1px solid #2A2A2A
- Texte : blanc
- Border-radius : 16px

**Carte :**
- Fond : #141414
- Border : 1px solid #2A2A2A
- Border-radius : 20px
- Padding : 20px
- Au hover/press : bordure passe à rgba(0, 240, 255, 0.3)

**Input :**
- Fond : #1E1E1E
- Border : 1px solid #2A2A2A
- Border-radius : 14px
- Texte : blanc
- Placeholder : #666666
- Focus : bordure cyan (#00F0FF)

**Slider (check-in) :**
- Track : #2A2A2A (fond), gradient cyan→violet (rempli)
- Thumb : cercle blanc 24x24 avec glow cyan
- Valeur affichée : grande, en DM Sans mono, cyan
- Labels min/max en gris (#666666) sous le slider

**Barre de navigation bottom :**
- Fond : #0A0A0A avec bordure top #2A2A2A
- Icônes : gris (#666666) quand inactif, cyan (#00F0FF) quand actif
- Labels sous les icônes en 10px
- 5 items : Accueil / Séance / Stats / Messages / Profil

### 4.4 Écrans spécifiques — Directives visuelles

**Home Dashboard (check-in fait) :**
- Header : "Bonjour [Prénom]" en h1, date du jour en caption grise
- Carte score ADAPT : grande carte avec le score en hero (48px), typographie mono, couleur du mode, avec un glow subtil autour du chiffre. Badge du mode en dessous (ex: pill "NORMAL" en vert).
- Carte séance du jour : titre séance, mode, durée, nombre d'exercices, gros bouton "DÉMARRER" en gradient
- Bande streak : icône flamme 🔥 + "[N] jours consécutifs" en texte
- Dernière séance : mini carte avec date + RPE

**Home Dashboard (check-in à faire) :**
- Le CTA check-in prend toute la place visuelle. Grande carte avec animation subtile (pulse sur le bouton ou gradient animé).
- Texte : "Ton check-in du matin" en h2 + "30 secondes pour adapter ta séance" en body gris
- Bouton : "FAIRE MON CHECK-IN" en gradient, plein écran width
- Séance du jour : carte grisée/désactivée avec un cadenas

**Check-in flow :**
- Progress bar en haut : fine barre gradient cyan→violet
- Chaque étape = 1 slider plein écran
- Question en h2 centré
- Slider custom avec labels min/max
- Valeur actuelle : grand chiffre (32px) en cyan sous le slider
- Bouton "Suivant" fixé en bas
- Transition entre étapes : slide horizontal fluide

**Résultat check-in :**
- Score en très grand (60-72px), typographie mono, couleur du mode
- Animation d'apparition du score (compteur de 0 à N, ou fade-in)
- Cercle ou arc animé autour du score
- Badge mode avec description courte
- Bouton "VOIR MA SÉANCE" proéminent en bas

**Séance en cours :**
- Header : numéro exercice (ex: "3/8"), bouton quitter (✕)
- Nom exercice en h1, gras
- Série actuelle : "Série 2 sur 4" en caption
- Deux grosses pills côte à côte : REPS (ex: "10") et CHARGE (ex: "80 kg")
- Input charge utilisée : stepper -/+ par 2.5kg, grand et facile à toucher en salle
- Note coach : bulle discrète si elle existe
- Timer repos : countdown circulaire, grand, avec bouton "PASSER"
- Bouton "SÉRIE TERMINÉE ✓" en bas, large, vert

**Feedback post-séance :**
- Résumé : titre séance + durée + mode
- Slider RPE 1-10 avec labels
- 3 boutons ressenti côte à côte : Trop facile / Bien calibrée / Trop difficile (pills sélectionnables)
- Note libre : textarea optionnelle
- Bouton "VALIDER" en bas

**Historique / Stats :**
- Calendrier mensuel : jours colorés selon le type de séance (vert = complétée, orange = adapt, rouge = recovery, gris = manquée, vide = repos)
- Graphe ADAPT Score sur 30 jours (ligne avec gradient sous la courbe)
- Cards résumé hebdo : séances, RPE moyen, score moyen

**Messagerie :**
- Style chat classique : bulles à droite (envoyé, cyan foncé) et à gauche (reçu, gris foncé)
- Input en bas avec bouton envoyer
- Indicateur "lu" (double check)
- Caché si pas de coach lié

---

## PARTIE 5 — FONCTIONNALITÉS MANQUANTES À IMPLÉMENTER

### 5.1 Flow séance complet (exercice par exercice)

L'exécution d'une séance doit fonctionner comme suit :

1. **Écran overview séance** : titre, mode (avec couleur), durée estimée, liste des exercices. Bouton "DÉMARRER".

2. **Phase échauffement** (si des exercices d'échauffement existent) : liste simple, chaque exo avec durée ou reps. Timer optionnel. Bouton "Échauffement terminé".

3. **Phase exercices principaux** : un exercice à la fois, plein écran.
   - Afficher : nom, série actuelle/total, reps cibles, charge suggérée (adaptée au mode)
   - Input : charge réellement utilisée (stepper +/- 2.5kg, pré-rempli avec la charge suggérée)
   - Bouton "SÉRIE TERMINÉE" → si dernière série → passe à l'exercice suivant. Sinon → timer repos.
   - Timer repos : countdown circulaire avec le temps configuré (ex: 90s). Bouton "PASSER" pour skip.
   - Transition entre exercices : swipe ou bouton

4. **Écran fin de séance** : durée totale, exercices faits, bouton "Donner mon feedback"

5. **Feedback** : RPE + ressenti + note libre → submit → confirmation avec streak

### 5.2 Système de streak

- Calculer le streak côté serveur : nombre de jours consécutifs avec un check-in complété
- Afficher sur la Home : icône flamme + "[N] jours consécutifs"
- Milestones à 7, 14, 30, 60, 90, 100 jours → notification spéciale
- Le streak ne se brise PAS les jours de repos programmés du programme (s'il y a un programme avec des jours off, ces jours ne comptent pas)
- Afficher un compteur encourageant sur l'écran Home : "6 jours — ne brise pas la série !"

### 5.3 Mode hors-ligne pour le check-in

- Sauvegarder le check-in en local (AsyncStorage) si pas de connexion
- Synchroniser dès que la connexion revient
- Afficher un indicateur "Hors ligne — synchronisation en attente"
- La séance doit aussi fonctionner hors ligne (les données sont cachées au moment du fetch)

### 5.4 Animations et micro-interactions

Pour rendre l'app moins "plate" et plus engageante :

1. **Score ADAPT — animation de compteur** : le score monte de 0 à sa valeur finale en ~1.5 secondes (avec easing)
2. **Transition entre écrans** : slides fluides (pas de jump cuts)
3. **Boutons — feedback haptique** : vibration légère sur iOS/Android au tap des boutons principaux
4. **Slider check-in — feedback haptique** : légère vibration à chaque step du slider
5. **Série terminée — petite animation de confirmation** : checkmark qui apparaît avec un bounce
6. **Streak milestone — animation célébration** : confetti ou effet lumineux quand on atteint 7/14/30 jours
7. **Mode badge — apparition** : le badge du mode (PERFORMANCE/NORMAL/ADAPT/RECOVERY) apparaît avec un slide-up et une couleur glow
8. **Pull-to-refresh** : sur la Home, pull-to-refresh pour re-fetcher les données
9. **Skeleton loading** : au lieu d'un spinner, afficher des placeholders animés (shimmer effect) pendant le chargement des données
10. **Timer repos — animation circulaire** : arc qui se vide progressivement, avec changement de couleur dans les 10 dernières secondes (vers rouge)

**Librairies recommandées :**
- `react-native-reanimated` pour les animations fluides
- `expo-haptics` pour le feedback haptique
- `react-native-svg` pour le timer circulaire et les graphes
- `lottie-react-native` si tu veux des animations complexes (confetti, etc.)

### 5.5 Gestion des états vides

Chaque écran doit avoir un "empty state" élégant au lieu d'un écran blanc :

- **Historique vide** : illustration ou icône + "Tu n'as pas encore de données. Fais ton premier check-in !" + bouton CTA
- **Messagerie sans coach** : "Lie un coach pour accéder à la messagerie" + bouton vers le profil
- **Messagerie sans messages** : "Pas encore de messages. Envoie un premier message à ton coach !"
- **Séance sans programme** : "Ton coach n'a pas encore créé de programme. Contacte-le !"
- **Profil sans coach** : dans la section coach, afficher le champ code coach directement

### 5.6 Navigation et structure d'écrans

**Bottom Tab Navigation (5 onglets) :**
1. **Accueil** (icône maison) — Home dashboard
2. **Séance** (icône haltère/play) — Séance du jour ou état verrouillé
3. **Stats** (icône graphe) — Historique et progression
4. **Messages** (icône bulle) — Chat avec le coach (badge notification si non lu)
5. **Profil** (icône utilisateur) — Profil et paramètres

**Stack Navigation :**
- Check-in flow : modal ou stack par-dessus la Home
- Exercice en cours : stack par-dessus la Séance
- Feedback : stack après la séance

---

## PARTIE 6 — CORRECTIONS BACKEND

### 6.1 Migrations DB à appliquer

```sql
-- 1. Ajouter le genre
ALTER TABLE users ADD COLUMN gender VARCHAR(10);

-- 2. Remplacer age par birth_date
ALTER TABLE users ADD COLUMN birth_date DATE;
ALTER TABLE users DROP COLUMN IF EXISTS age;

-- 3. S'assurer que le champ training_frequency existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3;

-- 4. S'assurer que le champ injuries existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS injuries TEXT;
```

### 6.2 Endpoint manquant : liaison coach depuis le profil

```javascript
// POST /coach/link
// Permet à un athlète de lier un coach via son code d'invitation
// Auth: athlete only

router.post('/coach/link', authMiddleware, async (req, res) => {
  const { invite_code } = req.body;
  const athleteId = req.user.id;
  
  // Vérifier que l'utilisateur est un athlète
  if (req.user.role !== 'athlete') {
    return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN' } });
  }
  
  // Vérifier que l'athlète n'a pas déjà un coach
  const athlete = await db.query('SELECT coach_id FROM users WHERE id = $1', [athleteId]);
  if (athlete.rows[0].coach_id) {
    return res.status(409).json({ error: { code: 'COACH_ALREADY_LINKED', message: 'Tu as déjà un coach lié. Délie-le d\'abord.' } });
  }
  
  // Chercher le coach par code d'invitation
  const coach = await db.query('SELECT id, first_name FROM users WHERE invite_code = $1 AND role = $2', [invite_code.toUpperCase(), 'coach']);
  if (!coach.rows.length) {
    return res.status(404).json({ error: { code: 'INVITE_CODE_INVALID', message: 'Code coach invalide ou expiré.' } });
  }
  
  // Vérifier la limite de 50 clients
  const clientCount = await db.query('SELECT COUNT(*) FROM users WHERE coach_id = $1', [coach.rows[0].id]);
  if (parseInt(clientCount.rows[0].count) >= 50) {
    return res.status(422).json({ error: { code: 'COACH_CLIENT_LIMIT', message: 'Ce coach a atteint sa limite de clients.' } });
  }
  
  // Lier
  await db.query('UPDATE users SET coach_id = $1 WHERE id = $2', [coach.rows[0].id, athleteId]);
  
  return res.json({ coach: { id: coach.rows[0].id, first_name: coach.rows[0].first_name } });
});

// POST /coach/unlink
// Permet à un athlète de délier son coach
router.post('/coach/unlink', authMiddleware, async (req, res) => {
  const athleteId = req.user.id;
  await db.query('UPDATE users SET coach_id = NULL WHERE id = $1', [athleteId]);
  return res.json({ success: true });
});
```

### 6.3 Vérifier et corriger l'ADAPT ENGINE

Le calcul du score doit suivre EXACTEMENT cette logique :

```javascript
function calculateAdaptScore(checkin, previousRpe = null, cyclePhase = null) {
  // Étape 1 — Normalisation (0-1)
  const sleep_n = (checkin.sleep - 1) / 4;
  const energy_n = (checkin.energy - 1) / 4;
  const stress_n = (checkin.stress - 1) / 4;
  const soreness_n = (checkin.soreness - 1) / 4;
  const motivation_n = (checkin.motivation - 1) / 4;
  
  // Étape 2 — Score pondéré (stress et courbatures INVERSÉS)
  let score = (sleep_n * 0.25)
            + (energy_n * 0.20)
            + ((1 - stress_n) * 0.15)
            + ((1 - soreness_n) * 0.20)
            + (motivation_n * 0.20);
  
  // Étape 3 — Modificateur RPE veille
  if (previousRpe !== null) {
    if (previousRpe >= 9) score *= 0.85;
    else if (previousRpe >= 8) score *= 0.90;
    else if (previousRpe <= 4) score *= 1.05;
  }
  
  // Étape 4 — Modificateur cycle
  if (cyclePhase) {
    const cycleModifiers = {
      menstrual: 0.85,
      follicular: 1.00,
      ovulatory: 1.05,
      luteal: 0.95,
    };
    score *= cycleModifiers[cyclePhase] || 1.00;
  }
  
  // Étape 5 — Score final (0-100)
  const adaptScore = Math.round(Math.min(100, Math.max(0, score * 100)));
  
  // Étape 6 — Mode
  let sessionMode;
  if (checkin.has_pain) {
    sessionMode = 'recovery'; // OVERRIDE ABSOLU
  } else if (adaptScore >= 80) {
    sessionMode = 'performance';
  } else if (adaptScore >= 60) {
    sessionMode = 'normal';
  } else if (adaptScore >= 40) {
    sessionMode = 'adapt';
  } else {
    sessionMode = 'recovery';
  }
  
  return { adaptScore, sessionMode };
}
```

### 6.4 Données seed — Programme de démonstration

Créer un seed script qui insère un programme complet pour permettre de tester l'app sans coach. Ce programme doit contenir :

- **Bibliothèque d'exercices** (minimum 30 exercices) :
  - Compound : Squat, Développé couché, Soulevé de terre, Rowing barre, Développé militaire, Tractions, Dips, Fentes, Hip thrust, Clean & press
  - Isolation : Curl biceps, Extension triceps, Élévations latérales, Leg extension, Leg curl, Calf raises, Face pull, Curl marteau
  - Cardio : Rameur, Assault bike, Corde à sauter, Burpees
  - Mobilité : Étirements dynamiques, Foam rolling, Rotations épaules, Cat-cow, World's greatest stretch, 90/90 stretch

- **Programme "Starter 4 semaines"** avec 3 séances par semaine :
  - Lundi : Force Haut du Corps (8 exercices)
  - Mercredi : Force Bas du Corps (8 exercices)
  - Vendredi : Full Body + Cardio (6 exercices)

- **4 variantes par séance** avec charges adaptées :
  - Performance : 100-105% charge nominale
  - Normal : 100% charge nominale
  - Adapt : 75-80% charge nominale
  - Recovery : 0-40% charge nominale (mobilité, poids de corps)

- **Noms des exercices EN FRANÇAIS** dans toute la bibliothèque

---

## PARTIE 7 — CHECKLIST DE VALIDATION

Avant de considérer le patch comme terminé, vérifier chaque point :

### Bugs critiques
- [ ] Le check-in complet fonctionne (tous les sliders + validation + score affiché)
- [ ] La séance se lance après le check-in (pas d'écran blanc)
- [ ] Chaque exercice de la séance est navigable (série par série)
- [ ] Le feedback post-séance fonctionne
- [ ] L'inscription et la connexion fonctionnent

### Français
- [ ] AUCUN texte en anglais visible nulle part dans l'app
- [ ] Tous les messages d'erreur sont en français
- [ ] Tous les placeholders sont en français
- [ ] Les dates sont au format JJ/MM/AAAA
- [ ] Les poids sont en kg (pas en lbs)

### UX / UI
- [ ] Le fond est noir/très sombre partout (#0A0A0A)
- [ ] L'accent cyan néon est visible sur les éléments clés
- [ ] Chaque mode a sa couleur (bleu, vert, orange, rouge)
- [ ] Les boutons principaux sont en gradient cyan→violet
- [ ] Aucun écran blanc — tous les états vides ont un message
- [ ] Les sliders du check-in sont tactiles et fluides
- [ ] Le timer repos fonctionne avec un countdown visuel

### Fonctionnalités
- [ ] Le genre est demandé à l'onboarding (Homme/Femme)
- [ ] Le cycle menstruel est caché pour les hommes
- [ ] La date de naissance est demandée (avec DatePicker)
- [ ] Le profil permet de lier/délier un coach
- [ ] Le streak est affiché sur la Home
- [ ] La navigation bottom a 5 onglets fonctionnels
- [ ] La messagerie est cachée si pas de coach

### Backend
- [ ] L'ADAPT ENGINE calcule correctement (tester avec les tests d'acceptance du PRD)
- [ ] Les migrations DB sont appliquées (gender, birth_date)
- [ ] Les données seed sont insérées (exercices + programme démo)
- [ ] L'endpoint POST /coach/link fonctionne
- [ ] L'endpoint POST /coach/unlink fonctionne

---

## NOTES FINALES

- **Priorité absolue** : que le flow check-in → séance → exercice → feedback fonctionne de bout en bout sans erreur.
- **Priorité 2** : tout en français avec la bonne UX/UI dark neon.
- **Priorité 3** : profil enrichi, connexion coach, streak, animations.
- **Ne jamais afficher un écran blanc**. Toujours un message, un empty state, ou un skeleton loading.
- **Ne jamais afficher du texte en anglais**. Vérifier chaque string.
- **Tester le mode "sans coach"** : l'app doit être fonctionnelle même sans coach lié (messagerie cachée, alertes désactivées, programme démo disponible).
