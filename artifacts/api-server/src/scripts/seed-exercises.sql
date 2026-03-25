-- seed-exercises.sql — FICHIER LEGACY/MIGRATION UNIQUEMENT
-- Ce fichier n'est plus le seed principal. Le seed canonique est seed-exercises.ts (TypeScript).
-- Utilisation : migration des données existantes uniquement (UPDATE level, UPDATE réathlétisation).
-- Part 1 : INSERT les exercices absents (WHERE NOT EXISTS par nom + created_by IS NULL)
-- Part 2 : UPDATE level sur les exercices globaux sans level (fix des précédentes insertions)
-- Part 3 : UPDATE category → 'réathlétisation' pour les exercices de réathlétisation

-- ============================================================
-- PART 1 — INSERT
-- ============================================================
WITH exercises_to_insert (name, category, muscle_groups, equipment, description, level) AS (
  VALUES

    -- --------------------------------------------------------
    -- FORCE / POLYARTICULAIRE (15)
    -- --------------------------------------------------------
    (
      'Squat barre',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'Barre posée sur les trapèzes, pieds à largeur des épaules. Descendre jusqu''à ce que les cuisses soient parallèles au sol en gardant le dos droit et les genoux dans l''axe des orteils. Pousser à travers les talons pour remonter.',
      'avancé'
    ),
    (
      'Squat gobelet',
      'compound',
      '["Quadriceps","Fessiers","Core"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Tenir un kettlebell contre la poitrine, coudes vers le bas. Descendre en squat profond en gardant le torse droit. Excellent pour travailler la mobilité de cheville et de hanche simultanément.',
      'débutant'
    ),
    (
      'Fentes avant',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, avancer un pied et descendre le genou arrière vers le sol sans le toucher. Le genou avant ne dépasse pas la pointe du pied. Repousser pour revenir à la position initiale.',
      'débutant'
    ),
    (
      'Fentes marchées',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers","Stabilisateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Avancer en effectuant des fentes continues. Le genou arrière descend près du sol à chaque foulée. Maintenir le torse droit et le regard vers l''avant pendant tout le déplacement.',
      'intermédiaire'
    ),
    (
      'Fentes latérales',
      'compound',
      '["Quadriceps","Adducteurs","Fessiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, ouvrir une jambe sur le côté et fléchir le genou jusqu''à ce que la cuisse soit parallèle au sol. L''autre jambe reste tendue. Alterner ou faire un côté complet.',
      'intermédiaire'
    ),
    (
      'Deadlift',
      'compound',
      '["Ischio-jambiers","Fessiers","Dos","Trapèzes","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'Barre posée au sol, pieds sous la hanche. Saisir en prise pronation ou mixte. Gainage du tronc, dos plat. Pousser le sol pour monter en gardant la barre proche du corps. Hanches et épaules montent simultanément.',
      'avancé'
    ),
    (
      'Hip thrust barre',
      'compound',
      '["Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'Dos appuyé sur un banc, barre sur les hanches. Pieds à plat à largeur des épaules. Descendre les hanches puis pousser vers le haut en contractant fort les fessiers. Finir en pont avec le corps aligné.',
      'intermédiaire'
    ),
    (
      'Développé couché barre',
      'compound',
      '["Pectoraux","Triceps","Épaules antérieures"]'::jsonb,
      '["Barre"]'::jsonb,
      'Allongé sur banc, barre saisie légèrement plus large que les épaules. Descendre jusqu''au sternum en contrôlant, puis repousser en extension complète. Garder les coudes à environ 45° du corps.',
      'intermédiaire'
    ),
    (
      'Développé incliné haltères',
      'compound',
      '["Pectoraux supérieurs","Triceps","Épaules antérieures"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Banc incliné à 30-45°. Haltères en pronation à hauteur de la poitrine. Pousser vers le haut sans verrouiller les coudes, les rapprocher légèrement au sommet. Contrôler la descente.',
      'intermédiaire'
    ),
    (
      'Développé militaire barre',
      'compound',
      '["Épaules","Triceps","Trapèzes supérieurs"]'::jsonb,
      '["Barre"]'::jsonb,
      'Debout ou assis, barre au menton en prise à largeur des épaules. Pousser au-dessus de la tête jusqu''à extension. Redescendre lentement. Gainage abdominal maintenu tout au long du mouvement.',
      'intermédiaire'
    ),
    (
      'Développé militaire haltères',
      'compound',
      '["Épaules","Triceps","Stabilisateurs"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout ou assis, haltères à hauteur des épaules, coudes à 90°. Pousser vers le haut jusqu''à extension. Plus de stabilisation requise que la version barre. Sollicite davantage les muscles stabilisateurs des épaules.',
      'intermédiaire'
    ),
    (
      'Tractions (pull-up)',
      'compound',
      '["Grand dorsal","Biceps","Rhomboïdes","Core"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Prise pronation légèrement plus large que les épaules. Tirer le corps vers le haut jusqu''à ce que le menton dépasse la barre. Descendre lentement à bras tendus. Éviter le balancement.',
      'avancé'
    ),
    (
      'Rowing barre',
      'compound',
      '["Grand dorsal","Rhomboïdes","Biceps","Trapèzes"]'::jsonb,
      '["Barre"]'::jsonb,
      'Buste penché à 45°, barre saisie en pronation. Tirer la barre vers le nombril en serrant les omoplates. Redescendre sous contrôle. Genoux légèrement fléchis, dos plat.',
      'intermédiaire'
    ),
    (
      'Rowing haltère unilatéral',
      'compound',
      '["Grand dorsal","Biceps","Rhomboïdes"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Un genou et une main posés sur un banc, autre pied au sol. Tirer l''haltère vers la hanche en gardant le coude proche du corps. Descendre en extension complète. Corrige les asymétries de force.',
      'intermédiaire'
    ),
    (
      'Chin-up (prise supination)',
      'compound',
      '["Biceps","Grand dorsal","Rhomboïdes"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Prise supination (paumes vers soi) à largeur des épaules. Tirer le corps jusqu''au menton au-dessus de la barre. La prise supination sollicite davantage les biceps comparé au pull-up classique.',
      'avancé'
    ),

    -- --------------------------------------------------------
    -- PUISSANCE / POWER (8)
    -- --------------------------------------------------------
    (
      'Clean de puissance',
      'power',
      '["Corps entier","Quadriceps","Fessiers","Trapèzes","Épaules"]'::jsonb,
      '["Barre"]'::jsonb,
      'Mouvement d''haltérophilie développant la puissance explosive. La barre est tirée du sol avec accélération maximale puis rattrapée en demi-squat. Requiert une technique soignée — commencer léger sous supervision.',
      'avancé'
    ),
    (
      'Push press',
      'power',
      '["Épaules","Triceps","Fessiers","Quadriceps"]'::jsonb,
      '["Barre"]'::jsonb,
      'Barre en position frontale à hauteur des épaules. Légère flexion des genoux (dip), puis extension explosive des jambes et des bras. Combine puissance du bas du corps et force des épaules.',
      'intermédiaire'
    ),
    (
      'Arraché de puissance',
      'power',
      '["Corps entier","Quadriceps","Fessiers","Dos","Épaules"]'::jsonb,
      '["Barre"]'::jsonb,
      'Mouvement explosif amenant la barre du sol au-dessus de la tête en un seul geste. Nécessite une grande coordination et mobilité. Progresser via snatch grip deadlift et high pull avant le mouvement complet.',
      'avancé'
    ),
    (
      'Kettlebell swing',
      'power',
      '["Ischio-jambiers","Fessiers","Core","Épaules"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Pieds plus larges que les épaules. Balancer le kettlebell entre les jambes puis propulser avec une extension explosive des hanches. Les bras restent passifs — c''est la poussée des hanches qui génère le mouvement.',
      'intermédiaire'
    ),
    (
      'Saut à la boîte lesté',
      'power',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Box","Haltères"]'::jsonb,
      'Debout devant la box, haltères légers en main. Fléchir les genoux puis sauter explosif sur la boîte. Descendre sous contrôle. Ajouter le lest uniquement lorsque la technique sans poids est maîtrisée.',
      'intermédiaire'
    ),
    (
      'Médecine ball slam',
      'power',
      '["Core","Épaules","Dos","Quadriceps"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Tenir le médecine ball à deux mains. Élever au-dessus de la tête en extension, puis lancer au sol avec force maximale en fléchissant les hanches. Rattraper le rebond et enchaîner directement.',
      'débutant'
    ),
    (
      'Battle ropes',
      'power',
      '["Épaules","Biceps","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Tenir une corde épaisse dans chaque main. Créer des vagues alternées ou simultanées avec les bras. Genoux légèrement fléchis, tronc stable. Excellent pour la puissance-endurance et la cardio.',
      'débutant'
    ),
    (
      'Kettlebell snatch',
      'power',
      '["Épaules","Core","Ischio-jambiers","Fessiers"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Partir d''un balancement bas et amener le kettlebell au-dessus de la tête en un seul mouvement fluide. Le poignet pivote au passage de la hanche. Exercice technique — commencer par le swing et le high pull.',
      'avancé'
    ),

    -- --------------------------------------------------------
    -- PLIOMÉTRIE (8)
    -- --------------------------------------------------------
    (
      'Depth jump',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Box"]'::jsonb,
      'Tomber d''une box, atterrir et repartir immédiatement en saut vertical avec un temps de contact minimal. Travaille la raideur musculo-tendineuse et le réflexe myotatique. Réservé aux athlètes avec une bonne base de force.',
      'avancé'
    ),
    (
      'Broad jump (saut en longueur)',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, fléchir les genoux, balancer les bras en arrière puis sauter en avant le plus loin possible. Atterrir amorti sur deux pieds. Mesurer la distance pour le suivi de progression.',
      'intermédiaire'
    ),
    (
      'Saut latéral (skater jump)',
      'plyometric',
      '["Fessiers","Quadriceps","Stabilisateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Sauter d''un pied sur l''autre latéralement en imitant le patineur. Atterrir sur un pied, amortir la réception avec le genou fléchi. Augmenter progressivement la distance et la vitesse.',
      'intermédiaire'
    ),
    (
      'Drop jump',
      'plyometric',
      '["Mollets","Quadriceps","Tendon d''Achille"]'::jsonb,
      '["Box"]'::jsonb,
      'Se laisser tomber d''une box basse, atterrir sur la pointe des pieds et rebondir immédiatement le plus haut possible. Réception sur avant-pieds uniquement. Cible la raideur du complexe mollet-tendon.',
      'avancé'
    ),
    (
      'Saut à la corde',
      'plyometric',
      '["Mollets","Quadriceps","Coordination"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Sauter à la corde avec un minimum de hauteur et un maximum de vitesse. Maintenir les coudes près du corps, faire tourner la corde avec les poignets. Développe la coordination, la cadence de pas et l''endurance des mollets.',
      'débutant'
    ),
    (
      'Skipping (montées de genoux hautes)',
      'plyometric',
      '["Quadriceps","Fessiers","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Courir sur place en montant les genoux à hauteur de la hanche à chaque pas. Tempo élevé, bras en opposition. Travaille la cadence, la coordination et la puissance de flexion de hanche.',
      'débutant'
    ),
    (
      'Jumping jacks',
      'plyometric',
      '["Épaules","Fessiers","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Position de départ pieds joints, bras le long du corps. Sauter en écartant les jambes à largeur d''épaules tout en levant les bras au-dessus de la tête, puis revenir. Exercice d''activation cardio et de coordination.',
      'débutant'
    ),
    (
      'Saut vertical (vertical jump)',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, fléchir les genoux et les hanches tout en balançant les bras en arrière, puis sauter le plus haut possible. Atterrir amorti sur deux pieds. Mesurer la hauteur pour le suivi.',
      'débutant'
    ),

    -- --------------------------------------------------------
    -- CARDIO / CONDITIONING (13)
    -- --------------------------------------------------------
    (
      'Course sur tapis roulant',
      'cardio',
      '["Quadriceps","Ischio-jambiers","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Ajuster la vitesse et l''inclinaison selon l''objectif : aérobie modéré (60-70% FCmax), seuil (80-85%), ou intervalles. Maintenir une foulée naturelle, bras actifs, regard droit devant.',
      'débutant'
    ),
    (
      'Vélo stationnaire',
      'cardio',
      '["Quadriceps","Ischio-jambiers","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Cardio à faible impact articulaire. Régler la selle à hauteur de la hanche. Pédaler avec cadence régulière. En endurance continue ou en intervalles. Idéal en récupération active ou en réathlétisation.',
      'débutant'
    ),
    (
      'Rameur ergomètre',
      'cardio',
      '["Corps entier","Dos","Jambes","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Séquence : jambes d''abord (60% de la puissance), puis buste en arrière, puis bras tirent. Au retour : bras, buste, genoux. Ratio 1:2 effort/récupération pour les intervalles.',
      'intermédiaire'
    ),
    (
      'Assault bike',
      'cardio',
      '["Corps entier","Épaules","Quadriceps","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Vélo à résistance à air. Plus on pousse fort, plus la résistance augmente. Alterner sprints courts (15-20 sec) et récupérations. Sollicite simultanément membres supérieurs et inférieurs.',
      'intermédiaire'
    ),
    (
      'Elliptique',
      'cardio',
      '["Quadriceps","Fessiers","Épaules","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Cardio à très faible impact articulaire. Mouvement elliptique simulant la marche nordique. Maintenir la résistance adaptée pour garder une cadence de 65-80 RPM. Excellent en période de blessure.',
      'débutant'
    ),
    (
      'Sled push (traîneau)',
      'cardio',
      '["Quadriceps","Fessiers","Épaules","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Pousser un traîneau lesté. Rester penché en avant, bras tendus sur les poignées. Cadence de pas rapide et courte. Intervalle classique : 20-30 m de poussée, 2 min de repos.',
      'intermédiaire'
    ),
    (
      'Sled pull (traction traîneau)',
      'cardio',
      '["Ischio-jambiers","Fessiers","Dos","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Tirer un traîneau lesté via cordes ou baudrier. Peut se faire en marchant en arrière ou en course avant avec harnais. Excellent pour la réathlétisation des genoux.',
      'intermédiaire'
    ),
    (
      'Farmer''s carry (marche fermière)',
      'cardio',
      '["Avant-bras","Trapèzes","Core","Stabilisateurs"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Tenir des haltères lourds dans chaque main, bras le long du corps. Marcher sur une distance donnée en maintenant le torse droit et les omoplates serrées. Développe la force de préhension et l''endurance.',
      'intermédiaire'
    ),
    (
      'Wall ball',
      'cardio',
      '["Quadriceps","Épaules","Core"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Tenir le médecine ball à hauteur du menton. Descendre en squat, puis lancer le ballon contre un mur à environ 3 m lors de la remontée. Attraper le rebond et enchaîner directement avec le squat suivant.',
      'intermédiaire'
    ),
    (
      'Montées de genoux sur place',
      'cardio',
      '["Quadriceps","Core","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Courir sur place à haute intensité en montant les genoux au niveau des hanches. Bras actifs en opposition. Maintenir un rythme élevé. Idéal en circuit training ou comme exercice de transition cardio.',
      'débutant'
    ),
    (
      'Burpee avec saut',
      'cardio',
      '["Corps entier","Pectoraux","Core","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis debout : poser les mains au sol, sauter pieds en arrière, effectuer une pompe, sauter pieds vers les mains, puis saut vertical bras levés. Enchaîner sans pause.',
      'intermédiaire'
    ),
    (
      'Sprint sur place',
      'cardio',
      '["Quadriceps","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Sprinter sur place à intensité maximale pendant 10-20 secondes. Monter les genoux haut, bras actifs. Tabata classique : 8 rounds de 20 sec effort / 10 sec repos.',
      'débutant'
    ),
    (
      'Fente sautée (jumping lunge)',
      'cardio',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position de fente basse, sauter et changer de jambe en l''air pour atterrir en fente sur l''autre jambe. Alterner rapidement. Combine cardio et travail pliométrique des membres inférieurs.',
      'intermédiaire'
    ),

    -- --------------------------------------------------------
    -- MOBILITÉ (14 = 12 + 2 nouvelles)
    -- --------------------------------------------------------
    (
      'Mobilisation thoracique au foam roller',
      'mobility',
      '["Colonne thoracique","Dos"]'::jsonb,
      '["Foam roller"]'::jsonb,
      'Foam roller perpendiculairement à la colonne, sous les omoplates. Bras croisés sur la poitrine, laisser la tête descendre. Rouler doucement de T4 à T12. S''arrêter sur les zones tendues 30-60 sec.',
      'débutant'
    ),
    (
      'Hip flexor stretch',
      'mobility',
      '["Fléchisseurs de hanche","Quadriceps"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de fente basse, genou arrière au sol. Avancer légèrement pour étirer le fléchisseur de hanche de la jambe arrière. Contracter le fessier arrière pour augmenter l''étirement. 30-60 sec par côté.',
      'débutant'
    ),
    (
      'Étirement piriforme (figure 4)',
      'mobility',
      '["Piriforme","Fessiers","Rotateurs externes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, croiser une cheville sur le genou opposé. Saisir la cuisse du bas et tirer vers la poitrine. Tenir 30-60 sec par côté. Soulage les douleurs du nerf sciatique liées à la tension du piriforme.',
      'débutant'
    ),
    (
      'Mobilisation hanche 90/90',
      'mobility',
      '["Hanche","Rotateurs internes","Rotateurs externes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Assis au sol, les deux jambes à 90° (jambe avant en rotation externe, jambe arrière en rotation interne). Se pencher sur la jambe avant puis en rotation vers la jambe arrière. Développe la polyvalence de la hanche.',
      'débutant'
    ),
    (
      'Cat-cow (chat-vache)',
      'mobility',
      '["Colonne vertébrale","Core","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes. Inspiration : creuser le dos, lever tête et coccyx (vache). Expiration : arrondir le dos vers le plafond, rentrer le menton et le bassin (chat). Mouvement continu et contrôlé.',
      'débutant'
    ),
    (
      'Thread the needle (rotation thoracique)',
      'mobility',
      '["Colonne thoracique","Épaule","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes. Glisser un bras sous le corps en rotation jusqu''à poser l''épaule au sol. Tenir 3-5 sec puis revenir. Option : lever le bras libre vers le plafond. Excellente mobilité thoracique en rotation.',
      'débutant'
    ),
    (
      'Spiderman stretch',
      'mobility',
      '["Fléchisseurs hanche","Adducteurs","Colonne thoracique"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En position de pompe, avancer un pied vers la main du même côté. Poser le pied à l''extérieur de la main. Option : rotation du bras vers le plafond. Combine étirements et mobilité thoracique.',
      'débutant'
    ),
    (
      'World''s greatest stretch',
      'mobility',
      '["Fléchisseurs hanche","Adducteurs","Colonne thoracique","Ischio-jambiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En fente avant : main arrière au sol, rotation du bras avant vers le plafond, puis redresser la jambe avant. Enchaîner les 3 mouvements sur 5 reps par côté. Considéré comme l''étirement le plus complet.',
      'intermédiaire'
    ),
    (
      'Band pull-apart (élastique)',
      'mobility',
      '["Rotateurs externes épaule","Rhomboïdes","Trapèzes"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Tenir un élastique à deux mains devant soi, bras tendus à hauteur des épaules. Écarter les bras en tirant l''élastique jusqu''à toucher la poitrine. Contrôler le retour. Active la coiffe et renforce les muscles posturaux.',
      'débutant'
    ),
    (
      'Flexion de cheville au mur',
      'mobility',
      '["Cheville","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout face au mur, un pied à environ 10-15 cm. Fléchir le genou pour toucher le mur sans décoller le talon. Avancer progressivement le pied. Teste et améliore la dorsiflexion de cheville, essentielle pour le squat profond.',
      'débutant'
    ),
    (
      'Dislocations épaules',
      'mobility',
      '["Épaule","Rotateurs","Coiffe des rotateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Tenir un bâton ou une corde devant soi, mains très écartées. Passer le bâton par-dessus la tête jusqu''à l''amener derrière le dos, bras tendus. Réduire progressivement l''écartement des mains au fil des séances.',
      'intermédiaire'
    ),
    (
      'Hip CARs (cercles de hanche)',
      'mobility',
      '["Hanche","Stabilisateurs","Fessiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe, lever le genou opposé et faire des cercles complets avec la hanche. Lentement, avec amplitude maximale et contrôle. 5 répétitions par direction et par côté.',
      'intermédiaire'
    ),
    (
      'Rotation cervicale active',
      'mobility',
      '["Cervicales","Muscles du cou"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Assis ou debout, dos droit. Tourner lentement la tête vers la droite jusqu''à la limite de la rotation, maintenir 2 sec, revenir au centre, puis à gauche. 5 à 8 répétitions par côté. Améliore la mobilité cervicale et la posture.',
      'débutant'
    ),
    (
      'Étirement pectoral au mur',
      'mobility',
      '["Pectoraux","Épaule antérieure","Biceps"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout face à un mur ou un montant. Placer le bras en L (coude à 90°) contre la surface. Pivoter le corps vers l''opposé jusqu''à sentir l''étirement dans le pectoral et l''épaule. 30-60 sec par côté.',
      'débutant'
    ),

    -- --------------------------------------------------------
    -- CORE / GAINAGE (20)
    -- --------------------------------------------------------
    (
      'Gainage frontal (planche)',
      'core',
      '["Core","Épaules","Fessiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de gainage sur avant-bras, corps en ligne droite de la tête aux talons. Contracter les fessiers, serrer le core, regarder le sol. Éviter que les hanches s''affaissent ou montent. Variantes sur les mains, avec élévation.',
      'débutant'
    ),
    (
      'Gainage dynamique (planche avec rotation)',
      'core',
      '["Core","Épaules","Obliques"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Depuis planche sur les mains, pivots latéraux : rotation du corps pour lever un bras vers le plafond (side plank), puis revenir au centre. Alterner. Contrôler la rotation et stabiliser le bassin.',
      'intermédiaire'
    ),
    (
      'Crunch inversé',
      'core',
      '["Abdominaux inférieurs","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, jambes en l''air. Contracter les abdominaux pour soulever le bassin du sol et ramener les genoux vers la poitrine. Redescendre lentement sans laisser les jambes tomber.',
      'débutant'
    ),
    (
      'Russian twist',
      'core',
      '["Obliques","Core","Abdominaux"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Assis, genoux fléchis, buste à 45°. Tenir un poids ou médecine ball contre la poitrine. Rotation du buste de droite à gauche en contrôlant. Progression : jambes levées ou amplitude accrue.',
      'débutant'
    ),
    (
      'Relevé de jambes suspendu',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Suspendu à la barre, bras tendus. Lever les jambes tendues jusqu''à l''horizontale en contractant les abdominaux. Redescendre sans se balancer. Variante accessible : genoux fléchis.',
      'avancé'
    ),
    (
      'Ab wheel rollout',
      'core',
      '["Core","Grand dorsal","Épaules"]'::jsonb,
      '["Aucun"]'::jsonb,
      'À genoux, tenir la roue abdominale. Faire rouler vers l''avant en étendant le corps dos plat jusqu''à la limite de contrôle. Revenir en fléchissant les hanches. Développe la résistance à l''extension du tronc.',
      'intermédiaire'
    ),
    (
      'Dragon flag',
      'core',
      '["Core","Abdominaux","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur un banc, saisir le banc derrière la tête. Soulever les hanches et le corps jusqu''à la verticalité, puis descendre en corps rigide en résistant à la gravité. Exercice avancé — commencer par variantes genoux fléchis.',
      'avancé'
    ),
    (
      'Pallof press',
      'core',
      '["Core","Obliques","Stabilisateurs"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Debout de côté par rapport à un câble, poignée à hauteur du sternum. Pousser vers l''avant jusqu''à extension des bras sans laisser la rotation s''installer, puis ramener. Excellent pour la stabilité anti-rotation.',
      'intermédiaire'
    ),
    (
      'Dead bug',
      'core',
      '["Core","Abdominaux","Stabilisateurs lombaires"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, bras tendus au plafond, genoux à 90° en l''air. Abaisser simultanément bras droit et jambe gauche sans décoller le dos du sol. Revenir et alterner. Développe le gainage profond sans contrainte spinale.',
      'débutant'
    ),
    (
      'Hollow body hold',
      'core',
      '["Core","Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, bras tendus derrière la tête, jambes tendues légèrement décollées du sol. Presser le bas du dos contre le sol. Maintenir en respirant normalement. Exercice fondamental de la gymnastique.',
      'intermédiaire'
    ),
    (
      'Bicycle crunch',
      'core',
      '["Obliques","Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, mains derrière la tête, jambes levées. Alterner : ramener un genou vers la poitrine tout en tournant le buste pour amener le coude opposé vers ce genou. Mouvement de pédalage.',
      'débutant'
    ),
    (
      'V-up',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé à plat, bras derrière la tête, jambes jointes. Soulever simultanément les bras et les jambes pour former un V, toucher les orteils ou les tibias. Redescendre lentement. Sollicite tout le droit abdominal.',
      'intermédiaire'
    ),
    (
      'RKC plank',
      'core',
      '["Core","Fessiers","Quadriceps","Épaules"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de gainage sur les avant-bras. Contracter simultanément les fessiers, serrer les cuisses, écraser les poings au sol. Cette contraction maximale augmente considérablement la difficulté. 10 sec intenses = 1 min de planche classique.',
      'intermédiaire'
    ),
    (
      'Gainage avec marche de bras',
      'core',
      '["Core","Épaules","Triceps"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Depuis planche sur avant-bras, se lever sur une main puis sur l''autre pour arriver en planche haute, puis redescendre. Alterner le bras qui mène. Hanches stables sans rotation. Combine gainage et force des épaules.',
      'intermédiaire'
    ),
    (
      'Rotation du tronc avec câble',
      'core',
      '["Obliques","Core"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Debout de côté face à un câble. Saisir la poignée à deux mains, bras tendus. Rotation du buste en tirant le câble de façon contrôlée. En woodchop (haut-bas) ou reverse woodchop (bas-haut). Développe les obliques fonctionnellement.',
      'intermédiaire'
    ),
    (
      'Side bend haltère',
      'core',
      '["Obliques","Carré des lombes"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout, haltère dans une main, bras le long du corps. Inclinaison latérale vers le côté portant l''haltère, puis contraction des obliques opposés pour revenir. Unilatéral pour maximiser le recrutement.',
      'débutant'
    ),
    (
      'Sit-up complet',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, genoux fléchis, pieds au sol. Monter le buste jusqu''à la position assise puis redescendre de façon contrôlée. Amplitude complète comparée au crunch partiel.',
      'débutant'
    ),
    (
      'Copenhagen plank (adducteurs)',
      'core',
      '["Adducteurs","Core","Obliques"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le côté, pied supérieur sur un banc ou une box. Soulever les hanches pour former une ligne droite. La jambe inférieure peut rester au sol (version facile) ou être soulevée. Cible spécifiquement les adducteurs.',
      'avancé'
    ),
    (
      'Tuck crunch',
      'core',
      '["Abdominaux","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, jambes soulevées à 90°. Ramener simultanément les genoux vers la poitrine et soulever les épaules. Contracter fort les abdominaux au point de compression. Pieds ne touchent pas le sol entre les reps.',
      'débutant'
    ),
    (
      'Plank leg raise',
      'core',
      '["Core","Fessiers","Stabilisateurs"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En gainage sur les mains. Lever une jambe tendue à environ 30 cm du sol, maintenir 2 sec, reposer. Alterner. Le bassin ne tourne ni ne s''affaisse. Ajoute une déstabilisation et un recrutement fessier.',
      'intermédiaire'
    ),

    -- --------------------------------------------------------
    -- RÉATHLÉTISATION (16 = 15 + 1 nouvelle)
    -- --------------------------------------------------------
    (
      'Pont fessier (glute bridge)',
      'réathlétisation',
      '["Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, genoux fléchis à 90°, pieds à plat. Pousser le sol pour soulever les hanches jusqu''à alignement genoux-hanches-épaules. Contracter les fessiers au sommet. Active les fessiers et utilisé en réathlétisation du genou.',
      'débutant'
    ),
    (
      'Clamshell (coquille)',
      'réathlétisation',
      '["Fessiers moyens","Rotateurs externes hanche"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Allongé sur le côté, genoux fléchis à 45°, hanches empilées. Lever le genou supérieur comme une coquille qui s''ouvre, sans rouler le bassin. Élastique au-dessus des genoux pour progresser. Exercice clé en réathlétisation du genou.',
      'débutant'
    ),
    (
      'Monster walk (marche avec élastique)',
      'réathlétisation',
      '["Fessiers","Abducteurs","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Élastique au-dessus des genoux. Légère flexion des genoux. Avancer en maintenant l''élastique tendu à chaque pas, sans laisser les genoux se rapprocher. Variantes : avant, arrière, latérale. Outil fondamental de préhabilitation.',
      'débutant'
    ),
    (
      'Terminal knee extension (TKE)',
      'réathlétisation',
      '["Quadriceps","VMO","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Élastique attaché derrière le genou (loop autour d''un poteau). Debout, genou légèrement fléchi. Étendre le genou contre la résistance jusqu''à extension complète. Maintenir 2 sec. Cible le VMO et améliore le contrôle de l''extension.',
      'débutant'
    ),
    (
      'Rotation externe coiffe des rotateurs',
      'réathlétisation',
      '["Rotateurs externes épaule","Coiffe des rotateurs"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Coude fléchi à 90°, collé au flanc. Rotation externe de l''avant-bras contre un élastique ou un câble. Contrôler le retour. Peut se faire couché sur le côté avec haltère léger. Exercice prophylactique pour la santé de l''épaule.',
      'débutant'
    ),
    (
      'Y-T-W-L (exercice épaule)',
      'réathlétisation',
      '["Trapèzes moyens et inférieurs","Rhomboïdes","Coiffe des rotateurs"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé ventre au sol ou sur banc incliné, bras tendus. Former successivement Y (bras à 45°), T (bras à 90°), W (coudes à 90° en hauteur), L (coudes à 90° le long du corps). Haltères légers ou poids du corps.',
      'débutant'
    ),
    (
      'Single leg deadlift (corps libre)',
      'réathlétisation',
      '["Ischio-jambiers","Fessiers","Stabilisateurs cheville"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe. Pencher le buste vers l''avant tout en élevant la jambe libre derrière soi jusqu''à former une ligne horizontale. Commencer sans poids, progresser avec haltère. Développe l''équilibre et les ischio-jambiers.',
      'intermédiaire'
    ),
    (
      'Équilibre sur une jambe',
      'réathlétisation',
      '["Stabilisateurs cheville","Proprioception","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe, autre genou levé. Maintenir l''équilibre 30-60 sec. Progressions : yeux fermés, surface instable, lancers de balle. Base de la réathlétisation proprioceptive après entorse ou chirurgie du genou.',
      'débutant'
    ),
    (
      'Step-down excentrique',
      'réathlétisation',
      '["Quadriceps","VMO","Stabilisateurs genou"]'::jsonb,
      '["Box"]'::jsonb,
      'Debout sur une box. Descendre lentement (3-4 sec) le pied libre vers le sol sans le poser, en contrôlant avec la jambe d''appui. Remonter. L''accent excentrique renforce le quadriceps, essentiel après blessure au genou.',
      'intermédiaire'
    ),
    (
      'Reverse Nordic curl',
      'réathlétisation',
      '["Quadriceps","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À genoux sur tapis, pieds bloqués. Corps droit. Se pencher en arrière le plus lentement possible, corps rigide. Revenir avec les mains au sol. Travaille les quadriceps excentriquement — utile en prévention des blessures au genou.',
      'avancé'
    ),
    (
      'Nordic curl (ischio-jambiers)',
      'réathlétisation',
      '["Ischio-jambiers","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À genoux, chevilles bloquées par un partenaire. Descendre lentement le buste vers le sol en résistant avec les ischio-jambiers. Se rattraper avec les mains. Un des exercices les plus efficaces en prévention des déchirures des ischio-jambiers.',
      'avancé'
    ),
    (
      'Dorsal (superman)',
      'réathlétisation',
      '["Lombaires","Fessiers","Trapèzes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé ventre au sol, bras tendus devant. Soulever simultanément les bras et les jambes en contractant lombaires et fessiers. Maintenir 2-3 sec au sommet. Renforce les érecteurs du rachis et les fessiers.',
      'débutant'
    ),
    (
      'Bird dog',
      'réathlétisation',
      '["Lombaires","Core","Fessiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes, mains sous épaules, genoux sous hanches. Étendre simultanément bras droit et jambe gauche jusqu''à l''horizontale. Maintenir 3 sec, revenir. Alterner. Développe la stabilité lombaire et la coordination croisée.',
      'débutant'
    ),
    (
      'Lateral band walk (marche latérale)',
      'réathlétisation',
      '["Fessiers moyens","Abducteurs","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Mini-bande au-dessus des genoux. Légère flexion des genoux. Pas latéraux en maintenant la tension de l''élastique. Les pieds ne se rejoignent pas complètement. Active le moyen fessier et améliore la stabilité en valgus du genou.',
      'débutant'
    ),
    (
      'Pistol squat assisté',
      'réathlétisation',
      '["Quadriceps","Fessiers","Stabilisateurs","Cheville"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Squat sur une jambe en tenant un élastique ou support pour l''équilibre. Descendre le plus bas possible, jambe libre décollée du sol. La bande assiste le bas du mouvement. Développe la force unijambiste.',
      'avancé'
    ),
    (
      'Hip hinge assisté',
      'réathlétisation',
      '["Ischio-jambiers","Fessiers","Lombaires"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout dos contre un mur, hanches à 30 cm du mur. Fléchir les hanches en poussant les fesses vers le mur, dos plat. Toucher le mur avec les fesses, puis revenir en extension. Apprend le mouvement de charnière (hinge) essentiel à tous les exercices de postérieure.',
      'débutant'
    ),

    -- --------------------------------------------------------
    -- ISOLATION (10 = 6 + 4 nouvelles)
    -- --------------------------------------------------------
    (
      'Curl biceps barre',
      'isolation',
      '["Biceps"]'::jsonb,
      '["Barre"]'::jsonb,
      'Debout, barre saisie en prise supination à largeur des épaules. Fléchir les coudes pour monter la barre jusqu''aux épaules sans bouger les coudes ni le buste. Descendre lentement. Concentration maximale sur la flexion des biceps.',
      'débutant'
    ),
    (
      'Curl biceps haltères',
      'isolation',
      '["Biceps"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout, haltères en prise neutre ou supination. Fléchir les coudes en alternant ou simultanément. Tourner les poignets vers le haut lors de la montée pour maximiser la contraction. Variante : curl incliné pour étirement accru.',
      'débutant'
    ),
    (
      'Extension triceps poulie haute',
      'isolation',
      '["Triceps"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Face à la poulie haute. Saisir la poignée (corde ou barre), coudes fléchis à hauteur du menton. Étendre les bras vers le bas jusqu''à extension complète. Les coudes restent fixes et collés au corps.',
      'débutant'
    ),
    (
      'Leg curl couché machine',
      'isolation',
      '["Ischio-jambiers"]'::jsonb,
      '["Machine"]'::jsonb,
      'Allongé sur la machine, mollets sur le rouleau. Fléchir les genoux pour ramener les talons vers les fessiers. Contrôler la descente excentrique. Cible le biceps fémoral et les semi-tendineux.',
      'débutant'
    ),
    (
      'Leg extension machine',
      'isolation',
      '["Quadriceps"]'::jsonb,
      '["Machine"]'::jsonb,
      'Assis sur la machine, mollets sous le rouleau. Étendre les genoux jusqu''à extension complète, maintenir 1 sec, redescendre lentement. Exercice d''isolation des quadriceps. À utiliser avec prudence en cas de problèmes patellaires.',
      'débutant'
    ),
    (
      'Hip abduction machine',
      'isolation',
      '["Fessiers moyens","Abducteurs"]'::jsonb,
      '["Machine"]'::jsonb,
      'Assis sur la machine, dos droit. Pousser les cuisses vers l''extérieur contre la résistance. Revenir lentement sous contrôle. Cible le moyen et petit fessier. Complémentaire du travail debout avec élastique.',
      'débutant'
    ),
    (
      'Curl incliné haltères',
      'isolation',
      '["Biceps","Biceps long"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Assis sur un banc incliné à 45°. Laisser les bras pendre en extension complète de chaque côté. Fléchir les coudes pour amener les haltères vers les épaules. L''inclinaison allonge davantage le biceps, augmentant l''étirement en bas.',
      'intermédiaire'
    ),
    (
      'Skull crusher (extension triceps couché)',
      'isolation',
      '["Triceps","Triceps long"]'::jsonb,
      '["Barre"]'::jsonb,
      'Allongé sur banc horizontal, barre saisie à largeur des épaules prise pronation, bras tendus au plafond. Fléchir les coudes pour descendre la barre vers le front. Étendre sans verrouiller les coudes. Excellent pour le triceps long.',
      'intermédiaire'
    ),
    (
      'Croisé câble (cable fly)',
      'isolation',
      '["Pectoraux","Épaule antérieure"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Debout entre deux poulies hautes, une poignée dans chaque main. Légère flexion des coudes. Ramener les deux bras en arc de cercle vers le centre de la poitrine. Contrôler le retour en extension. Isolation pure des pectoraux.',
      'débutant'
    ),
    (
      'Shrug barre (haussement d''épaules)',
      'isolation',
      '["Trapèzes","Élévateurs de la scapula"]'::jsonb,
      '["Barre"]'::jsonb,
      'Debout, barre saisie en pronation à largeur des épaules. Hausser les épaules vers les oreilles aussi haut que possible. Tenir 1-2 sec au sommet, puis redescendre lentement. Ne pas rouler les épaules. Développe les trapèzes supérieurs.',
      'débutant'
    )

)
INSERT INTO exercises (name, category, muscle_groups, equipment, description, level)
SELECT ex.name, ex.category, ex.muscle_groups, ex.equipment, ex.description, ex.level
FROM exercises_to_insert ex
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.name = ex.name AND e.created_by IS NULL
);

