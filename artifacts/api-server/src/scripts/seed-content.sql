-- Seed guides and content_routines
-- Idempotent: ON CONFLICT DO NOTHING

INSERT INTO guides (id, title, content_markdown, category, sort_order) VALUES
(
  '533098a1-fed2-4519-83ea-d0f7d453ed02',
  'Choisir ses poids — comprendre le % 1RM',
  E'# Choisir ses poids — comprendre le % 1RM\n\nLe **1RM** (une répétition maximum) est le poids maximal que tu peux soulever une seule fois pour un mouvement donné.\n\n## Pourquoi c''est utile ?\n\nPluôt que de deviner ton poids de séance, travailler à un **pourcentage de ton 1RM** te permet de :\n\n- Respecter l''intensité prescrite par ton coach\n- Progresser de façon structurée\n- Éviter le surentraînement ou le sous-entraînement\n\n## Tableau de référence\n\n| % 1RM | Reps max possibles | Objectif |\n|-------|--------------------|----------|\n| 50–60 % | 15–20 | Technique, endurance |\n| 65–75 % | 10–12 | Hypertrophie |\n| 80–85 % | 6–8 | Force-hypertrophie |\n| 87–92 % | 3–5 | Force |\n| 95–100 % | 1–2 | Force maximale |\n\n## En pratique\n\n1. Estime ton 1RM lors d''un test (avec ton coach)\n2. Multiplie par le % demandé dans ta séance\n3. Arrondis au kg ou demi-kg le plus proche\n\n> **Exemple :** Squat 1RM = 100 kg. Séance à 75 % → 75 kg.\n\n## Recalcul régulier\n\nTon 1RM évolue ! Planifie un re-test tous les 6–8 semaines pour garder tes charges à jour.',
  'training',
  1
),
(
  'df628db7-f787-4b67-9f83-2c9e19cb3377',
  'Comprendre le tempo d''exécution',
  E'# Comprendre le tempo d''exécution\n\nLe tempo indique la **vitesse de chaque phase** d''un mouvement. Il s''exprime en 4 chiffres : **excentrique – pause basse – concentrique – pause haute**.\n\n## Format : X-X-X-X\n\n| Phase | Description |\n|-------|-------------|\n| 1er chiffre | Descente (excentrique) |\n| 2e chiffre | Pause en position basse |\n| 3e chiffre | Montée (concentrique) |\n| 4e chiffre | Pause en position haute |\n\n## Exemple : 3-1-2-0\n\n- **3 s** de descente contrôlée\n- **1 s** de pause en bas\n- **2 s** de montée\n- **0 s** de pause en haut\n\n## Pourquoi contrôler le tempo ?\n\n- **Tension mécanique accrue** → meilleur stimulus musculaire\n- **Meilleure technique** → moins de risques de blessure\n- **Intention** → tu travailles chaque fraction du mouvement\n\n## Tempos courants\n\n| Tempo | Usage |\n|-------|-------|\n| 2-0-2-0 | Standard, polyvalent |\n| 3-1-2-0 | Hypertrophie, contrôle |\n| 4-2-1-0 | Technique, débutant |\n| 1-0-X-0 (X = explosif) | Force-vitesse, athlétisme |',
  'training',
  2
),
(
  '2788b7aa-db0c-45f3-9f5e-bdabc604d422',
  'RPE — L''effort ressenti',
  E'# RPE — L''effort ressenti\n\n**RPE** (Rate of Perceived Exertion) est une échelle de 1 à 10 qui mesure ton niveau d''effort subjectif pendant un exercice.\n\n## Échelle RPE\n\n| RPE | Description | Reps en réserve |\n|-----|-------------|------------------|\n| 5–6 | Effort léger | 4–5 reps de plus possibles |\n| 7 | Modéré | 3 reps de plus |\n| 8 | Difficile | 2 reps de plus |\n| 9 | Très difficile | 1 rep de plus |\n| 10 | Effort maximal | Plus rien en réserve |\n\n## Comment l''utiliser ?\n\nAprès chaque série, ton coach peut demander ton RPE. Cela lui permet de :\n\n- Ajuster la charge en temps réel\n- Évaluer ta fatigue sur la durée\n- Calibrer tes futurs programmes\n\n## Conseils\n\n- **Sois honnête** : un RPE surestimé fausse la programmation\n- **Évalue après la dernière rep** : pas pendant l''effort\n- Le RPE est subjectif et **varie selon les jours** (sommeil, stress, nutrition)',
  'training',
  3
),
(
  '566c2e4a-dc81-4788-a233-5fb7cc9bbb5f',
  'Nutrition sportive — les bases',
  E'# Nutrition sportive — les bases\n\nBien manger autour de l''entraînement amplifie tes résultats. Voici les fondamentaux.\n\n## Avant l''entraînement (1–2 h avant)\n\n- **Glucides** : pain complet, flocons d''avoine, riz, fruits → énergie disponible\n- **Protéines légères** : yaourt, blanc d''œuf → protection musculaire\n- Évite les graisses lourdes et fibres en excès (digestion lente)\n\n## Pendant (si séance > 60 min)\n\n- **Eau** : 400–600 ml/heure minimum\n- Pour les efforts longs : eau + une banane ou boisson d''effort légère\n\n## Après l''entraînement (dans les 30–60 min)\n\n- **Protéines** : 20–40 g → whey, viande, œufs, légumineuses\n- **Glucides** : riz, pomme de terre, fruit → reconstituer le glycogène\n- **Hydratation** : au moins 500 ml\n\n## Macronutriments — repères généraux\n\n| Macro | Apport cible (athlète) | Rôle |\n|-------|------------------------|------|\n| Protéines | 1.6–2.2 g/kg/j | Réparation musculaire |\n| Glucides | 3–7 g/kg/j (selon vol.) | Énergie |\n| Lipides | 0.8–1.2 g/kg/j | Hormones, récupération |\n\n> Ces valeurs sont des repères. Discute avec ton coach pour affiner selon tes objectifs.',
  'nutrition',
  4
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_routines (id, title, description, category, duration_min, exercises) VALUES
(
  'ee5f737b-fc3f-4218-99f1-ed58cc0d67d2',
  'Échauffement général corps entier',
  'Routine d''activation progressive pour préparer l''ensemble du corps à l''effort.',
  'warmup',
  10,
  '[{"name":"Marche sur place avec rotation de bras","sets":"2 min","notes":"Amplitude maximale, respiration profonde"},{"name":"Cercles d''épaules","sets":"2×10 chaque sens","notes":"Lent et contrôlé"},{"name":"Rotation de hanche (cercles)","sets":"2×10 chaque côté"},{"name":"Squats au poids de corps","sets":"2×15","notes":"Descente lente 3 s"},{"name":"Jumping jacks","sets":"2×20","notes":"Coordonner bras et jambes"},{"name":"Montées de genoux sur place","sets":"30 s × 2"}]'
),
(
  '74966c05-3ddf-44d7-b002-37f597f7f1e4',
  'Mobilité de hanche pour le bas du corps',
  'Idéal avant squat, fente ou soulevé de terre. Améliore l''amplitude et la stabilité.',
  'warmup',
  8,
  '[{"name":"Fentes latérales dynamiques","sets":"2×8 chaque côté","notes":"Pousser sur le talon"},{"name":"Étirement du pigeon debout","sets":"30 s × 2 chaque côté"},{"name":"Rotation interne de hanche au sol","sets":"10 chaque côté"},{"name":"Cossack squat (squat cosaque)","sets":"2×6 chaque côté","notes":"Amplitude progressive"},{"name":"Pont fessier","sets":"2×15","notes":"Serrer les fessiers en haut"}]'
),
(
  '4c89f372-4a20-463c-b84e-e30d082d7f26',
  'Activation épaules et coiffe des rotateurs',
  'Prépare les épaules avant les poussées, tractions ou mouvements overhead.',
  'warmup',
  7,
  '[{"name":"Rotation externe avec élastique","sets":"3×15","notes":"Coude collé au corps"},{"name":"Face pull à l''élastique","sets":"3×12","notes":"Tirer vers le front"},{"name":"Y-T-W au sol","sets":"2×8 chaque lettre","notes":"Contrôle total"},{"name":"Cercles de bras en planche haute","sets":"10 chaque sens","notes":"Gainage actif"}]'
),
(
  'b66662ee-821c-4c74-b161-9b03ecc24ece',
  'Réathlétisation épaule — renforcement progressif',
  'Programme progressif pour récupérer la fonction et la force de l''épaule après une blessure ou douleur.',
  'reathletisation',
  20,
  '[{"name":"Pendulum de Codman","sets":"2×1 min chaque bras","notes":"Laisser le bras pendre et osciller doucement"},{"name":"Rotation externe isométrique","sets":"3×10 s","notes":"Coude à 90°, poussée contre le mur"},{"name":"Rotation externe avec élastique léger","sets":"3×15","notes":"Amplitude complète, lent"},{"name":"Élévation frontale légère","sets":"2×12","notes":"Poids minimal, arrêter à l''horizontale"},{"name":"Prone T","sets":"2×10","notes":"Allongé sur le ventre, bras en T"}]'
),
(
  '13ca3bbc-2cd9-4f9e-b3ee-bd403a7ef9b3',
  'Réathlétisation genou — phase initiale',
  'Renforcement doux du genou post-douleur ou post-opération (phase précoce). Toujours valider avec un professionnel.',
  'reathletisation',
  15,
  '[{"name":"Contraction isométrique du quadriceps","sets":"3×10 s","notes":"Jambe tendue, pousser le creux du genou vers le sol"},{"name":"Élévation de jambe tendue","sets":"3×12","notes":"Lent, contrôlé, sans rotation"},{"name":"Pont fessier bilatéral","sets":"3×15","notes":"Ne pas cambrer le dos"},{"name":"Mini-squat à 30°","sets":"2×12","notes":"Amplitude limitée, pas de douleur"},{"name":"Vélo stationnaire à résistance minimale","sets":"10 min","notes":"Selle haute, rotations fluides"}]'
),
(
  'f3a398bc-3fdc-4e61-9bc7-c2fde88fcb33',
  'Relaxation musculaire complète',
  'Routine de fin de séance ou de soirée pour relâcher les tensions et favoriser la récupération.',
  'relaxation',
  12,
  '[{"name":"Étirement ischio-jambiers allongé","sets":"2×45 s chaque jambe","notes":"Corde, élastique ou serviette"},{"name":"Étirement piriforme (figure 4)","sets":"2×45 s chaque côté"},{"name":"Étirement pectoral contre le mur","sets":"2×30 s","notes":"Bras à 90°, tourner doucement"},{"name":"Relâchement cervical","sets":"30 s chaque côté","notes":"Pas de rotation forcée"},{"name":"Posture de l''enfant (yoga)","sets":"1×2 min","notes":"Respiration abdominale, relâchement total"}]'
),
(
  '40259d8c-1cb8-4fe5-932d-c2e189f1b43a',
  'Cohérence cardiaque 5 minutes',
  'Technique de respiration pour réduire le stress et la tension nerveuse avant ou après l''effort.',
  'breathing',
  5,
  '[{"name":"Inspiration nasale","sets":"5 s","notes":"Ventre gonflé en premier"},{"name":"Expiration buccale","sets":"5 s","notes":"Relâchement complet"},{"name":"Répéter 5–6 fois par minute","sets":"5 min total","notes":"Yeux fermés si possible"}]'
),
(
  'c82214c6-e815-4bbe-95d6-f978c5d33dee',
  'Récupération par la respiration',
  'Activation du système parasympathique pour accélérer la récupération post-effort.',
  'breathing',
  8,
  '[{"name":"Respiration 4-7-8","sets":"4 cycles","notes":"Inspiration 4 s, rétention 7 s, expiration 8 s"},{"name":"Respiration carrée (Box Breathing)","sets":"4 cycles × 4 s","notes":"Ins. 4s – Ret. 4s – Exp. 4s – Ret. 4s"},{"name":"Scan corporel progressif","sets":"3 min","notes":"Relâcher chaque groupe musculaire en expirant"}]'
)
ON CONFLICT (id) DO NOTHING;
