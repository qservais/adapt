# ADAPT by LMJ — Guide pour le Coach

---

## C'est quoi ADAPT ?

ADAPT est une plateforme digitale de coaching sportif en deux parties :

- **Une application mobile** pour chaque athlète (disponible sur iPhone et Android)
- **Un tableau de bord web** réservé au coach, accessible depuis n'importe quel navigateur

L'objectif : adapter automatiquement l'entraînement de chaque athlète à son état physique du jour — sans que le coach ait besoin d'intervenir manuellement pour chaque ajustement.

---

## Comment ça marche au quotidien

### Du côté de l'athlète (chaque matin)

L'athlète ouvre l'app et répond à **5 curseurs** (moins de 30 secondes) :

| Curseur | Ce que ça mesure |
|---|---|
| 😴 Qualité du sommeil | A-t-il bien récupéré ? |
| ⚡ Niveau d'énergie | Se sent-il capable d'un effort ? |
| 🧠 Stress | Son système nerveux est-il surchargé ? |
| 💪 Courbatures | A-t-il des douleurs musculaires résiduelles ? |
| 🔥 Motivation | Veut-il vraiment s'entraîner ? |

L'app calcule un **Score ADAPT** de 0 à 100 à partir de ces réponses.

---

### Le Score ADAPT → 4 modes d'entraînement

| Score | Mode | Couleur | Ce qui change |
|---|---|---|---|
| 80 – 100 | **PERFORMANCE** | Violet | Charges augmentées +5%, volume maximal |
| 60 – 79 | **NORMAL** | Vert | Programme de référence tel que planifié |
| 40 – 59 | **ADAPT** | Ambre | Charges −22%, volume −20% |
| 0 – 39 | **RECOVERY** | Rouge | Charges −50%, volume −50% |

> **Exemple :** Julien a prévu un squat à 100 kg aujourd'hui. Il est fatigué, score 45 → mode ADAPT. L'app lui propose 78 kg automatiquement. Il s'entraîne sans se blesser et sans décision à prendre.

---

### Règles spéciales

- **Douleur signalée** → Mode RECOVERY forcé + alerte P1 immédiate envoyée au coach
- **3 jours sans check-in** → Alerte P2 (inactivité) envoyée au coach
- **RPE ≥ 9 la veille** (effort maximal) → Score légèrement réduit pour favoriser la récup
- **Phase lutéale** (pour les athlètes qui suivent leur cycle) → Ajustement automatique

---

## Le tableau de bord du coach

Accessible sur : **https://adapt-hello3407.replit.app/coach-dashboard**  
Identifiants démo : `coach@adapt.demo` / `Demo1234!`

### 1. Vue d'ensemble (Home)
- Score ADAPT de chaque athlète du jour en temps réel
- Alertes actives (douleurs, inactivité)
- Qui a fait son check-in, qui ne l'a pas encore fait

### 2. Athlètes
- Liste complète des athlètes sous contrat
- Profil détaillé : historique des check-ins, courbe du score ADAPT sur 30 jours
- Gestion du lien coach/athlète (inviter, délier)

### 3. Programmes
Deux vues disponibles :

**Par athlète** — Voir et gérer les programmes de chaque athlète
- Créer un programme (nom, durée en semaines, date de début)
- Ouvrir le détail : calendrier semaine par semaine, séance par séance

**Bibliothèque de blocs** — Base de séances réutilisables
- Toutes les séances créées apparaissent ici comme "blocs"
- Recherche par nom, filtre par type (Force / Cardio / Hybride / Mobilité)
- Bouton **"Réutiliser"** : copier un bloc dans n'importe quel autre programme, à la semaine et au jour voulus

### 4. Éditeur de séances
Quand tu ouvres un programme et cliques sur une séance :
- Ajouter / supprimer / réordonner des exercices
- Définir : nombre de séries, répétitions, charge (kg), temps de repos, indication coach
- Les variantes Performance / Adapt / Recovery sont **générées automatiquement** à la sauvegarde

---

## L'application athlète

Connexion : email + mot de passe définis lors de l'inscription via code d'invitation.

### Ce que l'athlète voit et fait

| Écran | Fonction |
|---|---|
| **Accueil** | Score ADAPT du jour, séance du jour (avec mode auto-sélectionné), bouton pour démarrer |
| **Séance en cours** | Exercices un par un, charges pré-calculées selon le mode, case à cocher par série |
| **Fin de séance** | Durée réelle, message de félicitations ou d'encouragement |
| **Profil** | Infos personnelles, nom du coach, bouton pour se délier |

---

## Comptes de démonstration

| Rôle | Email | Mot de passe | Particularité |
|---|---|---|---|
| Coach | `coach@adapt.demo` | `Demo1234!` | Accès dashboard complet |
| Owen | `o.soontjens@gmail.com` | `Owen1234!` | Athlète réel du coach |
| Julien | `julien@adapt.demo` | `Demo1234!` | Scores normaux / performance |
| Sara | `sara@adapt.demo` | `Demo1234!` | Haute performance |
| Tom | `tom@adapt.demo` | `Demo1234!` | Alerte P1 douleur genou |
| Marie | `marie@adapt.demo` | `Demo1234!` | Alerte P2 inactivité |

---

## Flux typique d'une semaine

```
Lundi matin
  Athlète ouvre l'app → check-in (30 sec) → Score calculé
  App propose la séance du jour adaptée au score
  Athlète s'entraîne → marque la séance terminée

Pendant la semaine
  Coach consulte le dashboard : voit les scores, les alertes
  Si alerte P1 (douleur) → coach contacte l'athlète

Dimanche
  Coach révise les programmes, ajuste pour la semaine suivante
  Peut copier des blocs de la bibliothèque pour aller plus vite
```

---

## Questions fréquentes du coach

**Les charges sont calculées comment ?**  
Tu entres la charge de référence dans la variante Normale. L'algorithme applique les pourcentages selon le mode (×1.05, ×0.75, ×0.30) et arrondit au 0.25 kg près.

**L'athlète peut-il choisir son mode ?**  
Non. Le mode est calculé côté serveur et l'athlète ne peut pas le modifier. Ça évite les biais.

**Que se passe-t-il si l'athlète ne fait pas son check-in ?**  
La séance reste disponible mais le mode par défaut est NORMAL. Une alerte P2 est déclenchée après 3 jours sans check-in.

**Peut-on avoir plusieurs programmes actifs pour un athlète ?**  
Oui. Un athlète peut avoir plusieurs programmes, mais l'app mobile affiche la séance du programme marqué ACTIF en priorité.

**Comment inviter un nouvel athlète ?**  
Depuis le dashboard → Athlètes → Inviter. Un code est généré, l'athlète l'utilise à l'inscription.

---

*Document généré pour ADAPT by LMJ — Version de mars 2026*