-- ============================================================
-- PART 2 — UPDATE level sur les exercices globaux sans level
-- (couvre les exercices insérés avant l'ajout du champ level)
-- ============================================================
UPDATE exercises
SET level = updates.lvl
FROM (VALUES
  ('Squat barre', 'avancé'),
  ('Squat gobelet', 'débutant'),
  ('Fentes avant', 'débutant'),
  ('Fentes marchées', 'intermédiaire'),
  ('Fentes latérales', 'intermédiaire'),
  ('Deadlift', 'avancé'),
  ('Hip thrust barre', 'intermédiaire'),
  ('Développé couché barre', 'intermédiaire'),
  ('Développé incliné haltères', 'intermédiaire'),
  ('Développé militaire barre', 'intermédiaire'),
  ('Développé militaire haltères', 'intermédiaire'),
  ('Tractions (pull-up)', 'avancé'),
  ('Rowing barre', 'intermédiaire'),
  ('Rowing haltère unilatéral', 'intermédiaire'),
  ('Chin-up (prise supination)', 'avancé'),
  ('Clean de puissance', 'avancé'),
  ('Push press', 'intermédiaire'),
  ('Arraché de puissance', 'avancé'),
  ('Kettlebell swing', 'intermédiaire'),
  ('Saut à la boîte lesté', 'intermédiaire'),
  ('Médecine ball slam', 'débutant'),
  ('Battle ropes', 'débutant'),
  ('Kettlebell snatch', 'avancé'),
  ('Depth jump', 'avancé'),
  ('Broad jump (saut en longueur)', 'intermédiaire'),
  ('Saut latéral (skater jump)', 'intermédiaire'),
  ('Drop jump', 'avancé'),
  ('Saut à la corde', 'débutant'),
  ('Skipping (montées de genoux hautes)', 'débutant'),
  ('Jumping jacks', 'débutant'),
  ('Saut vertical (vertical jump)', 'débutant'),
  ('Course sur tapis roulant', 'débutant'),
  ('Vélo stationnaire', 'débutant'),
  ('Rameur ergomètre', 'intermédiaire'),
  ('Assault bike', 'intermédiaire'),
  ('Elliptique', 'débutant'),
  ('Sled push (traîneau)', 'intermédiaire'),
  ('Sled pull (traction traîneau)', 'intermédiaire'),
  ('Farmer''s carry (marche fermière)', 'intermédiaire'),
  ('Wall ball', 'intermédiaire'),
  ('Montées de genoux sur place', 'débutant'),
  ('Burpee avec saut', 'intermédiaire'),
  ('Sprint sur place', 'débutant'),
  ('Fente sautée (jumping lunge)', 'intermédiaire'),
  ('Mobilisation thoracique au foam roller', 'débutant'),
  ('Hip flexor stretch', 'débutant'),
  ('Étirement piriforme (figure 4)', 'débutant'),
  ('Mobilisation hanche 90/90', 'débutant'),
  ('Cat-cow (chat-vache)', 'débutant'),
  ('Thread the needle (rotation thoracique)', 'débutant'),
  ('Spiderman stretch', 'débutant'),
  ('World''s greatest stretch', 'intermédiaire'),
  ('Band pull-apart (élastique)', 'débutant'),
  ('Flexion de cheville au mur', 'débutant'),
  ('Dislocations épaules', 'intermédiaire'),
  ('Hip CARs (cercles de hanche)', 'intermédiaire'),
  ('Rotation cervicale active', 'débutant'),
  ('Étirement pectoral au mur', 'débutant'),
  ('Gainage frontal (planche)', 'débutant'),
  ('Gainage dynamique (planche avec rotation)', 'intermédiaire'),
  ('Crunch inversé', 'débutant'),
  ('Russian twist', 'débutant'),
  ('Relevé de jambes suspendu', 'avancé'),
  ('Ab wheel rollout', 'intermédiaire'),
  ('Dragon flag', 'avancé'),
  ('Pallof press', 'intermédiaire'),
  ('Dead bug', 'débutant'),
  ('Hollow body hold', 'intermédiaire'),
  ('Bicycle crunch', 'débutant'),
  ('V-up', 'intermédiaire'),
  ('RKC plank', 'intermédiaire'),
  ('Gainage avec marche de bras', 'intermédiaire'),
  ('Rotation du tronc avec câble', 'intermédiaire'),
  ('Side bend haltère', 'débutant'),
  ('Sit-up complet', 'débutant'),
  ('Copenhagen plank (adducteurs)', 'avancé'),
  ('Tuck crunch', 'débutant'),
  ('Plank leg raise', 'intermédiaire'),
  ('Pont fessier (glute bridge)', 'débutant'),
  ('Clamshell (coquille)', 'débutant'),
  ('Monster walk (marche avec élastique)', 'débutant'),
  ('Terminal knee extension (TKE)', 'débutant'),
  ('Rotation externe coiffe des rotateurs', 'débutant'),
  ('Y-T-W-L (exercice épaule)', 'débutant'),
  ('Single leg deadlift (corps libre)', 'intermédiaire'),
  ('Équilibre sur une jambe', 'débutant'),
  ('Step-down excentrique', 'intermédiaire'),
  ('Reverse Nordic curl', 'avancé'),
  ('Nordic curl (ischio-jambiers)', 'avancé'),
  ('Dorsal (superman)', 'débutant'),
  ('Bird dog', 'débutant'),
  ('Lateral band walk (marche latérale)', 'débutant'),
  ('Pistol squat assisté', 'avancé'),
  ('Hip hinge assisté', 'débutant'),
  ('Curl biceps barre', 'débutant'),
  ('Curl biceps haltères', 'débutant'),
  ('Extension triceps poulie haute', 'débutant'),
  ('Leg curl couché machine', 'débutant'),
  ('Leg extension machine', 'débutant'),
  ('Hip abduction machine', 'débutant'),
  ('Curl incliné haltères', 'intermédiaire'),
  ('Skull crusher (extension triceps couché)', 'intermédiaire'),
  ('Croisé câble (cable fly)', 'débutant'),
  ('Shrug barre (haussement d''épaules)', 'débutant'),
  ('Développé couché haltères', 'intermédiaire'),
  ('Fentes bulgares', 'intermédiaire'),
  ('Pompes diamant', 'intermédiaire'),
  ('Presse inclinée', 'intermédiaire'),
  ('Soulevé de terre roumain', 'intermédiaire'),
  ('Step-up', 'débutant'),
  ('Tirage horizontal câble', 'débutant'),
  ('Tirage vertical poulie', 'débutant'),
  ('Traction australienne', 'débutant'),
  ('Crunch abdominaux', 'débutant'),
  ('Curl marteau', 'débutant'),
  ('Face pull', 'débutant'),
  ('Élévations latérales', 'débutant'),
  ('Gainage latéral', 'débutant'),
  ('Respiration diaphragmatique', 'débutant'),
  ('Étirement quadriceps', 'débutant'),
  ('Box jump', 'intermédiaire'),
  ('Burpees', 'intermédiaire'),
  ('Mountain climbers', 'débutant'),
  ('Arraché de puissance (snatch)', 'avancé'),
  ('Dislocations épaules (bâton)', 'intermédiaire'),
  ('Hip flexor stretch (étirement fléchisseur hanche)', 'débutant'),
  ('Jumping jacks (sauts écartés)', 'débutant'),
  ('Jumping lunge (fente sautée)', 'intermédiaire'),
  ('Ouverture hanche en cercles (hip CARs)', 'intermédiaire'),
  ('RKC plank (planche avec contraction maximale)', 'intermédiaire'),
  ('Renforcement coiffe des rotateurs (rotation externe)', 'débutant'),
  ('Saut au corde (sauts rapides)', 'débutant'),
  ('Saut sur place (vertical jump)', 'débutant'),
  ('Saut à la boîte lesté (weighted box jump)', 'intermédiaire'),
  ('Tuck crunch (genoux ramenés)', 'débutant'),
  ('__test_plyometric_box_jump__', 'intermédiaire')
) AS updates(ex_name, lvl)
WHERE exercises.name = updates.ex_name
  AND exercises.created_by IS NULL
  AND exercises.level IS NULL;

-- ============================================================
-- PART 3 — UPDATE category → 'réathlétisation' pour les exercices
-- de réathlétisation qui pourraient être stockés en 'mobility'
-- ou 'compound' (fix des insertions précédentes)
-- ============================================================
UPDATE exercises
SET category = 'réathlétisation'
WHERE created_by IS NULL
  AND name IN (
    'Pont fessier (glute bridge)',
    'Clamshell (coquille)',
    'Monster walk (marche avec élastique)',
    'Terminal knee extension (TKE)',
    'Rotation externe coiffe des rotateurs',
    'Y-T-W-L (exercice épaule)',
    'Single leg deadlift (corps libre)',
    'Équilibre sur une jambe',
    'Step-down excentrique',
    'Reverse Nordic curl',
    'Nordic curl (ischio-jambiers)',
    'Dorsal (superman)',
    'Bird dog',
    'Lateral band walk (marche latérale)',
    'Pistol squat assisté',
    'Hip hinge assisté'
  );
