-- seed-exercises.sql
-- Seed 100+ exercices pré-remplis en français (idempotent par nom + created_by IS NULL)
-- Chaque exercice ne sera inséré que s'il n'existe pas encore en tant qu'exercice global.

WITH exercises_to_insert (name, category, muscle_groups, equipment, description) AS (
  VALUES

    -- ================================================================
    -- FORCE / COMPOUND (15 nouveaux — 9 déjà présents)
    -- ================================================================
    (
      'Squat barre',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'Exercice fondamental du bas du corps. Barre posée sur les trapèzes, pieds à largeur des épaules, descendre jusqu''à ce que les cuisses soient parallèles au sol en gardant le dos droit et les genoux dans l''axe des orteils. Pousser à travers les talons pour remonter.'
    ),
    (
      'Squat gobelet',
      'compound',
      '["Quadriceps","Fessiers","Core"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Tenir un kettlebell ou haltère contre la poitrine, coudes vers le bas. Descendre en squat profond en gardant le torse droit. Excellent pour travailler la mobilité de cheville et de hanche simultanément.'
    ),
    (
      'Fentes avant',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, avancer un pied et descendre le genou arrière vers le sol sans le toucher. Le genou avant ne dépasse pas la pointe du pied. Repousser pour revenir à la position initiale et alterner les jambes.'
    ),
    (
      'Fentes marchées',
      'compound',
      '["Quadriceps","Fessiers","Ischio-jambiers","Stabilisateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Avancer en effectuant des fentes continues sur une distance donnée. Le genou arrière descend près du sol à chaque foulée. Maintenir le torse droit et le regard vers l''avant pendant tout le déplacement.'
    ),
    (
      'Fentes latérales',
      'compound',
      '["Quadriceps","Adducteurs","Fessiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, ouvrir une jambe sur le côté et fléchir le genou jusqu''à ce que la cuisse soit parallèle au sol. L''autre jambe reste tendue. Revenir au centre et alterner. Travaille l''abduction et la force médiale du genou.'
    ),
    (
      'Deadlift',
      'compound',
      '["Ischio-jambiers","Fessiers","Dos","Trapèzes","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'La barre est posée au sol, pieds sous la hanche. Saisir la barre en prise pronation ou mixte. Gainage du tronc, dos plat, puis pousser le sol pour monter en gardant la barre proche du corps. Hanches et épaules montent simultanément.'
    ),
    (
      'Hip thrust barre',
      'compound',
      '["Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Barre"]'::jsonb,
      'Dos appuyé sur un banc, barre sur les hanches. Les pieds sont à plat sur le sol, largeur des épaules. Descendre les hanches puis pousser vers le haut en contractant fort les fessiers. Finir en position de pont avec le corps aligné.'
    ),
    (
      'Développé couché barre',
      'compound',
      '["Pectoraux","Triceps","Épaules antérieures"]'::jsonb,
      '["Barre"]'::jsonb,
      'Allongé sur le banc, barre saisie légèrement plus large que les épaules. Descendre la barre jusqu''au sternum en contrôlant, toucher légèrement puis repousser en extension complète. Garder les coudes à environ 45° du corps.'
    ),
    (
      'Développé incliné haltères',
      'compound',
      '["Pectoraux supérieurs","Triceps","Épaules antérieures"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Banc incliné à 30-45°. Haltères tenus en pronation au niveau de la poitrine. Pousser les haltères vers le haut en les rapprochant légèrement, sans verrouiller les coudes. Contrôler la descente. Cible particulièrement le haut des pectoraux.'
    ),
    (
      'Développé militaire barre',
      'compound',
      '["Épaules","Triceps","Trapèzes supérieurs"]'::jsonb,
      '["Barre"]'::jsonb,
      'Debout ou assis, barre saisie à largeur d''épaules au niveau du menton. Pousser la barre au-dessus de la tête jusqu''à extension complète en gagnant du dos. Redescendre lentement. Maintenir le gainage abdominal tout au long du mouvement.'
    ),
    (
      'Développé militaire haltères',
      'compound',
      '["Épaules","Triceps","Stabilisateurs"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout ou assis, haltères à hauteur des épaules, coudes à 90°. Pousser vers le haut jusqu''à extension, sans verrouiller. Plus de stabilisation requise que la version barre, ce qui sollicite davantage les muscles stabilisateurs des épaules.'
    ),
    (
      'Tractions (pull-up)',
      'compound',
      '["Grand dorsal","Biceps","Rhomboïdes","Core"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Prise pronation légèrement plus large que les épaules. À partir de la position suspendue, tirer le corps vers le haut jusqu''à ce que le menton dépasse la barre. Descendre lentement à bras tendus. Éviter le balancement.'
    ),
    (
      'Rowing barre',
      'compound',
      '["Grand dorsal","Rhomboïdes","Biceps","Trapèzes"]'::jsonb,
      '["Barre"]'::jsonb,
      'Pieds à largeur des épaules, genou légèrement fléchis, buste penché à environ 45°. Saisir la barre en prise pronation. Tirer la barre vers le nombril en serrant les omoplates. Redescendre sous contrôle.'
    ),
    (
      'Rowing haltère unilatéral',
      'compound',
      '["Grand dorsal","Biceps","Rhomboïdes"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Un genou et une main posés sur un banc, l''autre pied au sol. Tenir l''haltère dans la main libre et tirer vers la hanche en gardant le coude proche du corps. Descendre en extension complète. Excellent pour corriger les asymétries de force.'
    ),
    (
      'Chin-up (prise supination)',
      'compound',
      '["Biceps","Grand dorsal","Rhomboïdes"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Prise supination (paumes vers soi), mains à largeur des épaules. Tirer le corps vers le haut jusqu''au menton au-dessus de la barre. La prise supination sollicite davantage les biceps comparé au pull-up classique.'
    ),

    -- ================================================================
    -- PUISSANCE / POWER (8 nouveaux)
    -- ================================================================
    (
      'Clean de puissance',
      'power',
      '["Corps entier","Quadriceps","Fessiers","Trapèzes","Épaules"]'::jsonb,
      '["Barre"]'::jsonb,
      'Mouvement d''haltérophilie développant la puissance explosive. La barre est tirée du sol avec accélération maximale, puis rattrapée en position de demi-squat. Requiert une technique soignée — commencer léger et progresser sous supervision.'
    ),
    (
      'Push press',
      'power',
      '["Épaules","Triceps","Fessiers","Quadriceps"]'::jsonb,
      '["Barre"]'::jsonb,
      'Barre en position frontale à hauteur des épaules. Légère flexion des genoux (dip), puis extension explosive des jambes et des bras pour propulser la barre au-dessus de la tête. Combine puissance du bas du corps et force des épaules.'
    ),
    (
      'Arraché de puissance (snatch)',
      'power',
      '["Corps entier","Quadriceps","Fessiers","Dos","Épaules"]'::jsonb,
      '["Barre"]'::jsonb,
      'Mouvement explosif amenant la barre du sol au-dessus de la tête en un seul geste. Nécessite une grande coordination et mobilité. Commence avec des exercices préparatoires comme le snatch grip deadlift avant de maîtriser le mouvement complet.'
    ),
    (
      'Kettlebell swing',
      'power',
      '["Ischio-jambiers","Fessiers","Core","Épaules"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Pieds plus larges que les épaules. Pencher le buste, saisir le kettlebell à deux mains. Balancer entre les jambes puis propulser avec une extension explosive des hanches. Bras restent passifs, c''est la poussée des hanches qui génère le mouvement.'
    ),
    (
      'Saut à la boîte lesté (weighted box jump)',
      'power',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Box","Haltères"]'::jsonb,
      'Debout devant la box, haltères légers dans chaque main. Fléchir les genoux puis sauter explosif sur la boîte. Descendre sous contrôle ou sauter en arrière. Ajouter le lest uniquement lorsque la technique sans poids est maîtrisée.'
    ),
    (
      'Médecine ball slam',
      'power',
      '["Core","Épaules","Dos","Quadriceps"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Tenir le médecine ball à deux mains. Élever le ballon au-dessus de la tête en extension, puis le lancer au sol avec force maximale en fléchissant les hanches et en engageant le core. Rattraper le rebond ou le relever depuis le sol.'
    ),
    (
      'Battle ropes',
      'power',
      '["Épaules","Biceps","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Tenir une corde épaisse dans chaque main. Créer des vagues alternées ou simultanées avec les bras. Maintenir les genoux légèrement fléchis et le tronc stable. Excellent pour le développement de la puissance-endurance et la cardio.'
    ),
    (
      'Kettlebell snatch',
      'power',
      '["Épaules","Core","Ischio-jambiers","Fessiers"]'::jsonb,
      '["Kettlebell"]'::jsonb,
      'Partir d''un balancement bas entre les jambes et amener le kettlebell au-dessus de la tête en un seul mouvement fluide. Le poignet pivote au passage de la hanche. Exercice technique à apprendre progressivement — commencer par le swing et le high pull.'
    ),

    -- ================================================================
    -- PLIOMÉTRIE (8 nouveaux — 2 déjà présents: Box jump, __test__)
    -- ================================================================
    (
      'Depth jump',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Box"]'::jsonb,
      'Tomber d''une box, atterrir et repartir immédiatement en saut vertical avec un temps de contact minimal. Travaille la raideur musculo-tendineuse et le réflexe myotatique. Réservé aux athlètes ayant une bonne base de force.'
    ),
    (
      'Broad jump (saut en longueur)',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, fléchir les genoux, balancer les bras en arrière puis sauter en avant le plus loin possible. Atterrir sur les deux pieds, amorti, genoux fléchis. Mesurer la distance pour le suivi de progression.'
    ),
    (
      'Saut latéral (skater jump)',
      'plyometric',
      '["Fessiers","Quadriceps","Stabilisateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Sauter d''un pied sur l''autre latéralement en imitant le mouvement d''un patineur. Atterrir sur un pied, amortir la réception avec le genou fléchi. Augmenter progressivement la distance et la vitesse. Développe la stabilité latérale et la puissance.'
    ),
    (
      'Drop jump',
      'plyometric',
      '["Mollets","Quadriceps","Tendon d''Achille"]'::jsonb,
      '["Box"]'::jsonb,
      'Se laisser tomber d''une box basse, atterrir sur la pointe des pieds et rebondir immédiatement le plus haut possible. Différent du depth jump : la réception se fait sur les avant-pieds uniquement. Cible spécifiquement la raideur du complexe mollet-tendon.'
    ),
    (
      'Saut au corde (sauts rapides)',
      'plyometric',
      '["Mollets","Quadriceps","Coordination"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Sauter à la corde avec un minimum de hauteur et un maximum de vitesse de rotation. Maintenir les coudes près du corps et faire tourner la corde avec les poignets. Idéal pour développer la coordination, la cadence de pas et l''endurance des mollets.'
    ),
    (
      'Skipping (montées de genoux hautes)',
      'plyometric',
      '["Quadriceps","Fessiers","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Courir sur place en montant les genoux jusqu''à hauteur de la hanche à chaque pas. Maintenir un tempo élevé, les bras oscillent en opposition. Travaille la cadence, la coordination et la puissance de flexion de hanche.'
    ),
    (
      'Jumping jacks (sauts écartés)',
      'plyometric',
      '["Épaules","Fessiers","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Position de départ pieds joints, bras le long du corps. Sauter en écartant les jambes à largeur des épaules tout en levant les bras au-dessus de la tête, puis revenir à la position initiale. Exercice d''activation cardiovasculaire et de coordination.'
    ),
    (
      'Saut sur place (vertical jump)',
      'plyometric',
      '["Quadriceps","Fessiers","Mollets","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position debout, fléchir les genoux et les hanches tout en balançant les bras en arrière, puis sauter le plus haut possible en étendant tout le corps. Atterrir amorti sur les deux pieds genoux fléchis. Mesurer la hauteur pour le suivi.'
    ),

    -- ================================================================
    -- CARDIO / CONDITIONING (13 nouveaux — 2 déjà présents)
    -- ================================================================
    (
      'Course sur tapis roulant',
      'cardio',
      '["Quadriceps","Ischio-jambiers","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Course à pied sur tapis motorisé. Ajuster la vitesse et l''inclinaison selon l''objectif : aérobie modéré (60-70% FCmax), seuil (80-85%), ou intervalles. Maintenir une foulée naturelle, bras actifs, regard droit devant.'
    ),
    (
      'Vélo stationnaire',
      'cardio',
      '["Quadriceps","Ischio-jambiers","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Cardio à faible impact articulaire. Régler la selle à hauteur de la hanche. Pédaler avec une cadence régulière. Peut se pratiquer en endurance continue ou en intervalles. Idéal en période de récupération active ou en réathlétisation.'
    ),
    (
      'Rameur ergomètre',
      'cardio',
      '["Corps entier","Dos","Jambes","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Exercice cardio corps entier. La séquence : jambes d''abord (60% de la puissance), puis buste se penche en arrière, puis bras tirent. Au retour : bras, buste, genoux. Maintenir un ratio 1:2 effort/récupération pour les intervalles.'
    ),
    (
      'Assault bike',
      'cardio',
      '["Corps entier","Épaules","Quadriceps","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Vélo à résistance à air utilisé pour le cardio haute intensité. Plus on pousse fort, plus la résistance augmente. Alterner sprints courts (15-20 sec) et récupérations. Sollicite simultanément les membres supérieurs et inférieurs.'
    ),
    (
      'Elliptique',
      'cardio',
      '["Quadriceps","Fessiers","Épaules","Cardiovasculaire"]'::jsonb,
      '["Machine"]'::jsonb,
      'Cardio à très faible impact articulaire. Mouvement elliptique simulant la marche nordique. Maintenir la résistance adaptée pour garder une cadence de 65-80 RPM. Excellent pour maintenir le cardio en période de blessure.'
    ),
    (
      'Sled push (traîneau)',
      'cardio',
      '["Quadriceps","Fessiers","Épaules","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Pousser un traineau lesté sur une surface de friction (gazon synthétique ou sol). Rester penché en avant, bras tendus sur les poignées. Cadence de pas rapide et courte. Intervalle classique : 20-30m de poussée, 2 min de repos.'
    ),
    (
      'Sled pull (traction traîneau)',
      'cardio',
      '["Ischio-jambiers","Fessiers","Dos","Core"]'::jsonb,
      '["Aucun"]'::jsonb,
      'Tirer un traineau lesté vers soi à l''aide de cordes ou d''un baudrier. Peut se faire en marchant en arrière, en tirant les cordes bras fléchis ou en course avant avec harnais. Excellent pour la réathlétisation des genoux.'
    ),
    (
      'Farmer''s carry (marche fermière)',
      'cardio',
      '["Avant-bras","Trapèzes","Core","Stabilisateurs"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Tenir des haltères lourds (ou kettlebells) dans chaque main, bras le long du corps. Marcher sur une distance donnée en maintenant le torse droit et les omoplates serrées. Développe la force de préhension, la stabilité du tronc et l''endurance.'
    ),
    (
      'Wall ball',
      'cardio',
      '["Quadriceps","Épaules","Core"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Tenir le médecine ball à hauteur du menton. Descendre en squat, puis lors de la remontée lancer le ballon contre un mur à une hauteur cible (environ 3m). Attraper le rebond, absorber et enchaîner directement avec le squat suivant.'
    ),
    (
      'Montées de genoux sur place',
      'cardio',
      '["Quadriceps","Core","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Courir sur place à haute intensité en montant les genoux au niveau des hanches à chaque pas. Bras actifs en opposition. Maintenir un rythme élevé. Idéal en circuit training ou comme exercice de transition cardio sans matériel.'
    ),
    (
      'Burpee avec saut',
      'cardio',
      '["Corps entier","Pectoraux","Core","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis debout : fléchir pour poser les mains au sol, sauter les pieds en arrière en position de pompe, effectuer une pompe, sauter les pieds vers les mains, puis sauter verticalement avec les bras levés. Enchaîner sans pause.'
    ),
    (
      'Sprint sur place',
      'cardio',
      '["Quadriceps","Fessiers","Cardiovasculaire"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Sprinter sur place à intensité maximale pendant 10-20 secondes. Monter les genoux haut, bras actifs. Alterner avec des périodes de repos ou de marche. Méthode Tabata classique : 8 rounds de 20 sec effort / 10 sec repos.'
    ),
    (
      'Jumping lunge (fente sautée)',
      'cardio',
      '["Quadriceps","Fessiers","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Depuis la position de fente basse, sauter et changer de jambe en l''air pour atterrir en fente sur l''autre jambe. Alterner rapidement. Maintenir le torse droit. Combine cardio et travail pliométrique des membres inférieurs.'
    ),

    -- ================================================================
    -- MOBILITÉ (12 nouveaux — 3 déjà présents)
    -- ================================================================
    (
      'Mobilisation thoracique au foam roller',
      'mobility',
      '["Colonne thoracique","Dos"]'::jsonb,
      '["Foam roller"]'::jsonb,
      'Placer le foam roller perpendiculairement à la colonne, sous les omoplates. Bras croisés sur la poitrine, laisser la tête descendre en arrière. Rouler doucement de T4 à T12. S''arrêter sur les zones tendues 30-60 secondes. Améliore la posture et la mobilité en rotation.'
    ),
    (
      'Hip flexor stretch (étirement fléchisseur hanche)',
      'mobility',
      '["Fléchisseurs de hanche","Quadriceps"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de fente basse, genou arrière au sol. Avancer légèrement pour étirer le fléchisseur de hanche de la jambe arrière. Contracter le fessier arrière pour augmenter l''étirement. Tenir 30-60 secondes par côté. Contrebalance les longues heures assises.'
    ),
    (
      'Étirement piriforme (figure 4)',
      'mobility',
      '["Piriforme","Fessiers","Rotateurs externes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, croiser une cheville sur le genou opposé. Saisir la cuisse du bas et tirer vers la poitrine jusqu''à sentir l''étirement dans la fesse croisée. Tenir 30-60 secondes par côté. Soulage les douleurs du nerf sciatique liées à la tension du piriforme.'
    ),
    (
      'Mobilisation hanche 90/90',
      'mobility',
      '["Hanche","Rotateurs internes","Rotateurs externes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Assis au sol, placer les deux jambes à 90° (jambe avant en rotation externe, jambe arrière en rotation interne). Se pencher sur la jambe avant, puis passer en rotation vers la jambe arrière. Alterne entre les deux positions. Développe la polyvalence de la hanche.'
    ),
    (
      'Cat-cow (chat-vache)',
      'mobility',
      '["Colonne vertébrale","Core","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes, mains sous les épaules, genoux sous les hanches. Inspiration : creuser le dos, lever la tête et le coccyx (vache). Expiration : arrondir le dos vers le plafond, rentrer le menton et le bassin (chat). Mouvement continu et contrôlé.'
    ),
    (
      'Thread the needle (rotation thoracique)',
      'mobility',
      '["Colonne thoracique","Épaule","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes. Glisser un bras sous le corps en rotation jusqu''à poser l''épaule et le côté de la tête au sol. Tenir 3-5 secondes puis revenir. Option : lever le bras libre vers le plafond. Excellent pour la mobilité thoracique en rotation.'
    ),
    (
      'Spiderman stretch',
      'mobility',
      '["Fléchisseurs hanche","Adducteurs","Colonne thoracique"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En position de pompe, avancer un pied vers la main du même côté. Poser le pied à l''extérieur de la main. Option : rotation du bras vers le plafond. Alterner les côtés. Combine étirement des fléchisseurs de hanche, des adducteurs et mobilité thoracique.'
    ),
    (
      'World''s greatest stretch',
      'mobility',
      '["Fléchisseurs hanche","Adducteurs","Colonne thoracique","Ischio-jambiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En fente avant : poser la main arrière au sol, faire une rotation du bras avant vers le plafond, puis redresser la jambe avant (toucher le sol avec les deux mains). Enchaîner les 3 mouvements sur 5 reps par côté. Considéré comme l''étirement le plus complet qui soit.'
    ),
    (
      'Band pull-apart (élastique)',
      'mobility',
      '["Rotateurs externes épaule","Rhomboïdes","Trapèzes"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Tenir un élastique avec les deux mains devant soi, bras tendus à hauteur des épaules. Écarter les bras en tirant l''élastique jusqu''à toucher la poitrine (ou légèrement derrière). Contrôler le retour. Active la coiffe des rotateurs et renforce les muscles posturaux.'
    ),
    (
      'Flexion de cheville au mur',
      'mobility',
      '["Cheville","Mollets"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout face au mur, un pied à environ 10-15cm du mur. Fléchir le genou pour toucher le mur sans décoller le talon. Avancer progressivement le pied. Teste et améliore la dorsiflexion de la cheville, essentielle pour le squat profond.'
    ),
    (
      'Dislocations épaules (bâton)',
      'mobility',
      '["Épaule","Rotateurs","Coiffe des rotateurs"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Tenir un bâton ou une corde devant soi, mains très écartées. Passer le bâton par-dessus la tête jusqu''à l''amener derrière le dos en gardant les bras tendus. Réduire progressivement l''écartement des mains au fil des séances. Améliore la mobilité globale de l''épaule.'
    ),
    (
      'Ouverture hanche en cercles (hip CARs)',
      'mobility',
      '["Hanche","Stabilisateurs","Fessiers"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe, lever le genou opposé et faire des cercles complets avec la hanche : de la flexion vers l''abduction, l''extension, et la rotation interne. Lentement, avec amplitude maximale et contrôle. 5 répétitions par direction et par côté.'
    ),

    -- ================================================================
    -- CORE / GAINAGE (20 nouveaux)
    -- ================================================================
    (
      'Gainage frontal (planche)',
      'core',
      '["Core","Épaules","Fessiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de gainage sur les avant-bras, corps en ligne droite de la tête aux talons. Contracter les fessiers, serrer le core, regarder le sol. Éviter de laisser les hanches s''affaisser ou de les monter en l''air. Variantes : sur les mains, avec élévation de membres.'
    ),
    (
      'Gainage dynamique (planche avec rotation)',
      'core',
      '["Core","Épaules","Obliques"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Depuis la position de planche sur les mains, pivots latéraux en alternance : rotation du corps pour lever un bras vers le plafond (side plank), puis revenir au centre et recommencer de l''autre côté. Contrôler la rotation et stabiliser le bassin.'
    ),
    (
      'Crunch inversé',
      'core',
      '["Abdominaux inférieurs","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, jambes en l''air. Contracter les abdominaux pour soulever le bassin du sol, ramener les genoux vers la poitrine. Redescendre lentement sans laisser les jambes tomber. Cible particulièrement la partie inférieure des abdominaux.'
    ),
    (
      'Russian twist',
      'core',
      '["Obliques","Core","Abdominaux"]'::jsonb,
      '["Médecine ball"]'::jsonb,
      'Assis au sol, genoux fléchis, buste incliné à environ 45°. Tenir un poids ou médecine ball contre la poitrine. Rotation du buste de droite à gauche en contrôlant le mouvement. Pour progresser : jambes levées ou élargir la rotation.'
    ),
    (
      'Relevé de jambes suspendu',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Barre de traction"]'::jsonb,
      'Suspendu à une barre de traction, bras tendus. Lever les jambes tendues jusqu''à l''horizontale (ou plus) en contractant les abdominaux. Redescendre sans se balancer. Variante accessible : genoux fléchis. Exercice exigeant de force et de gainage.'
    ),
    (
      'Ab wheel rollout',
      'core',
      '["Core","Grand dorsal","Épaules"]'::jsonb,
      '["Aucun"]'::jsonb,
      'À genoux, tenir la roue abdominale avec les deux mains. Faire rouler la roue vers l''avant en étendant le corps, dos plat, jusqu''à la limite de contrôle. Revenir en fléchissant les hanches. Développe la résistance à l''extension du tronc.'
    ),
    (
      'Dragon flag',
      'core',
      '["Core","Abdominaux","Dos"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur un banc, saisir le banc derrière la tête. Soulever les hanches et le corps jusqu''à la verticalité, puis descendre en corps rigide en résistant à la gravité. Exercice avancé — commencer par des variantes genoux fléchis.'
    ),
    (
      'Pallof press',
      'core',
      '["Core","Obliques","Stabilisateurs"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Debout de côté par rapport à un câble, saisir la poignée à hauteur du sternum. Pousser vers l''avant jusqu''à extension des bras sans laisser la rotation s''installer, puis ramener. Le core résiste à la rotation. Excellent pour la stabilité anti-rotation.'
    ),
    (
      'Dead bug',
      'core',
      '["Core","Abdominaux","Stabilisateurs lombaires"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, bras tendus au plafond, genoux à 90° en l''air. Abaisser simultanément le bras droit et la jambe gauche sans décoller le dos du sol. Revenir au centre et alterner. Contrôler la respiration. Développe le gainage profond sans contrainte spinale.'
    ),
    (
      'Hollow body hold',
      'core',
      '["Core","Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, bras tendus derrière la tête, jambes tendues légèrement décollées du sol. Presser le bas du dos contre le sol. Maintenir la position en respirant normalement. Exercice fondamental de la gymnastique pour développer la tension du tronc.'
    ),
    (
      'Bicycle crunch',
      'core',
      '["Obliques","Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, mains derrière la tête, jambes levées. Alterner : ramener un genou vers la poitrine tout en tournant le buste pour amener le coude opposé vers ce genou. Mouvement de pédalage. Contrôler la rotation et éviter de tirer sur la nuque.'
    ),
    (
      'V-up',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé à plat, bras tendus derrière la tête, jambes jointes. Soulever simultanément les bras et les jambes pour former un V, toucher les orteils ou le milieu des tibias, puis redescendre lentement. Exercice exigeant qui sollicite tout le droit abdominal.'
    ),
    (
      'RKC plank (planche avec contraction maximale)',
      'core',
      '["Core","Fessiers","Quadriceps","Épaules"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Position de gainage sur les avant-bras. Contracter simultanément les fessiers, serrer les cuisses, écraser les poings au sol. Cette contraction maximale de tout le corps augmente considérablement la difficulté. 10 secondes de maintien intense = 1 minute de planche classique.'
    ),
    (
      'Gainage avec marche de bras',
      'core',
      '["Core","Épaules","Triceps"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Depuis la position de planche sur les avant-bras, se lever sur une main puis sur l''autre pour arriver en planche haute, puis redescendre sur les avant-bras. Alterner le bras qui mène. Maintenir les hanches stables sans rotation. Combine gainage et force des épaules.'
    ),
    (
      'Rotation du tronc avec câble',
      'core',
      '["Obliques","Core"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Debout de côté face à un câble. Saisir la poignée à deux mains, bras tendus. Rotation du buste en tirant le câble de façon contrôlée. Résister au retour. Peut se faire en woodchop (haut-bas) ou en reverse woodchop (bas-haut). Développe les obliques fonctionnellement.'
    ),
    (
      'Side bend haltère',
      'core',
      '["Obliques","Carré des lombes"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout, haltère dans une main, bras le long du corps. Inclinaison latérale vers le côté portant l''haltère, puis contraction des obliques opposés pour revenir. Aller que d''un côté à la fois (unilatéral) pour maximiser le recrutement. Éviter de se pencher en avant ou en arrière.'
    ),
    (
      'Sit-up complet',
      'core',
      '["Abdominaux","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, genoux fléchis, pieds au sol. Mains croisées sur la poitrine ou derrière la tête. Monter le buste jusqu''à la position assise puis redescendre de façon contrôlée. Amplitude complète comparée au crunch partiel.'
    ),
    (
      'Copenhagen plank (adducteurs)',
      'core',
      '["Adducteurs","Core","Obliques"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le côté, pied supérieur posé sur un banc ou une box. Soulever les hanches pour former une ligne droite. La jambe inférieure peut rester au sol (version facile) ou être soulevée. Isométrie latérale qui cible spécifiquement les adducteurs de la hanche.'
    ),
    (
      'Tuck crunch (genoux ramenés)',
      'core',
      '["Abdominaux","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, jambes soulevées à 90°. Ramener simultanément les genoux vers la poitrine et soulever les épaules du sol. Contracter fort les abdominaux au point de compression. Revenir sans laisser les pieds toucher le sol entre les répétitions.'
    ),
    (
      'Plank leg raise',
      'core',
      '["Core","Fessiers","Stabilisateurs"]'::jsonb,
      '["Tapis"]'::jsonb,
      'En position de gainage sur les mains. Lever une jambe tendue à environ 30cm du sol, maintenir 2 secondes, reposer. Alterner. Le bassin ne doit pas tourner ni s''affaisser. Ajoute une composante de déstabilisation et de recrutement fessier au gainage classique.'
    ),

    -- ================================================================
    -- RÉATHLÉTISATION / RENFORCEMENT FONCTIONNEL (15 nouveaux)
    -- ================================================================
    (
      'Pont fessier (glute bridge)',
      'mobility',
      '["Fessiers","Ischio-jambiers","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé sur le dos, genoux fléchis à 90°, pieds à plat. Pousser les pieds dans le sol pour soulever les hanches jusqu''à alignement genoux-hanches-épaules. Contracter les fessiers au sommet. Utile pour activer les fessiers et comme exercice de réathlétisation du genou.'
    ),
    (
      'Clamshell (coquille)',
      'mobility',
      '["Fessiers moyens","Rotateurs externes hanche"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Allongé sur le côté, genoux fléchis à environ 45°, hanches empilées. Lever le genou supérieur comme une coquille qui s''ouvre, sans rouler le bassin en arrière. Elastique optional au-dessus des genoux pour progresser. Exercice clé en réathlétisation du genou et de la hanche.'
    ),
    (
      'Monster walk (marche avec élastique)',
      'mobility',
      '["Fessiers","Abducteurs","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Élastique au-dessus des genoux ou aux chevilles. Légère flexion des genoux. Avancer en maintenant l''élastique tendu à chaque pas, sans laisser les genoux se rapprocher. Variantes : marche avant, arrière, latérale. Outil fondamental de préhabilitation et réathlétisation.'
    ),
    (
      'Terminal knee extension (TKE)',
      'mobility',
      '["Quadriceps","VMO","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Élastique attaché derrière le genou (en loop autour d''un poteau). Debout, genou légèrement fléchi. Étendre le genou contre la résistance pour verrouiller en extension complète. Maintenir 2 secondes. Cible le VMO (vaste médial oblique) et améliore le contrôle de l''extension du genou.'
    ),
    (
      'Renforcement coiffe des rotateurs (rotation externe)',
      'mobility',
      '["Rotateurs externes épaule","Coiffe des rotateurs"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Coude fléchi à 90°, coude collé au flanc. Rotation externe de l''avant-bras contre un élastique ou un câble. Contrôler le retour. Peut se faire couché sur le côté avec haltère léger. Exercice prophylactique essentiel pour la santé de l''épaule.'
    ),
    (
      'Y-T-W-L (exercice épaule)',
      'mobility',
      '["Trapèzes moyens et inférieurs","Rhomboïdes","Coiffe des rotateurs"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé ventre au sol ou sur un banc incliné, bras tendus. Former successivement les lettres Y (bras à 45° au-dessus de la tête), T (bras à 90°), W (coudes à 90° en hauteur), L (coudes à 90° le long du corps). Haltères légers ou poids du corps.'
    ),
    (
      'Single leg deadlift (corps libre)',
      'mobility',
      '["Ischio-jambiers","Fessiers","Stabilisateurs cheville"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe. Pencher le buste vers l''avant tout en élevant la jambe libre derrière soi, jusqu''à ce que le corps forme une ligne horizontale. Revenir. Commencer sans poids, progresser avec haltère. Développe l''équilibre, les ischio-jambiers et la stabilité de la cheville.'
    ),
    (
      'Équilibre sur une jambe',
      'mobility',
      '["Stabilisateurs cheville","Proprioception","Core"]'::jsonb,
      '["Poids du corps"]'::jsonb,
      'Debout sur une jambe, autre genou levé. Maintenir l''équilibre 30-60 secondes. Progressions : yeux fermés, surface instable, lancers de balle. Base de la réathlétisation proprioceptive après entorse de cheville ou chirurgie du genou.'
    ),
    (
      'Step-down excentrique',
      'mobility',
      '["Quadriceps","VMO","Stabilisateurs genou"]'::jsonb,
      '["Box"]'::jsonb,
      'Debout sur une box ou une marche. Descendre lentement (3-4 secondes) le pied libre vers le sol sans le poser, en contrôlant avec la jambe d''appui. Remonter. L''accent excentrique développe la force et la stabilité du quadriceps, essentiel après une blessure au genou.'
    ),
    (
      'Reverse Nordic curl',
      'mobility',
      '["Quadriceps","Fléchisseurs de hanche"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À genoux sur un tapis, pieds bloqués sous un support (partenaire ou barre). Corps droit. Se pencher en arrière le plus lentement possible en gardant le corps rigide. Revenir avec les mains au sol. Travaille les quadriceps excentriquement — utile en prévention des blessures au genou.'
    ),
    (
      'Nordic curl (ischio-jambiers)',
      'mobility',
      '["Ischio-jambiers","Core"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À genoux, chevilles bloquées par un partenaire ou un support. Corps droit, mains devant soi. Descendre lentement le buste vers le sol en résistant avec les ischio-jambiers. Se rattraper avec les mains. Revenir. Un des exercices les plus efficaces en prévention des déchirures des ischio-jambiers.'
    ),
    (
      'Dorsal (superman)',
      'mobility',
      '["Lombaires","Fessiers","Trapèzes"]'::jsonb,
      '["Tapis"]'::jsonb,
      'Allongé ventre au sol, bras tendus devant soi. Soulever simultanément les bras et les jambes en contractant les lombaires et les fessiers. Maintenir 2-3 secondes au sommet. Renforce les érecteurs du rachis et les fessiers, utile en réathlétisation lombaire.'
    ),
    (
      'Bird dog',
      'core',
      '["Lombaires","Core","Fessiers"]'::jsonb,
      '["Tapis"]'::jsonb,
      'À quatre pattes, mains sous les épaules, genoux sous les hanches. Étendre simultanément le bras droit et la jambe gauche jusqu''à l''horizontale. Maintenir 3 secondes, revenir. Alterner. Développe la stabilité lombaire et la coordination croisée corps entier.'
    ),
    (
      'Lateral band walk (marche latérale)',
      'mobility',
      '["Fessiers moyens","Abducteurs","Stabilisateurs genou"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Élastique au-dessus des genoux (mini-bande). Légère flexion des genoux. Pas latéraux en maintenant la tension de l''élastique. Les pieds ne se rejoignent pas complètement. Exercice de choix pour activer le moyen fessier et améliorer la stabilité en valgus du genou.'
    ),
    (
      'Pistol squat assisté',
      'compound',
      '["Quadriceps","Fessiers","Stabilisateurs","Cheville"]'::jsonb,
      '["Bandes élastiques"]'::jsonb,
      'Squat sur une jambe en tenant un élastique ou un support pour l''équilibre. Descendre le plus bas possible en gardant le pied de la jambe libre décollé du sol. La bande assiste le bas du mouvement. Exercice de réathlétisation avancé développant la force unijambiste.'
    ),

    -- ================================================================
    -- ISOLATION (6 nouveaux — 4 déjà présents)
    -- ================================================================
    (
      'Curl biceps barre',
      'isolation',
      '["Biceps"]'::jsonb,
      '["Barre"]'::jsonb,
      'Debout, barre saisie en prise supination (paumes vers le haut) à largeur des épaules. Fléchir les coudes pour monter la barre jusqu''aux épaules sans bouger les coudes ni le buste. Descendre lentement. Concentration maximale sur la flexion des biceps.'
    ),
    (
      'Curl biceps haltères',
      'isolation',
      '["Biceps"]'::jsonb,
      '["Haltères"]'::jsonb,
      'Debout, haltères en prise neutre (marteau) ou supination. Fléchir les coudes en alternant ou simultanément. Tourner les poignets vers le haut lors de la montée (supination) pour maximiser la contraction des biceps. Variante : curl incliné sur banc pour étirement accru.'
    ),
    (
      'Extension triceps poulie haute',
      'isolation',
      '["Triceps"]'::jsonb,
      '["Câbles"]'::jsonb,
      'Face à la poulie haute. Saisir la poignée (corde ou barre), coudes fléchis à hauteur du menton. Étendre les bras vers le bas jusqu''à extension complète. Les coudes restent fixes et collés au corps. Bien finir le mouvement en extension maximale.'
    ),
    (
      'Leg curl couché machine',
      'isolation',
      '["Ischio-jambiers"]'::jsonb,
      '["Machine"]'::jsonb,
      'Allongé sur la machine, mollets sur le rouleau. Fléchir les genoux pour ramener les talons vers les fessiers. Contrôler la descente excentrique. Utiliser des charges permettant un bon travail excentrique. Cible spécifiquement le biceps fémoral et les semi-tendineux.'
    ),
    (
      'Leg extension machine',
      'isolation',
      '["Quadriceps"]'::jsonb,
      '["Machine"]'::jsonb,
      'Assis sur la machine, dos droit, mollets sous le rouleau. Étendre les genoux jusqu''à extension complète, maintenir 1 seconde, redescendre lentement. Exercice d''isolation des quadriceps. À utiliser avec prudence en cas de problèmes patellaires.'
    ),
    (
      'Hip abduction machine',
      'isolation',
      '["Fessiers moyens","Abducteurs"]'::jsonb,
      '["Machine"]'::jsonb,
      'Assis sur la machine d''abduction, dos droit contre le dossier. Pousser les genoux ou les cuisses vers l''extérieur contre la résistance. Revenir lentement sous contrôle. Cible le moyen et petit fessier ainsi que les abducteurs. Complémentaire du travail debout avec élastique.'
    )

)
INSERT INTO exercises (name, category, muscle_groups, equipment, description)
SELECT ex.name, ex.category, ex.muscle_groups, ex.equipment, ex.description
FROM exercises_to_insert ex
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e
  WHERE e.name = ex.name AND e.created_by IS NULL
);
