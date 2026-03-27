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
),
-- NOUVEAUX GUIDES ENTRAÎNEMENT
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  'Périodisation — planifier sa progression sur le long terme',
  E'# Périodisation — planifier sa progression sur le long terme\n\nLa **périodisation** est l''art d''organiser l''entraînement dans le temps pour maximiser les adaptations et éviter le surmenage.\n\n## Pourquoi périodiser ?\n\nSans organisation, le corps stagne. La périodisation permet de :\n\n- Varier les stimuli pour forcer l''adaptation\n- Alterner charge et récupération intelligemment\n- Peaker au bon moment (compétition, test)\n\n## Les grandes phases\n\n### 1. Accumulation (4–6 semaines)\n- Volume élevé, intensité modérée (65–75 % 1RM)\n- Objectif : construire une base de volume et d''endurance musculaire\n\n### 2. Intensification (3–4 semaines)\n- Volume réduit, intensité élevée (80–90 % 1RM)\n- Objectif : développer la force maximale\n\n### 3. Réalisation / Peak (1–2 semaines)\n- Volume minimal, intensité très élevée (90–100 % 1RM)\n- Objectif : exprimer le potentiel acquis\n\n### 4. Décharge (1 semaine)\n- Volume et intensité très faibles\n- Objectif : récupération complète, super-compensation\n\n## Modèles courants\n\n| Modèle | Description |\n|--------|-------------|\n| Linéaire | Progression régulière semaine après semaine |\n| Ondulée (DUP) | Variation des stimuli jour après jour |\n| Bloc | Phases séquentielles très ciblées |\n\n## Conseil pratique\n\nDiscute avec ton coach pour choisir le modèle adapté à ton niveau et tes objectifs.',
  'training',
  5
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
  'Récupération active — bouger pour mieux récupérer',
  E'# Récupération active — bouger pour mieux récupérer\n\nContraire à l''idée reçue, **rester immobile** n''est pas toujours la meilleure façon de récupérer. La récupération active peut accélérer le retour à la pleine capacité.\n\n## Qu''est-ce que la récupération active ?\n\nC''est pratiquer une activité légère (30–50 % de ton effort maximal) le lendemain d''une séance intense.\n\n## Bénéfices\n\n- **Élimination des déchets métaboliques** (lactate, ions H+)\n- **Réduction des courbatures** (DOMS) grâce à l''afflux sanguin\n- **Maintien de la mobilité** articulaire\n- **Récupération mentale** par l''activité modérée\n\n## Exemples de récupération active\n\n| Activité | Durée | Intensité |\n|---------|-------|----------|\n| Marche | 20–40 min | Légère |\n| Vélo stationnaire | 15–20 min | Très légère |\n| Natation | 20–30 min | Lente |\n| Yoga / Stretching | 20–30 min | Doux |\n| Foam Rolling | 10–15 min | Modéré |\n\n## À éviter\n\n- Toute activité qui dépasse RPE 5\n- Les sports qui sollicitent les mêmes groupes musculaires que la séance principale\n\n## Quand l''utiliser ?\n\nIdéalement 24 à 48 heures après une séance intense ou le lendemain d''un entraînement de force maximal.',
  'training',
  6
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567803',
  'Supersets et techniques d''intensification',
  E'# Supersets et techniques d''intensification\n\nLes **techniques d''intensification** permettent d''augmenter le stimulus musculaire sans nécessairement augmenter la charge.\n\n## Le Superset\n\nEnchaîner deux exercices sans repos entre les deux.\n\n### Types de supersets\n\n| Type | Description | Exemple |\n|------|-------------|----------|\n| Agoniste-antagoniste | Muscles opposés | Curl biceps + Extension triceps |\n| Même groupe | Muscles identiques | Squat + Leg extension |\n| Pré-fatigue | Isolation puis compound | Fly + Développé couché |\n| Post-fatigue | Compound puis isolation | Développé couché + Fly |\n\n## Drop Sets\n\nRéduire la charge immédiatement après l''échec et continuer la série.\n- **Utilisation** : fin de cycle, hypertrophie maximale\n- **Précaution** : à utiliser rarement (fatigue élevée)\n\n## Rest-Pause\n\nPrendre 10–15 secondes de repos en milieu de série pour effectuer des reps supplémentaires.\n\n## Séries géantes (Giant Sets)\n\n3 à 5 exercices enchaînés sans repos. Efficace pour le conditionnement et l''hypertrophie.\n\n## Conseils d''utilisation\n\n- Réserve ces techniques aux **2–3 dernières semaines** d''un cycle\n- Veille à maintenir **une technique irréprochable**\n- **Pas plus de 2 techniques** par séance pour éviter le surmenage',
  'training',
  7
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567804',
  'RPE avancé — auto-régulation de l''entraînement',
  E'# RPE avancé — auto-régulation de l''entraînement\n\nL''**auto-régulation** consiste à ajuster ton entraînement en temps réel selon ton état physique et mental du jour, plutôt que de suivre aveuglément un programme rigide.\n\n## Pourquoi auto-réguler ?\n\nTon corps ne se comporte pas de façon linéaire. Des facteurs comme le **sommeil, le stress, la nutrition et la fatigue accumulée** influencent directement ta performance.\n\n## RPE cible vs RPE ressenti\n\nSi ton programme prescrit un RPE 8 et que tes sensations correspondent à un RPE 9 avec la même charge habituelle → **réduis la charge**.\n\n## Le concept de RIR (Reps In Reserve)\n\n| RIR | Signification |\n|-----|---------------|\n| 0 | Échec musculaire complet |\n| 1 | 1 rep encore possible |\n| 2 | 2 reps encore possibles |\n| 3 | 3 reps encore possibles |\n\n## Protocole d''ajustement de charge\n\n1. Commence avec ta charge habituelle\n2. Évalue ton RPE après la 1ère série\n3. Si RPE ≥ 9 : réduis de 5–10 %\n4. Si RPE ≤ 6 : augmente de 2.5–5 %\n5. Continue l''ajustement série après série\n\n## Avantages\n\n- Réduit le risque de blessure par surcharge\n- Optimise chaque séance selon ton état réel\n- Développe ta conscience corporelle\n\n## Limite\n\nL''auto-régulation demande de l''**expérience** pour être précise. Elle est moins efficace pour les débutants qui n''ont pas encore de repères fiables.',
  'training',
  8
),
-- NOUVEAUX GUIDES NUTRITION
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567805',
  'Hydratation et performance sportive',
  E'# Hydratation et performance sportive\n\nL''eau représente 60 % de ton corps. Une **déshydratation de seulement 2 %** peut réduire tes performances de 10 à 20 %.\n\n## Signes de déshydratation\n\n- Urine foncée (objectif : jaune paille)\n- Fatigue précoce\n- Maux de tête\n- Baisse de concentration\n- Crampes musculaires\n\n## Besoins quotidiens\n\n| Situation | Apport recommandé |\n|-----------|------------------|\n| Repos | 30–35 ml/kg/j |\n| Entraînement léger | +500 ml |\n| Entraînement intense | +1 000–1 500 ml |\n| Chaleur / transpiration abondante | +500–1 000 ml supplémentaires |\n\n## Stratégie d''hydratation\n\n### Avant l''entraînement\n- **500 ml** dans les 2 heures précédant la séance\n- Urine claire avant de commencer\n\n### Pendant l''entraînement\n- **150–250 ml** toutes les 15–20 minutes\n- Pour les efforts > 60 min : boisson isotonique (sodium + glucides)\n\n### Après l''entraînement\n- **500 ml à 1 L** dans la première heure\n- Règle : boire 1.5 × le poids perdu en sueur\n\n## Électrolytes\n\nPour les efforts longs (> 90 min) ou par forte chaleur, ajouter du **sodium** (sel, boisson sportive) pour maintenir l''équilibre électrolytique et éviter l''hyponatrémie.',
  'nutrition',
  9
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567806',
  'Timing des repas — optimiser sa fenêtre nutritive',
  E'# Timing des repas — optimiser sa fenêtre nutritive\n\nLE **timing nutritionnel** consiste à organiser ses apports alimentaires autour de l''entraînement pour maximiser la récupération et la performance.\n\n## La fenêtre anabolique — mythe ou réalité ?\n\nLa croyance d''une fenêtre de 30 minutes post-entraînement est exagérée. La recherche actuelle montre que la fenêtre anabolique est en réalité de **3 à 5 heures**.\n\n## Repas pré-entraînement\n\n### 2–3 h avant\n- Repas complet : protéines + glucides complexes + légumes\n- Exemple : poulet, riz complet, légumes rôtis\n\n### 30–60 min avant\n- Collation légère si nécessaire\n- Exemple : banane + yaourt grec, pain complet + beurre de cacahuète\n\n## Repas post-entraînement\n\n### Priorité : protéines rapides\n- **20–40 g de protéines** dans les 2 heures post-séance\n- Sources : whey, blanc de poulet, thon, oeufs\n\n### Glucides pour reconstituer le glycogène\n- Plus important si tu t''entraînes à nouveau dans les 8 heures\n- Moins critique si tu as une longue période de récupération\n\n## Fréquence des repas\n\n| Fréquence | Avantage |\n|-----------|----------|\n| 3 repas/jour | Simplicité, satiété |\n| 4–5 repas/jour | Distribution protéique optimale |\n| Jeûne intermittent | Pratique selon le mode de vie |\n\n> Il n''y a pas de formule universelle. La meilleure stratégie est celle que tu peux maintenir sur la durée.',
  'nutrition',
  10
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567807',
  'Compléments alimentaires — lesquels valent vraiment la peine ?',
  E'# Compléments alimentaires — lesquels valent vraiment la peine ?\n\nLe marché des compléments est vaste et souvent trompeur. Voici un tour d''horizon fondé sur les preuves scientifiques.\n\n## Niveau de preuve élevé\n\n### Créatine monohydrate\n- **Bénéfice** : +5–15 % de force, meilleure récupération\n- **Dose** : 3–5 g/jour (pas besoin de phase de charge)\n- **Sécurité** : excellente sur le long terme\n\n### Protéines en poudre (whey, caséine, végétale)\n- **Bénéfice** : atteindre ses apports protéiques\n- **Dose** : selon tes besoins quotidiens\n- **Note** : équivalent à la nourriture, non magique\n\n### Caféine\n- **Bénéfice** : +3–10 % de performance, réduction de la fatigue perçue\n- **Dose** : 3–6 mg/kg, 30–60 min avant\n- **Précaution** : tolérance, sommeil, dépendance\n\n## Niveau de preuve modéré\n\n### Bêta-alanine\n- Réduit la fatigue sur les efforts de 1–10 minutes\n- Peut causer des fourmillements (inoffensifs)\n\n### Vitamine D\n- Essentielle si carence (bilan sanguin recommandé)\n\n## À éviter ou faible preuve\n\n- BCAA (si apports protéiques suffisants)\n- Boosteurs pré-entraînement complexes\n- Brûleurs de graisse\n\n> **La base** : alimentation, sommeil, entraînement. Les compléments ne compensent pas un déficit dans ces trois piliers.',
  'nutrition',
  11
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567808',
  'Coupure de poids — gérer sa composition corporelle',
  E'# Coupure de poids — gérer sa composition corporelle\n\nRéduire sa masse grasse tout en préservant sa masse musculaire est un équilibre délicat qui demande une approche structurée.\n\n## Principe fondamental\n\n**Déficit calorique** = dépenses > apports. Mais le rythme et la qualité de ce déficit déterminent la quantité de muscle conservée.\n\n## Déficit recommandé\n\n| Objectif | Déficit quotidien | Perte hebdomadaire |\n|----------|-------------------|--------------------|\n| Conservation maximale du muscle | 250–500 kcal | 0.3–0.5 kg |\n| Perte modérée | 500–750 kcal | 0.5–0.75 kg |\n| Perte rapide (courte durée) | 750–1000 kcal | 0.75–1 kg |\n\n## Priorités nutritionnelles en coupure\n\n1. **Protéines élevées** (2.2–3 g/kg) → préserver le muscle\n2. **Glucides autour de l''entraînement** → maintenir les performances\n3. **Lipides suffisants** (≥ 0.8 g/kg) → fonctions hormonales\n\n## Erreurs fréquentes\n\n- Couper trop vite → perte musculaire et rebond\n- Supprimer les glucides → baisse des performances\n- Négliger les protéines → catabolisme musculaire\n- Ignorer le sommeil → augmentation du cortisol\n\n## Périodes de recharge (Refeed)\n\nUne journée avec des glucides plus élevés (maintenance ou légère surplus) toutes les 1–2 semaines peut :\n- Relancer la leptine (hormone de satiété)\n- Restaurer le glycogène musculaire\n- Soutenir la motivation',
  'nutrition',
  12
),
-- NOUVEAUX GUIDES RÉCUPÉRATION
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567809',
  'Sommeil et performance — l''outil de récupération ultime',
  E'# Sommeil et performance — l''outil de récupération ultime\n\nLe sommeil est le facteur de récupération le plus puissant et pourtant le plus souvent négligé par les athlètes.\n\n## Ce qui se passe pendant le sommeil\n\n- **Phase NREM profond** : sécrétion maximale d''hormone de croissance (GH)\n- **Phase REM** : consolidation mémoire motrice, régulation émotionnelle\n- **Réparation musculaire** : synthèse protéique augmentée\n- **Régulation hormonale** : testostérone, cortisol, insuline\n\n## Conséquences du manque de sommeil\n\n| Durée de manque | Effets |\n|----------------|--------|\n| 1–2 nuits courtes | –10 à –15 % de force, récupération ralentie |\n| 1 semaine à 6h/nuit | Performance similaire à 24h sans dormir |\n| Chronique | Blessures ++, surmenage, burnout |\n\n## Recommandations\n\n- **Durée** : 7–9 h par nuit pour les adultes actifs\n- **Consistance** : même heure de coucher et de lever\n- **Environnement** : chambre fraîche (18–19°C), sombre, silencieuse\n\n## Hygiène du sommeil\n\n- Éviter les écrans 1h avant le coucher\n- Pas de caféine après 14h\n- Routine pré-sommeil : étirements, lecture, respiration\n- Éviter l''alcool (perturbe le REM)\n\n## La sieste stratégique\n\n- **20 min** (sleep inertia minimale) → boost de vigilance\n- **90 min** (cycle complet) → récupération profonde\n- Idéalement en début d''après-midi (13h–15h)',
  'recovery',
  13
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567810',
  'Cryothérapie et bains froids — quand et comment ?',
  E'# Cryothérapie et bains froids — quand et comment ?\n\nL''exposition au froid est une modalité de récupération populaire. Voici ce que la science dit réellement.\n\n## Mécanismes\n\n- **Vasoconstriction** → réduction de l''inflammation locale\n- **Diminution de la vitesse de conduction nerveuse** → réduction de la douleur\n- **Effet psychologique** → sentiment de récupération accéléré\n\n## Bains froids (immersion)\n\n| Paramètre | Recommandation |\n|-----------|---------------|\n| Température | 10–15°C |\n| Durée | 10–15 minutes |\n| Fréquence | 2–3 fois/semaine après séances intenses |\n\n## Bénéfices prouvés\n\n- Réduction des DOMS (courbatures) à court terme\n- Amélioration de la récupération subjective\n- Réduction des marqueurs inflammatoires\n\n## Limites importantes\n\n⚠️ **Attention** : l''exposition au froid juste après une séance de musculation peut **réduire les adaptations** (hypertrophie, force) en bloquant les voies de signalisation musculaire (mTOR).\n\n**À éviter** : bain froid dans les 4 heures suivant une séance orientée hypertrophie ou force.\n\n**À utiliser** : en récupération entre compétitions, après matchs, ou lors de pics de charge.\n\n## Douche froide alternative\n\n- Douche alternée chaud/froid (contraste)\n- 3 cycles × 30s chaud / 30s froid\n- Plus pratique et effets similaires pour la récupération légère',
  'recovery',
  14
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567811',
  'Foam Rolling et automassage — techniques efficaces',
  E'# Foam Rolling et automassage — techniques efficaces\n\nLe foam rolling (rouleau de massage) est un outil d''auto-entretien musculaire accessible et efficace.\n\n## Comment ça fonctionne ?\n\nLa pression mécanique appliquée sur les tissus mous (myofascia) aide à :\n- Restaurer la mobilité des tissus\n- Réduire les tensions musculaires\n- Améliorer l''afflux sanguin local\n\n## Technique correcte\n\n1. **Localise la zone tendue** : fais rouler lentement jusqu''à trouver un point sensible\n2. **Maintiens la pression** : reste sur ce point 20–30 secondes\n3. **Respire profondément** : l''expiration aide à relâcher\n4. **Ne roule pas sur les articulations** : évite genoux, coudes, colonne\n\n## Zones prioritaires\n\n| Zone | Position |\n|------|----------|\n| Ischio-jambiers | Assis, rouleau sous les cuisses |\n| Quadriceps | Allongé face contre terre |\n| Mollets | Assis, rouleau sous les mollets |\n| Dos thoracique | Allongé sur le dos, rouleau en travers |\n| TFL / Bandelette | Sur le côté |\n| Pectoraux | Allongé sur le côté, rouleau en dessous |\n\n## Quand pratiquer ?\n\n- **Avant l''entraînement** : 5–10 min pour préparer les tissus\n- **Après l''entraînement** : 10–15 min pour favoriser la récupération\n- **Les jours de repos** : 15–20 min pour maintenir la mobilité\n\n## Outils alternatifs\n\n- **Balle de lacrosse** : zones précises (pieds, fessiers, pectoraux)\n- **Rouleau dentelé** : stimulation plus intense\n- **Pistolet de massage** : rapidité et praticité',
  'recovery',
  15
),
-- NOUVEAUX GUIDES MINDSET
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567812',
  'Visualisation mentale — s''entraîner dans sa tête',
  E'# Visualisation mentale — s''entraîner dans sa tête\n\nLa **visualisation** (ou imagerie mentale) est une technique utilisée par les athlètes de haut niveau pour améliorer leurs performances sans soulever un seul kilo.\n\n## Pourquoi ça fonctionne ?\n\nLes études en neurosciences montrent que **le cerveau active les mêmes zones motrices** lors de la visualisation d''un mouvement que lors de sa réalisation physique.\n\n## Types de visualisation\n\n| Type | Description |\n|------|-------------|\n| Interne (1ère personne) | Tu vois avec tes propres yeux |\n| Externe (3ème personne) | Tu te vois de l''extérieur |\n| Motrice | Focus sur les sensations du mouvement |\n| Émotionnelle | Focus sur les émotions de la réussite |\n\n## Protocole de visualisation (10 min)\n\n1. **Installation** : assis ou allongé, yeux fermés, respiration calme (2 min)\n2. **Ancrage sensoriel** : visualise l''environnement (salle, matériel, odeurs, bruits)\n3. **Scène principale** : exécute mentalement ton mouvement ou ta performance en détail\n4. **Ressenti** : engage toutes tes sensations, y compris la réussite\n5. **Retour** : inspire profondément, ouvre les yeux\n\n## Applications pratiques\n\n- Avant un test de charge (1RM)\n- La veille d''une compétition\n- Lors de la récupération d''une blessure\n- Pour automatiser un nouveau geste technique\n\n## Fréquence recommandée\n\n- 5–10 minutes par jour\n- Idéalement avant de dormir ou le matin au réveil',
  'mindset',
  16
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567813',
  'Gestion du stress compétitif — rester performant sous pression',
  E'# Gestion du stress compétitif — rester performant sous pression\n\nLe stress avant une compétition ou un test est **normal et même nécessaire**. La clé est d''apprendre à le canaliser.\n\n## Le stress : ami ou ennemi ?\n\nLa théorie du **niveau optimal d''activation** (Yerkes-Dodson) montre qu''un niveau de stress modéré est associé à une **meilleure performance**. Trop peu → apathie. Trop → paralysie.\n\n## Causes du stress compétitif\n\n- Peur de l''échec ou du jugement\n- Incertitude sur sa propre préparation\n- Pression externe (entraîneur, famille, coéquipiers)\n- Enjeux perçus comme trop élevés\n\n## Techniques de régulation\n\n### Respiration contrôlée\n- **4-7-8** : inspiration 4s, rétention 7s, expiration 8s (3 cycles)\n- Activation du système parasympathique en < 2 minutes\n\n### Recadrage cognitif\n- Remplace "Je vais rater" par "Je me suis préparé pour ce moment"\n- Distinguer ce que tu contrôles (ton effort) de ce que tu ne contrôles pas (les autres)\n\n### Routine pré-compétition\n- Même échauffement, même musique, mêmes gestes\n- La routine crée un sentiment de familiarité et de contrôle\n\n### Talk positif\n- Des affirmations courtes, spécifiques, au présent\n- "Je suis fort(e)", "Je maîtrise ma technique", "Je suis prêt(e)"\n\n## Journal de performance\n\nAprès chaque compétition, note :\n- Ce qui s''est bien passé\n- Ce qui peut être amélioré\n- Ton niveau de stress et comment tu l''as géré',
  'mindset',
  17
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567814',
  'Construire sa confiance en soi — les bases mentales de la progression',
  E'# Construire sa confiance en soi — les bases mentales de la progression\n\nLa confiance en soi sportive n''est pas un trait de personnalité fixe : c''est une **compétence qui se développe**.\n\n## Qu''est-ce que la confiance sportive ?\n\nC''est la certitude d''avoir les ressources nécessaires pour atteindre un objectif. Elle repose sur :\n\n- **Les expériences passées** : tes réussites précédentes\n- **Les expériences vicariantes** : voir d''autres réussir\n- **La persuasion sociale** : les encouragements du coach et de l''entourage\n- **Les états physiologiques** : te sentir en forme physiquement\n\n## Stratégies de construction\n\n### 1. Décomposer les objectifs\nDes petites victoires régulières construisent la confiance plus efficacement qu''un grand objectif lointain.\n\n### 2. Catalogue de réussites\nTiens un journal de tes succès, même mineurs. Relis-le avant une compétition.\n\n### 3. Le processus avant le résultat\nFocalise-toi sur ce que tu fais (ton effort, ta technique) plutôt que sur le résultat final.\n\n### 4. Travailler l''auto-compassion\nL''échec fait partie du développement. Les athlètes qui rebondissent le mieux sont ceux qui s''autorisent à échouer sans se dévaloriser.\n\n### 5. Langage corporel\nAdopte une posture de puissance (épaules ouvertes, tête haute). Le corps influence le mental.\n\n## Signaux d''une faible confiance\n\n- Comparaison constante aux autres\n- Évitement des défis\n- Doutes excessifs avant les entraînements\n- Abandon rapide face aux difficultés\n\n## Signaux d''une haute confiance\n\n- Concentration sur le processus\n- Persévérance face aux obstacles\n- Ouverture aux feedbacks\n- Plaisir dans l''effort',
  'mindset',
  18
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567815',
  'L''état de flow — entrer dans la zone',
  E'# L''état de flow — entrer dans la zone\n\nLe **flow** (ou état de zone) est cet état de conscience où tu es totalement absorbé dans ton activité, avec une sensation d''efficacité et de facilité.\n\n## Caractéristiques du flow\n\n- Concentration totale, sans distractions\n- Fusion entre action et conscience\n- Perte de la notion du temps\n- Sentiment d''efficacité et de contrôle\n- Plaisir intrinsèque de l''activité\n\n## Conditions pour entrer en flow\n\n### 1. Équilibre défi / compétence\nLe flow apparaît quand la **difficulté de la tâche** correspond à ton **niveau de compétence**. Trop facile → ennui. Trop difficile → anxiété.\n\n### 2. Objectifs clairs\nSavoir exactement ce qu''on fait et pourquoi favorise la concentration.\n\n### 3. Feedback immédiat\nSentir si l''on progresse ou non en temps réel.\n\n### 4. Élimination des distractions\nEnvironnement propice : téléphone désactivé, musique adaptée.\n\n## Comment favoriser le flow à l''entraînement ?\n\n- Établis un **rituel pré-entraînement** constant\n- Définis un **objectif précis** pour chaque séance\n- Évite les conversations pendant les séries\n- Utilise de la **musique rythmée** adaptée à ton effort\n- Pratique la pleine conscience du mouvement\n\n## Flow et performance de haut niveau\n\nLes athlètes qui entrent régulièrement en état de flow reportent :\n- De meilleures performances globales\n- Une plus grande satisfaction dans leur sport\n- Une carrière sportive plus longue\n- Moins de burn-out',
  'mindset',
  19
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567816',
  'Fixation d''objectifs SMART en sport',
  E'# Fixation d''objectifs SMART en sport\n\nSe fixer de bons objectifs est l''une des compétences mentales les plus importantes pour progresser durablement.\n\n## La méthode SMART\n\n| Lettre | Critère | Exemple |\n|--------|---------|----------|\n| **S** — Spécifique | Précis, pas vague | "Squatter 100 kg" plutôt que "devenir plus fort" |\n| **M** — Mesurable | Quantifiable | "En 12 semaines, gain de +10 kg au squat" |\n| **A** — Atteignable | Réaliste mais ambitieux | Basé sur ta progression actuelle |\n| **R** — Pertinent | En lien avec tes valeurs | Pourquoi cet objectif compte pour toi ? |\n| **T** — Temporel | Date limite définie | "D''ici au 1er juin 2026" |\n\n## Types d''objectifs\n\n### Objectifs de résultat\n- Ex : finir premier, atteindre un poids cible\n- Motivants mais hors de ton contrôle direct\n\n### Objectifs de performance\n- Ex : battre son record personnel\n- Dépendent principalement de toi\n\n### Objectifs de processus\n- Ex : dormir 8h/nuit pendant 4 semaines, exécuter le tempo correctement\n- Entièrement sous ton contrôle\n\n**Conseil** : associe toujours un objectif de résultat avec des objectifs de processus concrets.\n\n## Révision régulière\n\n- Relis tes objectifs chaque semaine\n- Ajuste-les si les circonstances changent\n- Célèbre les petites victoires sur le chemin\n\n## Exemple pratique\n\n> Objectif : Améliorer mon squat de 80 kg à 100 kg d''ici au 15 mai 2026.\n> \n> Processus : Suivre le programme à 90 %, dormir 7h minimum, faire le mobility work quotidien.',
  'mindset',
  20
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
),
-- NOUVELLES ROUTINES — Mobilité articulaire
(
  'f0a1b2c3-d4e5-6789-abcd-ef0123456789',
  'Mobilité articulaire matinale complète',
  'Routine de mobilité douce pour réveiller toutes les articulations et commencer la journée sans raideur.',
  'mobility',
  12,
  '[{"name":"Cercles de cheville","sets":"10 chaque sens, chaque pied","notes":"Assis ou debout"},{"name":"Cercles de genou","sets":"10 chaque sens, jambes fléchies","notes":"Mains sur les genoux"},{"name":"Cercles de hanche","sets":"10 chaque sens","notes":"Debout, mains sur les hanches"},{"name":"Rotations de la colonne thoracique","sets":"8 chaque côté","notes":"Assis sur un siège, bras croisés sur la poitrine"},{"name":"Cercles d''épaules","sets":"10 chaque sens","notes":"Amplitude maximale"},{"name":"Rotation de la tête","sets":"5 chaque sens","notes":"Lent et contrôlé, sans forcer"}]'
),
(
  'f0a1b2c3-d4e5-6789-abcd-ef0123456790',
  'Mobilité thoracique — libérer le dos supérieur',
  'Améliore la rotation et l''extension du dos supérieur, essentiel pour la posture et les mouvements overhead.',
  'mobility',
  10,
  '[{"name":"Cat-cow (chat-vache)","sets":"2×10","notes":"Synchroniser avec la respiration"},{"name":"Extension thoracique sur rouleau","sets":"2×1 min","notes":"Rouleau perpendiculaire à la colonne"},{"name":"Rotation thoracique en quadrupédie","sets":"2×8 chaque côté","notes":"Main derrière la tête"},{"name":"Thread the needle","sets":"2×6 chaque côté","notes":"Allongé sur le côté, bras en T"},{"name":"Bras en croix avec rotation","sets":"8 chaque côté","notes":"Debout, bras à l''horizontale"}]'
),
(
  'f0a1b2c3-d4e5-6789-abcd-ef0123456791',
  'Mobilité de cheville — pour le squat et la course',
  'Améliore la dorsiflexion de cheville, facteur limitant fréquent du squat profond et de la foulée.',
  'mobility',
  8,
  '[{"name":"Genoux vers le mur (Knee to Wall)","sets":"2×10 chaque côté","notes":"Pied à 5 cm du mur, talon au sol"},{"name":"Étirement du mollet debout","sets":"2×30 s chaque côté","notes":"Pied surélevé, jambe tendue"},{"name":"Étirement du soléaire","sets":"2×30 s chaque côté","notes":"Genou fléchi, talon au sol"},{"name":"Rotations de cheville en décharge","sets":"10 chaque sens","notes":"Assis, pied en l''air"},{"name":"Squat profond maintenu","sets":"2×30 s","notes":"Talons au sol, aide si nécessaire"}]'
),
(
  'f0a1b2c3-d4e5-6789-abcd-ef0123456792',
  'Mobilité des hanches avancée',
  'Routine complète pour les athlètes cherchant à maximiser l''amplitude articulaire des hanches.',
  'mobility',
  15,
  '[{"name":"Fente basse avec rotation","sets":"2×6 chaque côté","notes":"Genou arrière au sol"},{"name":"Pigeon au sol (Sleeping Pigeon)","sets":"2×60 s chaque côté","notes":"Hanches au sol, front sur les mains"},{"name":"Squat profond avec rotation latérale","sets":"2×8 chaque côté","notes":"Coudes sur les genoux"},{"name":"90-90 (hanches à 90°)","sets":"2×45 s chaque côté","notes":"Basculement lent de côté à côté"},{"name":"Hip CARs (contrôle articulaire)","sets":"5 cercles lents chaque hanche","notes":"Amplitude maximale contrôlée"}]'
),
-- NOUVELLES ROUTINES — Activation musculaire
(
  'a2b3c4d5-e6f7-8901-abcd-ef2345678901',
  'Activation des fessiers — pré-séance bas du corps',
  'Active les fessiers avant le squat, la fente ou le soulevé de terre pour améliorer le recrutement musculaire.',
  'activation',
  8,
  '[{"name":"Clamshell avec élastique","sets":"3×15 chaque côté","notes":"Élastique au-dessus des genoux"},{"name":"Pont fessier unilatéral","sets":"3×12 chaque côté","notes":"Maintien 2 s en haut"},{"name":"Monster Walk latéral","sets":"2×10 pas chaque direction","notes":"Élastique aux chevilles, dos droit"},{"name":"Fire Hydrant","sets":"2×12 chaque côté","notes":"En quadrupédie, élastique optionnel"},{"name":"Donkey Kick","sets":"2×15 chaque côté","notes":"Ne pas cambrer le dos"}]'
),
(
  'a2b3c4d5-e6f7-8901-abcd-ef2345678902',
  'Activation du gainage profond — core anti-rotation',
  'Renforce les muscles stabilisateurs du tronc avant une séance de force ou de puissance.',
  'activation',
  10,
  '[{"name":"Dead Bug","sets":"3×8 chaque côté","notes":"Dos plaqué au sol, expiration sur le mouvement"},{"name":"Planche latérale","sets":"3×20 s chaque côté","notes":"Hanches alignées, ne pas affaisser"},{"name":"Anti-rotation avec élastique (Pallof Press)","sets":"3×10 chaque côté","notes":"Élastique à hauteur de poitrine"},{"name":"Bird Dog","sets":"3×8 chaque côté","notes":"Bras et jambe opposés, lent et contrôlé"},{"name":"Hollow Body Hold","sets":"3×20 s","notes":"Dos plaqué, membres allongés"}]'
),
(
  'a2b3c4d5-e6f7-8901-abcd-ef2345678903',
  'Activation haut du corps — pré-séance push/pull',
  'Active les muscles du dos et des épaules avant les exercices de poussée et traction.',
  'activation',
  7,
  '[{"name":"Bande élastique pull-apart","sets":"3×15","notes":"Bras tendus, omoplates ensemble"},{"name":"Rotation externe debout avec élastique","sets":"3×12 chaque côté","notes":"Coude à 90°"},{"name":"Chin tuck contre le mur","sets":"2×10","notes":"Rentrer le menton, allonger la nuque"},{"name":"Serratus Pushup","sets":"2×10","notes":"Planche haute, pousser les omoplates vers le plafond"},{"name":"I-Y-T au TRX ou élastique","sets":"2×8 chaque lettre","notes":"Corps incliné, contrôle total"}]'
),
(
  'a2b3c4d5-e6f7-8901-abcd-ef2345678904',
  'Activation neurologique pré-compétition',
  'Stimule le système nerveux central pour maximiser la puissance et la réactivité avant une compétition ou un test.',
  'activation',
  6,
  '[{"name":"Sauts sur place légers","sets":"2×10","notes":"Réception douce, montée en intensité progressive"},{"name":"Skipping A haut","sets":"2×10 m","notes":"Genoux hauts, bras actifs"},{"name":"Accélérations légères","sets":"3×10 m","notes":"50–60% de la vitesse maximale"},{"name":"Claquements de mains (proprioception)","sets":"10","notes":"Stimulation sensorielle rapide"},{"name":"Jump squat léger","sets":"2×5","notes":"Atterrissage silencieux et contrôlé"}]'
),
-- NOUVELLES ROUTINES — Étirements post-séance
(
  'b3c4d5e6-f7a8-9012-abcd-ef3456789012',
  'Étirements post-séance force — bas du corps',
  'Routine complète d''étirements statiques pour les jambes et les hanches après une séance de musculation.',
  'stretching',
  15,
  '[{"name":"Étirement des quadriceps debout","sets":"2×45 s chaque jambe","notes":"Main au mur pour l''équilibre"},{"name":"Étirement des ischio-jambiers allongé","sets":"2×45 s chaque jambe","notes":"Élastique ou serviette"},{"name":"Fente basse avec étirement du psoas","sets":"2×45 s chaque côté","notes":"Genou arrière au sol"},{"name":"Étirement piriforme (figure 4)","sets":"2×45 s chaque côté","notes":"Allongé sur le dos"},{"name":"Étirement des adducteurs (papillon)","sets":"2×45 s","notes":"Plantes des pieds ensemble, poussée douce des genoux"}]'
),
(
  'b3c4d5e6-f7a8-9012-abcd-ef3456789013',
  'Étirements post-séance — haut du corps',
  'Relâche les tensions du dos, des épaules et des pectoraux après une séance push ou pull.',
  'stretching',
  12,
  '[{"name":"Étirement pectoral contre le mur","sets":"2×30 s chaque côté","notes":"Bras à 90°, rotation du tronc"},{"name":"Étirement des épaules en travers","sets":"2×30 s chaque côté","notes":"Bras horizontal, tirer vers soi"},{"name":"Étirement du grand dorsal","sets":"2×30 s chaque côté","notes":"Main sur un montant, incliner latéralement"},{"name":"Étirement cervical latéral","sets":"30 s chaque côté","notes":"Oreille vers l''épaule, main légère sur la tête"},{"name":"Posture de l''enfant étendue","sets":"1×90 s","notes":"Bras tendus devant soi"}]'
),
(
  'b3c4d5e6-f7a8-9012-abcd-ef3456789014',
  'Yoga de récupération — 20 minutes',
  'Séquence yoga douce pour améliorer la flexibilité globale et favoriser la récupération nerveuse.',
  'stretching',
  20,
  '[{"name":"Salutation au soleil lente (× 3)","sets":"3 cycles","notes":"Synchroniser chaque mouvement avec la respiration"},{"name":"Guerrier I et II","sets":"30 s chaque côté","notes":"Ancrage des pieds, regard droit"},{"name":"Chien tête en bas (Downward Dog)","sets":"60 s","notes":"Talons vers le sol, dos plat"},{"name":"Cobra","sets":"2×20 s","notes":"Coudes près du corps, hanches au sol"},{"name":"Posture du pigeon","sets":"90 s chaque côté","notes":"Hanche avant au sol"},{"name":"Torsion allongée","sets":"45 s chaque côté","notes":"Genou vers le sol, regard en arrière"},{"name":"Savasana","sets":"3 min","notes":"Relaxation totale, respiration abdominale"}]'
),
-- NOUVELLES ROUTINES — Réathlétisation avancées
(
  'c4d5e6f7-a8b9-0123-abcd-ef4567890123',
  'Réathlétisation genou — phase intermédiaire',
  'Progression après la phase initiale : renforcement fonctionnel du genou avec mise en charge progressive.',
  'reathletisation',
  20,
  '[{"name":"Step-up latéral bas","sets":"3×10 chaque côté","notes":"Marche basse 10 cm, contrôle de la descente"},{"name":"Squat unipodal partiel (chaise murale)","sets":"3×15 s","notes":"Une jambe, dos au mur"},{"name":"Fente avant contrôlée","sets":"3×8 chaque côté","notes":"Descente lente 3 s"},{"name":"Pont fessier unilatéral","sets":"3×12 chaque côté","notes":"Maintien 2 s en haut"},{"name":"Équilibre unipodal avec bras","sets":"3×20 s","notes":"Mouvements de bras pour destabiliser"},{"name":"Vélo avec légère résistance","sets":"10 min","notes":"Rotation fluide, pas de douleur"}]'
),
(
  'c4d5e6f7-a8b9-0123-abcd-ef4567890124',
  'Réathlétisation dos — mobilité et renforcement',
  'Programme pour soulager et renforcer le bas du dos après une lombalgie ou douleur chronique.',
  'reathletisation',
  18,
  '[{"name":"Genoux poitrine (knee hugs)","sets":"2×30 s chaque côté","notes":"Allongé sur le dos"},{"name":"Pont fessier bilatéral lent","sets":"3×12","notes":"Tempo 3-1-3, ne pas cambrer"},{"name":"Bird Dog","sets":"3×8 chaque côté","notes":"Bras et jambe opposés, gainage actif"},{"name":"Chat-vache (cat-cow)","sets":"2×10","notes":"Amplitude complète, respiration"},{"name":"Cobra partiel (sphinx)","sets":"2×30 s","notes":"Avant-bras au sol, hanches au sol"},{"name":"Étirement du piriforme","sets":"2×45 s chaque côté","notes":"Figure 4 allongé"}]'
),
(
  'c4d5e6f7-a8b9-0123-abcd-ef4567890125',
  'Réathlétisation cheville — post-entorse',
  'Protocole de réathlétisation après une entorse de cheville légère à modérée.',
  'reathletisation',
  15,
  '[{"name":"Alphabet avec le pied","sets":"2 fois","notes":"En décharge, dessiner l''alphabet"},{"name":"Éversion/Inversion avec élastique","sets":"3×15 chaque sens","notes":"Assis, élastique autour du pied"},{"name":"Élévation sur la pointe des pieds","sets":"3×15","notes":"Montée lente, descente contrôlée"},{"name":"Équilibre unipodal statique","sets":"3×20 s","notes":"Yeux ouverts puis fermés"},{"name":"Équilibre sur plateau instable","sets":"3×30 s","notes":"Si disponible, sinon coussin"},{"name":"Marche talon-pointe","sets":"2×10 m","notes":"Contrôle et précision"}]'
),
-- NOUVELLES ROUTINES — Respiration avancée
(
  'd5e6f7a8-b9c0-1234-abcd-ef5678901234',
  'Respiration Wim Hof — protocole complet',
  'Technique de respiration profonde pour augmenter l''énergie, réduire le stress et renforcer la résistance.',
  'breathing',
  15,
  '[{"name":"Respirations profondes rapides","sets":"30 respirations","notes":"Inspiration profonde par le nez, expiration naturelle par la bouche"},{"name":"Rétention poumons vides","sets":"1–3 min","notes":"Expire complètement et retiens. S''adapter progressivement."},{"name":"Inspiration de récupération","sets":"15 s","notes":"Inspire profondément et retiens 15 s"},{"name":"Répéter le cycle","sets":"3 cycles","notes":"Pause 1–2 min entre chaque cycle"},{"name":"Méditation finale","sets":"3 min","notes":"Respiration naturelle, observation des sensations"}]'
),
(
  'd5e6f7a8-b9c0-1234-abcd-ef5678901235',
  'Respiration pour l''endurance — contrôle respiratoire à l''effort',
  'Développe le contrôle de la respiration pendant l''effort pour améliorer l''endurance et réduire la dyspnée.',
  'breathing',
  10,
  '[{"name":"Respiration nasale seule (marche)","sets":"5 min","notes":"Ferme la bouche, inspire et expire par le nez"},{"name":"Rythmisation (foulée/souffle)","sets":"5 min","notes":"Ex: 3 foulées inspiration, 2 foulées expiration"},{"name":"Expiration forcée à l''effort","sets":"5×30 s","notes":"Contracter les abdominaux sur l''expiration"},{"name":"Respiration diaphragmatique à l''arrêt","sets":"2 min","notes":"Ventre qui gonfle à l''inspiration"},{"name":"Récupération par respiration lente","sets":"3 min","notes":"Allonger progressivement l''expiration"}]'
),
(
  'd5e6f7a8-b9c0-1234-abcd-ef5678901236',
  'Relaxation guidée NSDR (Non-Sleep Deep Rest)',
  'Protocole de récupération profonde sans sommeil. Idéal en milieu de journée ou après un effort intense.',
  'relaxation',
  20,
  '[{"name":"Installation confortable","sets":"1 min","notes":"Allongé sur le dos, yeux fermés, bras le long du corps"},{"name":"Scan corporel descendant","sets":"5 min","notes":"Relâcher chaque partie du corps de la tête aux pieds"},{"name":"Respiration lente régulière","sets":"5 min","notes":"Inspiration 4 s, expiration 6 s, rythme naturel"},{"name":"Visualisation de lourdeur","sets":"5 min","notes":"Imaginer que chaque membre est très lourd et chaud"},{"name":"Phase de désactivation","sets":"4 min","notes":"Laisser les pensées passer sans les suivre"}]'
),
(
  'd5e6f7a8-b9c0-1234-abcd-ef5678901237',
  'Relaxation progressive de Jacobson',
  'Technique de relaxation musculaire progressive par contraste tension-relâchement.',
  'relaxation',
  15,
  '[{"name":"Pieds et mollets — tension 5 s puis relâchement","sets":"2×5 s tension / 15 s relax","notes":"Contracter fort, puis relâcher complètement"},{"name":"Cuisses et fessiers","sets":"2×5 s tension / 15 s relax","notes":"Serrer les muscles, puis laisser fondre"},{"name":"Ventre et dos","sets":"2×5 s tension / 15 s relax","notes":"Rentrer le ventre et tenir"},{"name":"Mains et avant-bras (poing serré)","sets":"2×5 s tension / 15 s relax","notes":"Serrer le poing fort"},{"name":"Épaules (hausser les épaules)","sets":"2×5 s tension / 15 s relax","notes":"Monter les épaules vers les oreilles"},{"name":"Visage (grimacer)","sets":"2×5 s tension / 15 s relax","notes":"Fermer les yeux fort, froncer"}]'
),
-- ROUTINES SUPPLÉMENTAIRES (total 30+)
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012345',
  'Échauffement spécifique course à pied',
  'Prépare les membres inférieurs et le système cardiovasculaire avant une séance de course.',
  'warmup',
  10,
  '[{"name":"Marche rapide","sets":"3 min","notes":"Progresser vers le trot"},{"name":"Skipping A (montées de genoux)","sets":"2×15 m","notes":"Bras actifs, contact sol minimal"},{"name":"Skipping B (extension jambe)","sets":"2×15 m","notes":"Extension complète à chaque pas"},{"name":"Foulées bondissantes","sets":"2×20 m","notes":"Amplitude maximale, bras en opposition"},{"name":"Accélérations progressives","sets":"3×30 m","notes":"60% puis 80% puis 90% de la vitesse max"}]'
),
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012346',
  'Échauffement haltérophilie — mobilité pour le arraché et épaulé-jeté',
  'Préparation articulaire et neuromusculaire spécifique aux mouvements olympiques.',
  'warmup',
  12,
  '[{"name":"Overhead squat avec bâton","sets":"2×10","notes":"Prise large, descente profonde"},{"name":"Snatch balance avec bâton","sets":"2×8","notes":"Descente rapide sous le bâton"},{"name":"Passé de bras en overhead","sets":"2×10","notes":"Bâton dans le dos, prise large"},{"name":"Squat profond avec bras tendus","sets":"2×8","notes":"Bras à la verticale, talon au sol"},{"name":"Jeté en fente avec bâton","sets":"3×5 chaque côté","notes":"Fente avant, bras stabilisés overhead"}]'
),
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012347',
  'Mobilité colonne vertébrale complète',
  'Travail systématique de mobilité de la colonne pour améliorer la posture et prévenir les douleurs.',
  'mobility',
  14,
  '[{"name":"Flexion-extension assise","sets":"10 cycles","notes":"Assis en tailleur, dos round puis arqué"},{"name":"Flexion latérale debout","sets":"2×8 chaque côté","notes":"Main sur la hanche, glisser vers le bas"},{"name":"Rotation assise avec bâton","sets":"2×10 chaque côté","notes":"Bâton derrière les épaules"},{"name":"Backbend contre le mur","sets":"2×30 s","notes":"Mains au mur en hauteur, pousser les hanches"},{"name":"Rotations en suspension","sets":"10 chaque sens","notes":"À une barre, rotation des hanches"}]'
),
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012348',
  'Activation proprioceptive — équilibre et coordination',
  'Travail d''équilibre et de coordination pour améliorer la proprioception et réduire le risque de blessure.',
  'activation',
  8,
  '[{"name":"Équilibre unipodal les yeux fermés","sets":"3×20 s chaque pied","notes":"Surface stable puis instable"},{"name":"Tandem Walk","sets":"2×10 m","notes":"Pied devant pied en ligne droite"},{"name":"Star Excursion Balance Test","sets":"3 directions × 3 chaque jambe","notes":"Pointer le pied aussi loin que possible"},{"name":"Rebonds sur plateau d''équilibre","sets":"3×10","notes":"Réception souple et contrôlée"},{"name":"Saut et stabilisation","sets":"5 par jambe","notes":"Sauter et tenir l''atterrissage 3 s"}]'
),
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012349',
  'Étirements corps entier post-compétition',
  'Routine complète de 25 minutes pour récupérer après une compétition ou un test intense.',
  'stretching',
  25,
  '[{"name":"Marche récupération","sets":"5 min","notes":"Retour au calme progressif"},{"name":"Étirement quadriceps et psoas","sets":"2×45 s chaque côté","notes":"Fente basse, genou arrière au sol"},{"name":"Étirement ischio-jambiers debout","sets":"2×45 s chaque jambe","notes":"Pied sur un banc ou marche"},{"name":"Étirement des mollets","sets":"2×30 s chaque côté","notes":"Jambe tendue puis fléchie"},{"name":"Étirement des pectoraux","sets":"2×30 s chaque côté","notes":"Main au mur"},{"name":"Étirement du grand dorsal","sets":"2×30 s chaque côté","notes":"Inclinaison latérale avec bras tendu"},{"name":"Posture de relaxation (Savasana)","sets":"3 min","notes":"Allongé, relâchement total"}]'
),
(
  'e6f7a8b9-c0d1-2345-abcd-ef6789012350',
  'Réathlétisation tendon d''Achille',
  'Protocole excentrique de Alfredson pour la tendinopathie du tendon d''Achille. À valider avec un kiné.',
  'reathletisation',
  15,
  '[{"name":"Élévation excentrique debout (jambe tendue)","sets":"3×15","notes":"Monter sur les deux jambes, descendre sur une seule, lentement"},{"name":"Élévation excentrique (jambe fléchie)","sets":"3×15","notes":"Genou légèrement fléchi, même protocole"},{"name":"Étirement passif du mollet","sets":"2×30 s chaque côté","notes":"Talon au sol, léger inconfort toléré"},{"name":"Renforcement intrinsèque du pied","sets":"2×20","notes":"Serrement de serviette avec les orteils"},{"name":"Montée d''escalier inversée (marche arrière)","sets":"2×10 marches","notes":"Descendre marche par marche en contrôle"}]'
)
ON CONFLICT (id) DO NOTHING;
