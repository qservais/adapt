# ADAPT by LMJ — PATCH CORRECTIF PARTIE 2
## Nouvelles features & améliorations (à appliquer APRÈS le patch partie 1)

Ce document contient UNIQUEMENT les features supplémentaires à ajouter. Le patch partie 1 (bugs critiques, traduction FR, genre/date naissance, profil enrichi, liaison coach, design system dark/neon, flow séance, streak, animations, empty states) doit être appliqué en premier.

**Rappel contexte :** App React Native (Expo) + Node.js/Express + PostgreSQL. Tout en français. Design dark/neon (fond #0A0A0A, accent cyan #00F0FF, violet #A855F7). Pas de paywall — outil inclus dans l'offre coaching.

---

## 1 — GIFS DÉMO D'EXERCICES

### 1.1 Migration DB

```sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS demo_gif_url VARCHAR(500);
```

### 1.2 Comportement frontend

Chaque exercice affiche un GIF animé dans l'écran de séance :

**Dans l'écran exercice en cours :**
- Zone GIF en haut de l'écran : 200×200px, `resizeMode="contain"`, fond #141414, border-radius 16px
- Le GIF tourne en boucle automatiquement
- Tap sur le GIF → modal plein écran avec le GIF en grand + nom exercice + groupe musculaire ciblé
- Bouton "Fermer" en haut à droite de la modal

**Dans l'écran overview de la séance (liste des exercices) :**
- Miniature GIF 48×48 à gauche de chaque exercice dans la liste
- Si pas de GIF : afficher une icône représentant le groupe musculaire (voir fallback)

**Fallback si `demo_gif_url` est null :**
- Afficher une icône stylisée du groupe musculaire principal :
  - Pectoraux → icône poitrine
  - Dos → icône dos
  - Jambes → icône jambe
  - Épaules → icône épaule
  - Bras → icône biceps
  - Core → icône abdos
  - Cardio → icône coeur
  - Mobilité → icône étirement
- Sous l'icône : texte "Démo à venir" en caption grise (#666666)
- Utiliser des icônes de `lucide-react-native` ou `@expo/vector-icons` (MaterialCommunityIcons a de bonnes icônes fitness)

### 1.3 Source des GIFs et seed

**Sources libres de droits pour les GIFs d'exercices :**
- MuscleWiki (https://musclewiki.com) — GIFs par exercice et par groupe musculaire
- Wger (https://wger.de) — open source, API publique avec images d'exercices
- Alternative : créer des GIFs simples à partir de vidéos libres de droits

**Format recommandé :** GIF ou WebP animé, max 300KB par fichier, résolution ~400×400px

**Hébergement :** uploader les GIFs sur Cloudflare R2 ou AWS S3 (le même bucket que les autres fichiers de l'app). Stocker l'URL complète dans `demo_gif_url`.

**Dans le seed script, mettre à jour chaque exercice avec son URL de GIF :**
```javascript
// Exemple de mise à jour dans le seed
await db.query(`
  UPDATE exercises SET demo_gif_url = $1 WHERE name = $2
`, ['https://storage.adapt-lmj.com/gifs/squat-barre.gif', 'Squat barre']);
```

Pour le lancement, si les GIFs ne sont pas encore prêts, laisser le champ null — le fallback avec icône s'affichera proprement.

### 1.4 Composant React Native

```jsx
// Composant ExerciseDemo réutilisable
const ExerciseDemo = ({ gifUrl, muscleGroup, exerciseName, size = 200 }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  if (!gifUrl) {
    return (
      <View style={[styles.demoContainer, { width: size, height: size }]}>
        <MuscleGroupIcon group={muscleGroup} size={48} color="#666666" />
        <Text style={styles.demoPlaceholder}>Démo à venir</Text>
      </View>
    );
  }
  
  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Image 
          source={{ uri: gifUrl }} 
          style={[styles.gifImage, { width: size, height: size }]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: gifUrl }} style={styles.gifFullscreen} resizeMode="contain" />
          <Text style={styles.modalExerciseName}>{exerciseName}</Text>
        </View>
      </Modal>
    </>
  );
};
```

---

## 2 — SYSTÈME DE BADGES & ACHIEVEMENTS

### 2.1 Migrations DB

```sql
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

### 2.2 Seed — Insérer les 19 badges

```sql
INSERT INTO badges (code, name, description, icon, category, sort_order) VALUES
  ('first_checkin',      'Premier pas',       'Fais ton tout premier check-in',              '👣', 'special',  1),
  ('first_session',      'C''est parti !',    'Termine ta première séance',                  '🎯', 'special',  2),
  ('streak_7',           'Semaine parfaite',  '7 jours consécutifs de check-in',             '🔥', 'streak',   10),
  ('streak_14',          'Deux semaines !',   '14 jours consécutifs',                        '⚡', 'streak',   11),
  ('streak_30',          'Machine !',         '30 jours consécutifs',                        '💎', 'streak',   12),
  ('streak_60',          'Inarrêtable',       '60 jours consécutifs',                        '🏆', 'streak',   13),
  ('streak_100',         'Légende',           '100 jours consécutifs',                       '👑', 'streak',   14),
  ('sessions_10',        '10 séances',        'Termine 10 séances',                          '💪', 'sessions', 20),
  ('sessions_25',        '25 séances',        'Termine 25 séances',                          '🏋️', 'sessions', 21),
  ('sessions_50',        'Demi-centurion',    'Termine 50 séances',                          '⭐', 'sessions', 22),
  ('sessions_100',       'Centurion',         'Termine 100 séances',                         '🌟', 'sessions', 23),
  ('first_pr',           'Record !',          'Bats ton premier record personnel',           '📈', 'pr',       30),
  ('pr_5',               'Collectionneur',    '5 records personnels battus',                 '🎖️', 'pr',       31),
  ('pr_10',              'Machine à PRs',     '10 records personnels battus',                '🥇', 'pr',       32),
  ('perfect_week',       'Semaine complète',  'Toutes les séances de la semaine faites',     '✨', 'special',  40),
  ('recovery_king',      'Roi de la récup',   'Complète 5 séances RECOVERY',                '🧘', 'special',  41),
  ('performance_beast',  'Bête de perf',      '10 séances PERFORMANCE',                     '🦁', 'special',  42),
  ('early_bird',         'Lève-tôt',          'Check-in avant 7h du matin',                 '🌅', 'special',  43),
  ('feedback_pro',       'Feedback pro',      '20 feedbacks post-séance',                   '📝', 'special',  44)
ON CONFLICT (code) DO NOTHING;
```

### 2.3 Logique de vérification backend

Créer un service `BadgeService` qui vérifie les conditions de déblocage. Ce service est appelé à 3 moments :
- Après chaque **check-in** (vérifie : first_checkin, streak badges, early_bird)
- Après chaque **fin de séance** (vérifie : first_session, sessions count, recovery/performance, perfect_week, PR badges)
- Après chaque **feedback** (vérifie : feedback_pro)

```javascript
// services/badgeService.js

class BadgeService {
  
  // Appeler après chaque check-in
  async checkAfterCheckin(userId, checkinData) {
    const newBadges = [];
    
    // first_checkin — premier check-in ever
    const checkinCount = await this.getCheckinCount(userId);
    if (checkinCount === 1) {
      const badge = await this.unlock(userId, 'first_checkin');
      if (badge) newBadges.push(badge);
    }
    
    // streak badges
    const streak = await this.getCurrentStreak(userId);
    const streakBadges = [
      { threshold: 7,   code: 'streak_7' },
      { threshold: 14,  code: 'streak_14' },
      { threshold: 30,  code: 'streak_30' },
      { threshold: 60,  code: 'streak_60' },
      { threshold: 100, code: 'streak_100' },
    ];
    for (const sb of streakBadges) {
      if (streak >= sb.threshold) {
        const badge = await this.unlock(userId, sb.code);
        if (badge) newBadges.push(badge);
      }
    }
    
    // early_bird — check-in avant 7h
    const checkinHour = new Date(checkinData.created_at).getHours();
    if (checkinHour < 7) {
      const badge = await this.unlock(userId, 'early_bird');
      if (badge) newBadges.push(badge);
    }
    
    return newBadges;
  }
  
  // Appeler après chaque fin de séance
  async checkAfterSession(userId, sessionData) {
    const newBadges = [];
    
    // first_session
    const sessionCount = await this.getCompletedSessionCount(userId);
    if (sessionCount === 1) {
      const badge = await this.unlock(userId, 'first_session');
      if (badge) newBadges.push(badge);
    }
    
    // sessions count badges
    const sessionBadges = [
      { threshold: 10,  code: 'sessions_10' },
      { threshold: 25,  code: 'sessions_25' },
      { threshold: 50,  code: 'sessions_50' },
      { threshold: 100, code: 'sessions_100' },
    ];
    for (const sb of sessionBadges) {
      if (sessionCount >= sb.threshold) {
        const badge = await this.unlock(userId, sb.code);
        if (badge) newBadges.push(badge);
      }
    }
    
    // recovery_king — 5 séances RECOVERY
    if (sessionData.variant_mode === 'recovery') {
      const recoveryCount = await this.getSessionCountByMode(userId, 'recovery');
      if (recoveryCount >= 5) {
        const badge = await this.unlock(userId, 'recovery_king');
        if (badge) newBadges.push(badge);
      }
    }
    
    // performance_beast — 10 séances PERFORMANCE
    if (sessionData.variant_mode === 'performance') {
      const perfCount = await this.getSessionCountByMode(userId, 'performance');
      if (perfCount >= 10) {
        const badge = await this.unlock(userId, 'performance_beast');
        if (badge) newBadges.push(badge);
      }
    }
    
    // perfect_week — toutes les séances de la semaine faites
    const isPerfectWeek = await this.checkPerfectWeek(userId);
    if (isPerfectWeek) {
      const badge = await this.unlock(userId, 'perfect_week');
      if (badge) newBadges.push(badge);
    }
    
    // PR badges — vérifiés via le PRService qui retourne les nouveaux PRs
    const totalPRs = await this.getTotalPRCount(userId);
    const prBadges = [
      { threshold: 1,  code: 'first_pr' },
      { threshold: 5,  code: 'pr_5' },
      { threshold: 10, code: 'pr_10' },
    ];
    for (const pb of prBadges) {
      if (totalPRs >= pb.threshold) {
        const badge = await this.unlock(userId, pb.code);
        if (badge) newBadges.push(badge);
      }
    }
    
    return newBadges;
  }
  
  // Appeler après chaque feedback
  async checkAfterFeedback(userId) {
    const newBadges = [];
    const feedbackCount = await this.getFeedbackCount(userId);
    if (feedbackCount >= 20) {
      const badge = await this.unlock(userId, 'feedback_pro');
      if (badge) newBadges.push(badge);
    }
    return newBadges;
  }
  
  // Tente de débloquer un badge. Retourne le badge si nouveau, null si déjà débloqué.
  async unlock(userId, badgeCode) {
    const badge = await db.query('SELECT id, name, icon FROM badges WHERE code = $1', [badgeCode]);
    if (!badge.rows.length) return null;
    
    try {
      await db.query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badge.rows[0].id]
      );
      // Vérifier si c'était un nouvel insert (pas un conflict)
      const check = await db.query(
        'SELECT unlocked_at FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [userId, badge.rows[0].id]
      );
      const wasJustUnlocked = (Date.now() - new Date(check.rows[0].unlocked_at).getTime()) < 5000;
      if (wasJustUnlocked) {
        return { code: badgeCode, name: badge.rows[0].name, icon: badge.rows[0].icon };
      }
    } catch (e) {
      console.error('Badge unlock error:', e);
    }
    return null;
  }
  
  // Helper queries — implémenter chacune
  async getCheckinCount(userId) { /* SELECT COUNT(*) FROM checkins WHERE athlete_id = userId */ }
  async getCurrentStreak(userId) { /* SELECT current_streak FROM users WHERE id = userId */ }
  async getCompletedSessionCount(userId) { /* SELECT COUNT(*) FROM session_logs WHERE athlete_id = userId AND completed_at IS NOT NULL */ }
  async getSessionCountByMode(userId, mode) { /* SELECT COUNT(*) FROM session_logs WHERE athlete_id = userId AND variant_mode = mode AND completed_at IS NOT NULL */ }
  async checkPerfectWeek(userId) { /* Comparer séances planifiées vs complétées cette semaine */ }
  async getTotalPRCount(userId) { /* SELECT COUNT(*) FROM personal_records WHERE user_id = userId */ }
  async getFeedbackCount(userId) { /* SELECT COUNT(*) FROM session_logs WHERE athlete_id = userId AND rpe IS NOT NULL */ }
}

module.exports = new BadgeService();
```

### 2.4 Endpoints API

```
GET /users/:id/badges
```

**Response 200 :**
```json
{
  "badges": [
    {
      "code": "first_checkin",
      "name": "Premier pas",
      "description": "Fais ton tout premier check-in",
      "icon": "👣",
      "category": "special",
      "unlocked": true,
      "unlocked_at": "2025-03-19T07:42:00Z"
    },
    {
      "code": "streak_7",
      "name": "Semaine parfaite",
      "description": "7 jours consécutifs de check-in",
      "icon": "🔥",
      "category": "streak",
      "unlocked": false,
      "unlocked_at": null
    }
  ],
  "total": 19,
  "unlocked_count": 3
}
```

Les endpoints de check-in, fin de séance et feedback doivent retourner les badges nouvellement débloqués dans leur response :
```json
{
  "checkin": { ... },
  "new_badges": [
    { "code": "first_checkin", "name": "Premier pas", "icon": "👣" }
  ]
}
```

### 2.5 Écran badges (frontend)

**Accès :** depuis le profil (bouton "Mes badges") ET depuis la Home (petit bouton trophée en haut).

**Layout :**
- Header : "Mes badges" + compteur "3/19 débloqués"
- Grille 3 colonnes
- Badge débloqué : icône en grand (40px), fond coloré (catégorie), nom en dessous, date en caption
- Badge verrouillé : icône en gris, fond #333333, nom en gris, condition affichée au tap (tooltip ou bottom sheet)
- Catégories séparées par des headers : "Spécial", "Streak", "Séances", "Records"

**Toast de déblocage :**
Quand un badge est débloqué (retourné par l'API), afficher un toast/banner animé en haut de l'écran :
- Fond gradient cyan→violet, border-radius 16px
- Icône du badge + "Nouveau badge ! Premier pas 👣"
- Durée : 3 secondes, slide-down puis slide-up
- Feedback haptique : `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`

### 2.6 Chaînes FR pour les badges

Ajouter dans le fichier de chaînes centralisé :
```javascript
badges: {
  title: "Mes badges",
  subtitle: "débloqués",
  locked: "Verrouillé",
  unlocked: "Débloqué",
  newBadge: "Nouveau badge !",
  categories: {
    special: "Spécial",
    streak: "Streak",
    sessions: "Séances",
    pr: "Records",
  },
},
```

---

## 3 — RECORDS PERSONNELS (PR) AUTOMATIQUES

### 3.1 Migration DB

```sql
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  load_kg DECIMAL(6,2) NOT NULL,
  reps INTEGER NOT NULL,
  previous_load_kg DECIMAL(6,2),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_log_id UUID REFERENCES session_logs(id),
  UNIQUE(user_id, exercise_id)
);
```

### 3.2 Logique de détection backend

Créer un service `PRService` appelé à la fin de chaque séance :

```javascript
// services/prService.js

class PRService {
  
  // Appelé dans POST /sessions/:id/complete
  // exercisesLog = [{ exercise_id, load_kg_used, sets_completed, reps_per_set }]
  async detectNewPRs(userId, sessionLogId, exercisesLog) {
    const newPRs = [];
    
    for (const exLog of exercisesLog) {
      if (!exLog.load_kg_used || exLog.load_kg_used <= 0) continue;
      
      // Chercher le PR actuel pour cet exercice
      const currentPR = await db.query(
        'SELECT id, load_kg FROM personal_records WHERE user_id = $1 AND exercise_id = $2',
        [userId, exLog.exercise_id]
      );
      
      if (!currentPR.rows.length) {
        // Pas de PR existant → c'est le premier, on l'enregistre
        await db.query(
          `INSERT INTO personal_records (user_id, exercise_id, load_kg, reps, session_log_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, exLog.exercise_id, exLog.load_kg_used, exLog.reps_per_set?.[0] || 0, sessionLogId]
        );
        
        const exerciseName = await this.getExerciseName(exLog.exercise_id);
        newPRs.push({
          exercise_id: exLog.exercise_id,
          exercise_name: exerciseName,
          new_load_kg: exLog.load_kg_used,
          previous_load_kg: null,
          is_first: true,
        });
        
      } else if (exLog.load_kg_used > parseFloat(currentPR.rows[0].load_kg)) {
        // Nouveau PR ! Mettre à jour
        const previousLoad = parseFloat(currentPR.rows[0].load_kg);
        await db.query(
          `UPDATE personal_records 
           SET load_kg = $1, reps = $2, previous_load_kg = $3, achieved_at = NOW(), session_log_id = $4
           WHERE user_id = $5 AND exercise_id = $6`,
          [exLog.load_kg_used, exLog.reps_per_set?.[0] || 0, previousLoad, sessionLogId, userId, exLog.exercise_id]
        );
        
        const exerciseName = await this.getExerciseName(exLog.exercise_id);
        newPRs.push({
          exercise_id: exLog.exercise_id,
          exercise_name: exerciseName,
          new_load_kg: exLog.load_kg_used,
          previous_load_kg: previousLoad,
          is_first: false,
        });
      }
    }
    
    return newPRs;
  }
  
  async getExerciseName(exerciseId) {
    const result = await db.query('SELECT name FROM exercises WHERE id = $1', [exerciseId]);
    return result.rows[0]?.name || 'Exercice inconnu';
  }
}

module.exports = new PRService();
```

### 3.3 Intégration dans le flow

**Dans `POST /sessions/:id/complete` :**
```javascript
// Après avoir enregistré le session_log et les exercise_logs :
const newPRs = await prService.detectNewPRs(userId, sessionLogId, req.body.exercises_log);
const newBadges = await badgeService.checkAfterSession(userId, sessionData);

res.json({
  session_log: { id: sessionLogId, completed_at: now, duration_min },
  feedback_required: true,
  new_prs: newPRs,       // Liste des PRs battus
  new_badges: newBadges,  // Badges débloqués
});
```

### 3.4 Affichage frontend

**Pendant la séance (écran exercice en cours) :**
- Si la charge entrée par l'athlète dépasse son PR actuel pour cet exercice → afficher un petit badge "🏆 PR !" à côté de l'input charge, en or (#FFD700), avec une animation pulse

**Comment savoir le PR actuel côté frontend :** inclure les PRs dans la response de `GET /sessions/today` :
```json
{
  "session": { ... },
  "athlete_prs": {
    "uuid-exercise-dev-couche": 80,
    "uuid-exercise-squat": 100
  }
}
```

**Écran fin de séance :**
- Si `new_prs` n'est pas vide → section spéciale en or/gradient :
  ```
  🎉 NOUVEAUX RECORDS !
  Développé couché : 85kg (ancien : 80kg)
  Squat barre : 105kg (premier record !)
  ```
- Animation confetti burst (utiliser `react-native-confetti-cannon`)
- Feedback haptique : vibration de succès

**Dans l'onglet Stats → section "Records personnels" :**
- Liste triée par date (plus récent en haut)
- Chaque ligne : nom exercice + charge + date + badge "NEW" si < 7 jours

### 3.5 Endpoint API

```
GET /users/:id/prs
```

**Response 200 :**
```json
{
  "personal_records": [
    {
      "exercise_id": "uuid",
      "exercise_name": "Développé couché barre",
      "load_kg": 85.0,
      "reps": 8,
      "previous_load_kg": 80.0,
      "achieved_at": "2025-03-19T11:12:00Z",
      "is_recent": true
    }
  ],
  "total": 12
}
```

### 3.6 Chaînes FR

```javascript
prs: {
  title: "Records personnels",
  newRecord: "Nouveau record !",
  firstRecord: "Premier record !",
  previous: "Ancien",
  noRecords: "Pas encore de records",
  noRecordsDesc: "Tes records seront enregistrés automatiquement à chaque séance.",
  recent: "RÉCENT",
},
```

---

## 4 — RÉSUMÉ HEBDOMADAIRE (WEEKLY RECAP)

### 4.1 Migration DB

```sql
CREATE TABLE IF NOT EXISTS weekly_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  sessions_completed INTEGER DEFAULT 0,
  sessions_planned INTEGER DEFAULT 0,
  avg_adapt_score DECIMAL(5,2),
  avg_rpe DECIMAL(3,1),
  total_volume_kg DECIMAL(10,2) DEFAULT 0,
  prs_count INTEGER DEFAULT 0,
  sessions_delta INTEGER DEFAULT 0,
  score_delta DECIMAL(5,2) DEFAULT 0,
  rpe_delta DECIMAL(3,1) DEFAULT 0,
  volume_delta DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
```

### 4.2 Job de calcul backend

Créer un job CRON qui s'exécute **chaque dimanche à 18h00 (Europe/Brussels)** :

```javascript
// jobs/weeklyRecap.js
const cron = require('node-cron');

// Dimanche 18h00 heure belge
cron.schedule('0 18 * * 0', async () => {
  await generateWeeklyRecaps();
}, { timezone: 'Europe/Brussels' });

async function generateWeeklyRecaps() {
  // Récupérer tous les athlètes actifs
  const athletes = await db.query(
    "SELECT id FROM users WHERE role = 'athlete' AND is_active = true"
  );
  
  const weekEnd = new Date(); // Dimanche
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6); // Lundi de cette semaine
  
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);
  
  for (const athlete of athletes.rows) {
    try {
      // Données de cette semaine
      const thisWeek = await getWeekStats(athlete.id, weekStart, weekEnd);
      // Données de la semaine précédente
      const lastWeek = await getWeekStats(athlete.id, prevWeekStart, prevWeekEnd);
      
      // Calculer les deltas
      const recap = {
        user_id: athlete.id,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        sessions_completed: thisWeek.sessions,
        sessions_planned: thisWeek.planned,
        avg_adapt_score: thisWeek.avgScore,
        avg_rpe: thisWeek.avgRPE,
        total_volume_kg: thisWeek.totalVolume,
        prs_count: thisWeek.prsCount,
        sessions_delta: thisWeek.sessions - (lastWeek.sessions || 0),
        score_delta: (thisWeek.avgScore || 0) - (lastWeek.avgScore || 0),
        rpe_delta: (thisWeek.avgRPE || 0) - (lastWeek.avgRPE || 0),
        volume_delta: (thisWeek.totalVolume || 0) - (lastWeek.totalVolume || 0),
      };
      
      // Insérer ou mettre à jour
      await db.query(`
        INSERT INTO weekly_recaps (user_id, week_start, week_end, sessions_completed, sessions_planned,
          avg_adapt_score, avg_rpe, total_volume_kg, prs_count,
          sessions_delta, score_delta, rpe_delta, volume_delta)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (user_id, week_start) DO UPDATE SET
          sessions_completed=$4, sessions_planned=$5, avg_adapt_score=$6,
          avg_rpe=$7, total_volume_kg=$8, prs_count=$9,
          sessions_delta=$10, score_delta=$11, rpe_delta=$12, volume_delta=$13
      `, [recap.user_id, recap.week_start, recap.week_end, recap.sessions_completed,
          recap.sessions_planned, recap.avg_adapt_score, recap.avg_rpe,
          recap.total_volume_kg, recap.prs_count, recap.sessions_delta,
          recap.score_delta, recap.rpe_delta, recap.volume_delta]);
      
      // Envoyer notification push
      await sendPushNotification(athlete.id, {
        title: "Ta semaine en résumé 📊",
        body: buildRecapNotificationBody(recap),
      });
      
    } catch (e) {
      console.error(`Weekly recap error for ${athlete.id}:`, e);
    }
  }
}

async function getWeekStats(userId, start, end) {
  // Séances complétées
  const sessions = await db.query(`
    SELECT COUNT(*) as count FROM session_logs 
    WHERE athlete_id = $1 AND completed_at IS NOT NULL 
    AND completed_at >= $2 AND completed_at <= $3
  `, [userId, start, end]);
  
  // Score moyen
  const scores = await db.query(`
    SELECT AVG(adapt_score) as avg FROM checkins 
    WHERE athlete_id = $1 AND date >= $2 AND date <= $3
  `, [userId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]);
  
  // RPE moyen
  const rpe = await db.query(`
    SELECT AVG(rpe) as avg FROM session_logs 
    WHERE athlete_id = $1 AND rpe IS NOT NULL 
    AND completed_at >= $2 AND completed_at <= $3
  `, [userId, start, end]);
  
  // Volume total (charge × reps × séries)
  const volume = await db.query(`
    SELECT COALESCE(SUM(el.load_kg_used * el.sets_completed * 
      COALESCE((SELECT AVG(val::int) FROM jsonb_array_elements_text(el.reps_per_set) AS val), 0)
    ), 0) as total
    FROM exercise_logs el
    JOIN session_logs sl ON el.session_log_id = sl.id
    WHERE sl.athlete_id = $1 AND sl.completed_at >= $2 AND sl.completed_at <= $3
  `, [userId, start, end]);
  
  // PRs de la semaine
  const prs = await db.query(`
    SELECT COUNT(*) as count FROM personal_records 
    WHERE user_id = $1 AND achieved_at >= $2 AND achieved_at <= $3
  `, [userId, start, end]);
  
  return {
    sessions: parseInt(sessions.rows[0].count),
    planned: 3, // Basé sur le programme — à calculer dynamiquement si possible
    avgScore: scores.rows[0].avg ? parseFloat(scores.rows[0].avg).toFixed(1) : null,
    avgRPE: rpe.rows[0].avg ? parseFloat(rpe.rows[0].avg).toFixed(1) : null,
    totalVolume: parseFloat(volume.rows[0].total),
    prsCount: parseInt(prs.rows[0].count),
  };
}

function buildRecapNotificationBody(recap) {
  let parts = [];
  parts.push(`${recap.sessions_completed} séance${recap.sessions_completed > 1 ? 's' : ''}`);
  if (recap.avg_adapt_score) parts.push(`Score moyen ${Math.round(recap.avg_adapt_score)}`);
  if (recap.prs_count > 0) parts.push(`${recap.prs_count} nouveau${recap.prs_count > 1 ? 'x' : ''} record${recap.prs_count > 1 ? 's' : ''}`);
  return parts.join(' · ');
}
```

### 4.3 Endpoint API

```
GET /weekly-recap/latest
```

**Response 200 :**
```json
{
  "recap": {
    "week_start": "2025-03-17",
    "week_end": "2025-03-23",
    "sessions_completed": 3,
    "sessions_planned": 3,
    "avg_adapt_score": 72.3,
    "avg_rpe": 6.8,
    "total_volume_kg": 12450.0,
    "prs_count": 1,
    "sessions_delta": 1,
    "score_delta": 4.2,
    "rpe_delta": -0.5,
    "volume_delta": 1200.0
  }
}
```

### 4.4 Écran frontend

Accessible depuis la tab **Stats** (bouton "Résumé de la semaine" en haut) ou via la notification push.

**Layout :**
```
┌─────────────────────────────────┐
│ ← Retour     Ta semaine 📊     │
│ 17 – 23 mars 2025              │
│                                 │
│ ┌─────────┐┌─────────┐┌───────┐│
│ │ 3/3     ││ 72      ││ 6.8   ││  ← 3 cartes métriques
│ │Séances  ││Score moy.││RPE moy││
│ │  ↑+1    ││  ↑+4.2   ││ ↓-0.5 ││  ← Deltas colorés
│ └─────────┘└─────────┘└───────┘│
│                                 │
│ 📦 Volume total                 │
│ 12 450 kg    ↑+1200kg          │
│                                 │
│ 🏆 Records cette semaine        │
│ Développé couché : 85kg         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 💬 "Belle semaine !         │ │  ← Message personnalisé
│ │ Continue comme ça."          │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Voir les semaines précédentes] │
└─────────────────────────────────┘
```

**Logique du message personnalisé :**
- Si `sessions_completed >= sessions_planned` → "Belle semaine ! Continue comme ça." (vert)
- Si `sessions_completed >= sessions_planned * 0.6` → "Bonne semaine, tu es sur la bonne voie." (cyan)
- Si `avg_adapt_score < 40` → "Semaine difficile — écoute ton corps." (orange)
- Si `sessions_completed === 0` → "Tu reviendras plus fort la semaine prochaine !" (gris)

**Flèches de comparaison :**
- Delta positif → flèche ↑ en vert (#22C55E)
- Delta négatif → flèche ↓ en rouge (#EF4444)
- Delta nul → "=" en gris
- Exception : pour le RPE, un delta négatif est POSITIF (moins d'effort ressenti = mieux récupéré), donc inverser les couleurs pour le RPE

### 4.5 Chaînes FR

```javascript
weeklyRecap: {
  title: "Ta semaine en résumé",
  sessions: "Séances",
  avgScore: "Score moyen",
  avgRPE: "RPE moyen",
  totalVolume: "Volume total",
  prs: "Records cette semaine",
  noPRs: "Pas de record cette semaine",
  vsLastWeek: "vs semaine précédente",
  up: "en hausse",
  down: "en baisse",
  stable: "stable",
  messages: {
    great: "Belle semaine ! Continue comme ça.",
    good: "Bonne semaine, tu es sur la bonne voie.",
    tough: "Semaine difficile — écoute ton corps.",
    rest: "Tu reviendras plus fort la semaine prochaine !",
  },
  previousWeeks: "Voir les semaines précédentes",
  notifTitle: "Ta semaine en résumé 📊",
},
```

---

## 5 — INTÉGRATION APPLE HEALTH / GOOGLE FIT (BASIQUE)

### 5.1 Approche

**Si l'implémentation prend trop de temps, skip cette section.** La priorité reste le flow principal. Dans ce cas, ajouter juste le bouton dans le profil avec le message "Bientôt disponible".

**Librairies recommandées :**
- iOS : `react-native-health` (accès à HealthKit)
- Android : `react-native-google-fit`
- Alternative unifiée : `expo-health-connect` (si compatible avec la version d'Expo utilisée)

### 5.2 Données à synchroniser

**Lecture (optionnel en V1) :**
- Pas quotidiens → afficher sur la Home si disponible
- Données de sommeil (durée) → pré-remplir potentiellement le slider sommeil du check-in (V2)

**Écriture (prioritaire) :**
- À chaque fin de séance, enregistrer un "Workout" dans Health/Fit :
  - Type : `HKWorkoutActivityType.traditionalStrengthTraining` (ou `.flexibility` pour RECOVERY)
  - Durée : durée de la séance
  - Calories : estimation basique (durée × 5 kcal/min pour force, × 3 pour recovery)
  - Date : heure de début et fin

### 5.3 Implémentation dans le profil

**Section "Données de santé" dans le profil :**
```
┌─────────────────────────────────┐
│ 🏥 Données de santé             │
│                                 │
│ Apple Health      [Connecter]   │  ← ou "✓ Synchronisé" si connecté
│ Google Fit        [Connecter]   │
│                                 │
│ Afficher seulement le bon       │
│ bouton selon la plateforme      │
│ (iOS → Apple Health,            │
│  Android → Google Fit)          │
└─────────────────────────────────┘
```

**Flow de connexion :**
1. Tap "Connecter" → demander les permissions (expo-health ou react-native-health)
2. Si accepté → stocker le flag `health_connected: true` dans AsyncStorage
3. Afficher "✓ Synchronisé" en vert
4. Si refusé → message "Tu peux activer ça plus tard dans les réglages de ton téléphone"

**Fallback "Bientôt disponible" :**
Si on ne peut pas implémenter maintenant :
```
┌─────────────────────────────────┐
│ 🏥 Données de santé             │
│                                 │
│ Apple Health / Google Fit       │
│ Bientôt disponible              │  ← texte gris, pas de bouton
└─────────────────────────────────┘
```

---

## 6 — ORDRE D'IMPLÉMENTATION DE CE PATCH

Appliquer dans cet ordre pour minimiser les conflits :

1. **Migration DB** — exécuter toutes les migrations des sections 1.1, 2.1, 3.1, 4.1
2. **Seed badges** — insérer les 19 badges (section 2.2)
3. **Mettre à jour le seed exercices** — ajouter `demo_gif_url` aux exercices existants (section 1.3)
4. **Backend PRService** — créer le service + intégrer dans POST /sessions/:id/complete (section 3.2, 3.3)
5. **Backend BadgeService** — créer le service + intégrer aux 3 points d'accroche (section 2.3)
6. **Backend Weekly Recap job** — créer le CRON + endpoint (section 4.2, 4.3)
7. **Nouveaux endpoints** — GET /users/:id/badges, GET /users/:id/prs, GET /weekly-recap/latest (sections 2.4, 3.5, 4.3)
8. **Frontend GIFs** — composant ExerciseDemo + intégrer dans l'écran séance (section 1.4)
9. **Frontend Badges** — écran badges + toast de déblocage (section 2.5)
10. **Frontend PRs** — indicateur en séance + écran fin de séance + liste dans Stats (section 3.4)
11. **Frontend Weekly Recap** — écran + notification handling (section 4.4)
12. **Frontend Apple Health** — si le temps le permet (section 5)
13. **Ajouter les nouvelles chaînes FR** — sections 2.6, 3.6, 4.5
14. **Tester le flow complet** — check-in → séance → PR détecté → badge débloqué → feedback → recap dimanche

---

## 7 — CHECKLIST DE VALIDATION PARTIE 2

- [ ] GIFs visibles sur les exercices (ou fallback icône propre)
- [ ] 19 badges définis en DB et visibles dans l'écran badges
- [ ] Badge "Premier pas" se débloque au premier check-in
- [ ] Badge "C'est parti !" se débloque à la première séance terminée
- [ ] Toast animé s'affiche quand un badge est débloqué
- [ ] PRs détectés automatiquement à la fin de chaque séance
- [ ] Indicateur "PR !" visible pendant la séance si charge > record
- [ ] Confetti sur l'écran fin de séance si PR battu
- [ ] Liste des PRs visible dans l'onglet Stats
- [ ] Résumé hebdo calculé et stocké chaque dimanche
- [ ] Notification push "Ta semaine en résumé" envoyée dimanche 18h
- [ ] Écran recap accessible depuis Stats
- [ ] Deltas colorés (vert/rouge) avec flèches
- [ ] Message personnalisé basé sur les données de la semaine
- [ ] Apple Health/Google Fit : bouton dans profil (fonctionnel ou "bientôt")
- [ ] Toutes les nouvelles chaînes sont en français
