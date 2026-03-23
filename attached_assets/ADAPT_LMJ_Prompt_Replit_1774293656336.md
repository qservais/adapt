# ADAPT by LMJ — Patch Correctif Complet
# Prompt Replit AI — Version 1.0 — 23 mars 2026

---

## CONTEXTE

Tu travailles sur l'application ADAPT by LMJ, une plateforme de coaching sportif avec :
- Une interface mobile-first pour les athlètes
- Un dashboard web pour les coachs
- Un moteur ADAPT qui calcule un score composite quotidien (sommeil, énergie, stress, courbatures, motivation) et assigne un mode d'entraînement (PERFORMANCE, NORMAL, ADAPT, RECOVERY)

Le client a testé la plateforme et a remonté des bugs critiques, des problèmes UX et des demandes de features. Tu dois TOUT implémenter. Ne saute aucun point. Chaque section est numérotée — confirme chaque ID quand c'est fait.

---

## PHASE 1 — BUGS CRITIQUES (à corriger en premier)

### BUG-01 : Bouton "Ajouter client" → HTTP 404
Le bouton "Ajouter client" dans l'éditeur de programme renvoie une erreur 404.
- Vérifie la route API correspondante
- Vérifie que le endpoint existe côté backend
- Vérifie le lien/href côté frontend
- Teste que l'ajout d'un client fonctionne de bout en bout (création + affichage dans la liste)

### BUG-02 : Champ "Taille" dans le profil client ne fonctionne pas
- Vérifie le binding du champ input (state / controlled component)
- Vérifie la validation (format numérique, cm)
- Vérifie la persistance en base de données (save + reload)
- Affiche la valeur correctement après rechargement de la page

### BUG-03 : Séances non affichées dans le calendrier du profil athlète
Les séances assignées à un athlète n'apparaissent pas dans la vue calendrier de son profil.
- Vérifie la requête qui fetch les séances pour un athlète donné
- Vérifie que le composant calendrier reçoit bien les données
- Vérifie le mapping date ↔ affichage dans le calendrier
- Les séances doivent apparaître sur le bon jour avec leur type et statut

### BUG-04 : Impossible d'ajouter une séance sur un jour précis
- Le workflow d'ajout de séance doit permettre de sélectionner une date exacte via un date picker
- Doit fonctionner aussi pour le jour même (date du jour pré-sélectionnée si on clique sur "aujourd'hui")
- Le clic sur un jour vide dans le calendrier doit ouvrir directement le formulaire d'ajout pour ce jour

### BUG-05 : Impossible de voir le détail d'un bloc
- Chaque bloc (warm-up, strength, conditioning, etc.) doit être cliquable/expandable
- Au clic, afficher le contenu détaillé : exercices, séries, répétitions, repos, tempo, notes
- Ajouter un état ouvert/fermé (accordion ou modal)

---

## PHASE 2 — DASHBOARD ET NAVIGATION

### DASH-01 : Séparer Dashboard et page Athlètes
Le Dashboard et la page Athlètes sont confus. Restructure ainsi :

**Dashboard (page d'accueil coach) :**
- Vue d'ensemble globale
- Alertes actives (fatigue, inactivité, baisse de performance)
- Séances du jour (tous athlètes confondus)
- Activité récente (derniers check-ins, séances complétées)
- KPIs : nombre d'athlètes actifs, taux de complétion séances, score ADAPT moyen

**Page Athlètes (séparée) :**
- Liste des athlètes avec avatar, nom, dernier check-in, score ADAPT actuel
- Recherche et filtres
- Clic sur un athlète → accès à sa fiche complète

### DASH-02 : Vue séances passées / à venir dans le Dashboard
Ajouter au Dashboard :
- Section "Séances passées" avec statut (réalisée ✅, manquée ❌, partielle ⚠️)
- Section "Séances à venir" (prochains 7 jours)
- Calendrier mensuel navigable (mois précédent / suivant + clic sur un jour pour voir le détail)

### DASH-03 : Gérer les séances depuis le profil athlète
Depuis la fiche d'un athlète :
- Afficher toutes ses séances (passées et à venir) dans un calendrier
- Permettre de cliquer sur une séance pour la modifier directement
- Bouton "Ajouter une séance" qui ouvre l'éditeur pré-rempli avec cet athlète

---

## PHASE 3 — ÉDITEUR DE PROGRAMME ET CALENDRIER

### PROG-01 : Copier / Coller une séance
- Bouton "Copier" sur chaque séance (icône clipboard)
- Une fois copiée, pouvoir la "Coller" sur n'importe quel autre jour du calendrier
- La séance collée est un duplicata indépendant (pas un lien)

### PROG-02 : Déplacer une séance par drag & drop
- Implémenter le drag & drop des séances dans la vue calendrier
- Drag d'un jour → drop sur un autre jour
- Mettre à jour la date en base de données
- Feedback visuel pendant le drag (ghost element, placeholder sur la cible)

### PROG-03 : Navigation calendrier étendue
Le calendrier est actuellement limité à la vue semaine. Ajouter :
- Vue semaine (existante, à garder)
- Vue mois (nouvelle)
- Bouton "Aller à une date" (date picker qui navigue directement au jour sélectionné)
- Boutons précédent / suivant (semaine ou mois selon la vue)
- Indicateur visuel du jour actuel

### PROG-04 : Calcul automatique du temps total de séance
- Calculer automatiquement la durée totale d'une séance en additionnant :
  - Temps de travail de chaque exercice (séries × répétitions × tempo estimé)
  - Temps de repos entre séries
  - Temps de repos entre exercices/blocs
  - Temps de transition entre blocs (ajouter une constante configurable, ex: 60s)
- Afficher le temps total estimé en haut de la séance
- Mettre à jour en temps réel quand le coach modifie le contenu

### PROG-05 : Plusieurs séances par jour
- Permettre d'ajouter N séances sur un même jour
- Dans le calendrier, afficher toutes les séances du jour (empilées ou en liste)
- Chaque séance a son propre type, ses propres blocs
- Distinguer visuellement les séances (matin/après-midi ou par type)

### PROG-06 : Dupliquer une séance
- Bouton "Dupliquer" sur chaque séance
- Ouvre un sélecteur de date (et optionnellement d'athlète) pour placer le duplicata
- Copie tous les blocs, exercices, paramètres

---

## PHASE 4 — STRUCTURE DES SÉANCES ET SYSTÈME MODULAIRE

### TYPES-01 : Ajouter les types de séances
Lors de la création d'une séance, le coach doit choisir un type parmi :
- **Développement athlétique** (force, puissance, pliométrie, vitesse, COD, mobilité)
- **Running / Engine** (course, intervalles, fartlek, tempo run)
- **Conditioning** (Hyrox, circuits, AMRAP, EMOM, For Time, Tabata)
- **Strength** (force pure, powerlifting, haltérophilie)

Le type de séance détermine l'icône et la couleur dans le calendrier.
Le coach peut aussi créer des types personnalisés.

### BLOC-01 à BLOC-06 : Système de blocs modulaires
Chaque séance est composée de blocs que le coach assemble librement. Implémente ces blocs :

**BLOC-01 — Warm-up (Échauffement)**
- Exercices de mobilité, activation, échauffement spécifique
- Paramètres : exercice, durée ou répétitions, notes

**BLOC-02 — Strength (Force)**
- Paramètres : exercice, séries, répétitions, charge (kg ou %1RM), tempo (ex: 3-1-2-0), repos entre séries
- Support des supersets (voir SUP-01)

**BLOC-03 — Power (Puissance)**
- Mêmes paramètres que Strength + métriques spécifiques : hauteur (cm), distance (m)
- Adapté pour pliométrie, lancers, sauts

**BLOC-04 — Conditioning (Cardio / Circuit)**
- Support des formats : AMRAP (temps), EMOM (intervalle), For Time, Tabata (travail/repos), Rounds
- Paramètres : exercices, rounds, temps, distance, calories

**BLOC-05 — Core (Gainage / Abdos)**
- Paramètres : exercice, durée ou répétitions, séries, repos

**BLOC-06 — Cool down (Retour au calme)**
- Étirements, respiration, foam rolling
- Paramètres : exercice, durée, notes

**Pour chaque bloc :**
- Le coach peut en ajouter autant qu'il veut dans une séance
- Drag & drop pour réorganiser l'ordre des blocs
- Chaque bloc est collapsible (accordion)
- Chaque bloc affiche son temps estimé

### SUP-01 : Supersets (A1/A2/A3...)
- Dans un bloc Strength ou Power, permettre de grouper des exercices en superset
- Notation A1/A2/A3... (ou B1/B2, C1/C2, etc.)
- Les exercices groupés s'exécutent en enchaînement avant le repos
- Visuellement, les supersets sont regroupés avec une barre latérale ou un fond coloré

### SUP-02 : Circuits
- Permettre de créer un circuit : enchaînement de X exercices, Y rounds
- Paramètres : exercices (liste ordonnée), nombre de rounds, repos entre rounds, repos entre exercices
- Format visuel clair et distinct des exercices linéaires

---

## PHASE 5 — BIBLIOTHÈQUE D'EXERCICES

### LIB-01 : CRUD Exercices
Créer une section "Bibliothèque" accessible depuis le menu principal du coach.
Chaque exercice a :
- Nom
- Catégorie (force, cardio, mobilité, pliométrie, core, étirement...)
- Groupe(s) musculaire(s) ciblé(s) (multi-select)
- Description / instructions
- Image ou vidéo de démonstration (upload ou lien YouTube)
- Tags personnalisés

Le coach peut créer, modifier et supprimer ses exercices.
Pré-remplir la bibliothèque avec des exercices de base (squat, bench press, deadlift, pull-up, plank, etc.).

### LIB-02 : Recherche et filtres
- Barre de recherche par nom
- Filtre par catégorie
- Filtre par groupe musculaire
- Résultats en temps réel (search-as-you-type)

### LIB-03 : Assignation directe
Depuis la bibliothèque, le coach peut :
- Cliquer sur un exercice → bouton "Ajouter à la séance"
- Sélectionner le bloc cible (warm-up, strength, etc.) et la séance cible
- L'exercice est ajouté avec ses paramètres par défaut

Et inversement, depuis l'éditeur de séance :
- Bouton "Ajouter exercice" dans chaque bloc
- Ouvre un picker qui cherche dans la bibliothèque
- Sélection rapide avec auto-complete

---

## PHASE 6 — PLANNING ET RENDEZ-VOUS

### PLAN-01 : Rendez-vous coach / client
- Nouveau type d'événement dans le calendrier : "Rendez-vous"
- Types : séance 1:1, bilan, visio, autre
- Champs : date, heure, durée, athlète, lieu/lien visio, notes
- Visuellement distinct des séances d'entraînement dans le calendrier (couleur/icône différente)

### PLAN-02 : Vue planning globale du coach
- Nouvelle vue "Mon planning" pour le coach
- Affiche TOUS les événements de TOUS les athlètes sur une même timeline
- Filtrable par athlète
- Vue jour / semaine / mois

---

## PHASE 7 — MÉTRIQUES ET SUIVI DE PERFORMANCE

### MET-01 : Métriques par séance
Chaque séance doit permettre à l'athlète de saisir :
- Charges réellement utilisées (par exercice)
- Temps réalisé
- Distance parcourue
- Calories estimées
- Nombre de rounds complétés
- RPE ressenti (échelle 1-10)
- Notes libres

### MET-02 : Tests de performance
Créer une section "Tests" dans le profil athlète :
- Tests disponibles : 1RM (par exercice), max pompes, max tractions, tests running (Cooper, 5K, 10K, sprint 100m)
- Pour chaque test : date, résultat, conditions (RPE, état de forme)
- Le coach peut ajouter des tests personnalisés
- Historique complet des résultats

### MET-03 : Graphiques d'évolution
- Pour chaque métrique et chaque test : graphique linéaire de progression dans le temps
- Axes : date (X) / valeur (Y)
- Comparaison entre périodes (ex : ce mois vs mois précédent)
- Tendance (courbe lissée)
- Affichable depuis le profil athlète et depuis le dashboard coach

### MET-04 : Photo de profil athlète
- Permettre l'upload d'une photo de profil pour chaque athlète
- Upload depuis mobile (caméra ou galerie) et depuis le web
- Affichée dans : liste des athlètes, fiche profil, calendrier, dashboard
- Fallback : initiales si pas de photo

---

## PHASE 8 — SYSTÈME D'ALERTES ET NOTIFICATIONS

### Côté athlète :

**ALR-01 — Rappel séance**
- Notification push et/ou email avant chaque séance programmée
- Délai configurable par le coach (ex : 1h avant, 30min avant)

**ALR-02 — Encouragement**
- Messages d'encouragement automatiques basés sur :
  - Régularité (ex : "3 séances cette semaine, bravo !")
  - Records personnels (ex : "Nouveau PR au squat !")
  - Milestones (ex : "10ème séance complétée")

**ALR-03 — Rappel check-in**
- Rappel quotidien pour remplir le check-in du matin
- Heure configurable par l'athlète
- Si check-in non rempli à l'heure, envoyer un rappel

**ALR-04 — Alerte baisse de performance**
- Si le score ADAPT détecte une baisse significative sur 3+ jours consécutifs
- Notification à l'athlète avec message bienveillant et conseils de récupération

### Côté coach :

**ALC-01 — Variation de performance**
- Alerte si baisse OU hausse significative de performance d'un athlète
- Basé sur : score ADAPT, charges, temps, volume
- Seuils configurables

**ALC-02 — Fatigue / douleur**
- Alerte si un athlète signale fatigue élevée (≥4/5) ou douleur pendant 2+ jours consécutifs via son check-in
- Priorité haute dans le dashboard

**ALC-03 — Inactivité**
- Alerte si un athlète n'a pas fait de séance ET pas de check-in depuis X jours
- Seuil configurable par le coach (défaut : 3 jours)

---

## PHASE 9 — PROGRAMMES INTELLIGENTS ET AUTOMATISATION

### INT-01 : Starter automatique
- Si un athlète n'a pas de programme actif et pas de séance prévue
- Générer automatiquement une séance adaptée via le moteur ADAPT
- Basée sur : profil de l'athlète, objectifs, historique, score ADAPT du jour
- Le coach peut activer/désactiver cette fonction par athlète

### INT-02 : Onboarding intelligent
Lors de l'ajout d'un nouvel athlète, proposer un questionnaire :
- Objectifs (perte de poids, prise de masse, performance, santé générale...)
- Niveau d'expérience (débutant, intermédiaire, avancé)
- Fréquence d'entraînement souhaitée (jours/semaine)
- Disponibilités (jours et créneaux)
- Blessures / limitations
- Équipement disponible

→ Générer automatiquement un programme de base sur 1 à 2 semaines
→ Le coach peut ensuite le modifier et l'affiner

### INT-03 : Offre promotionnelle automatique
- Configurer des offres automatiques (ex : "1 mois offert après achat de 10 séances")
- Basé sur le profil et les objectifs de l'athlète
- Déclenchement automatique quand les conditions sont remplies
- Le coach définit les règles et les offres

---

## PHASE 10 — MULTIMÉDIA ET GUIDES

### MED-01 : Upload vidéo par l'athlète
- L'athlète peut envoyer une vidéo depuis l'app mobile (feedback technique)
- Upload depuis caméra ou galerie
- Le coach reçoit une notification
- Le coach peut visionner et commenter (annotations ou commentaires texte)
- Limiter la durée/taille (ex : max 60s, max 50MB)

### MED-02 : Section Guides
Créer une section "Guides" dans le menu de l'app (visible par l'athlète) :
- RPE — Échelle de perception de l'effort avec explications et exemples visuels
- Tempo — Explication du format tempo (ex: 3-1-2-0) avec animations ou schémas
- Choix des charges — Guide pour choisir la bonne charge selon le programme
- Récupération — Conseils de récupération (sommeil, nutrition, stretching, foam rolling)

Contenu rédigé par le coach, éditable depuis le dashboard coach.
Le coach peut ajouter de nouveaux guides.

---

## PHASE 11 — INTÉGRATIONS FUTURES (préparer l'architecture)

### FUT-01 : Module Nutrition (optionnel)
Ne pas implémenter complètement maintenant, mais préparer la structure :
- Table/modèle pour les repas (date, type de repas, aliments, macros)
- Table/modèle pour l'hydratation (date, quantité)
- Placeholder dans le profil athlète ("Nutrition — bientôt disponible")

### FUT-02 : Connexion montres connectées
Ne pas implémenter maintenant, mais prévoir :
- Modèle de données pour : activité quotidienne, fréquence cardiaque, calories brûlées
- Interface/API abstraite pour recevoir des données de Garmin, Apple Watch, Polar
- Placeholder dans le profil athlète ("Montre connectée — bientôt disponible")

---

## RÈGLES GÉNÉRALES

1. **Ne saute aucun point.** Chaque ID (BUG-01, DASH-01, PROG-01, etc.) doit être implémenté.
2. **Mobile-first.** Toutes les interfaces athlète doivent être responsive et optimisées mobile.
3. **Style existant.** Respecte le design system existant (dark/neon, inspiré Mouvup.be).
4. **Langue.** Toute l'interface est en français.
5. **Base de données.** Crée les migrations/tables nécessaires pour chaque nouvelle feature.
6. **Tests.** Vérifie que chaque feature fonctionne de bout en bout avant de passer à la suivante.
7. **Confirme chaque point.** Après chaque implémentation, indique l'ID du point traité (ex: "✅ BUG-01 corrigé").

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

1. **PHASE 1** — Bugs critiques (BUG-01 à BUG-05)
2. **PHASE 2** — Dashboard et navigation (DASH-01 à DASH-03)
3. **PHASE 4** — Structure des séances et blocs (TYPES-01, BLOC-01 à BLOC-06, SUP-01, SUP-02)
4. **PHASE 5** — Bibliothèque d'exercices (LIB-01 à LIB-03)
5. **PHASE 3** — Éditeur de programme et calendrier (PROG-01 à PROG-06)
6. **PHASE 7** — Métriques et performance (MET-01 à MET-04)
7. **PHASE 8** — Alertes et notifications (ALR-01 à ALR-04, ALC-01 à ALC-03)
8. **PHASE 9** — Programmes intelligents (INT-01 à INT-03)
9. **PHASE 10** — Multimédia et guides (MED-01, MED-02)
10. **PHASE 11** — Préparation intégrations futures (FUT-01, FUT-02)

Commence par la PHASE 1. Corrige chaque bug un par un et confirme avec l'ID.
