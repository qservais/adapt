/**
 * seed-exercises.ts
 * Bibliothèque d'exercices pré-remplie — 106 exercices en français
 * Catégories : force, pliométrie, cardio, mobilité, core, réathlétisation
 * Idempotent : n'insère que les exercices absents (vérification par nom + created_by IS NULL)
 * Lance aussi un UPDATE level sur tous les exercices globaux sans niveau défini.
 */

import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { isNull, eq, and, sql } from "drizzle-orm";

interface SeedExercise {
  name: string;
  category: "force" | "pliométrie" | "cardio" | "mobilité" | "core" | "réathlétisation";
  muscleGroups: string[];
  equipment: string[];
  description: string;
  level: "débutant" | "intermédiaire" | "avancé";
}

const EXERCISES: SeedExercise[] = [

  // ================================================================
  // FORCE (28 exercices — minimum requis : 25)
  // ================================================================
  {
    name: "Squat barre",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Ischio-jambiers", "Core"],
    equipment: ["Barre"],
    description: "Barre posée sur les trapèzes, pieds à largeur des épaules. Descendre jusqu'à ce que les cuisses soient parallèles au sol en gardant le dos droit et les genoux dans l'axe des orteils. Pousser à travers les talons pour remonter.",
    level: "avancé",
  },
  {
    name: "Squat gobelet",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Core"],
    equipment: ["Kettlebell"],
    description: "Tenir un kettlebell contre la poitrine, coudes vers le bas. Descendre en squat profond en gardant le torse droit. Excellent pour travailler la mobilité de cheville et de hanche simultanément.",
    level: "débutant",
  },
  {
    name: "Fentes avant",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Ischio-jambiers"],
    equipment: ["Poids du corps"],
    description: "Depuis la position debout, avancer un pied et descendre le genou arrière vers le sol sans le toucher. Le genou avant ne dépasse pas la pointe du pied. Repousser pour revenir à la position initiale.",
    level: "débutant",
  },
  {
    name: "Fentes marchées",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Ischio-jambiers", "Stabilisateurs"],
    equipment: ["Poids du corps"],
    description: "Avancer en effectuant des fentes continues. Le genou arrière descend près du sol à chaque foulée. Maintenir le torse droit et le regard vers l'avant pendant tout le déplacement.",
    level: "intermédiaire",
  },
  {
    name: "Fentes latérales",
    category: "force",
    muscleGroups: ["Quadriceps", "Adducteurs", "Fessiers"],
    equipment: ["Poids du corps"],
    description: "Depuis la position debout, ouvrir une jambe sur le côté et fléchir le genou jusqu'à ce que la cuisse soit parallèle au sol. L'autre jambe reste tendue. Revenir au centre et alterner.",
    level: "intermédiaire",
  },
  {
    name: "Deadlift",
    category: "force",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Dos", "Trapèzes", "Core"],
    equipment: ["Barre"],
    description: "Barre posée au sol, pieds sous la hanche. Saisir en prise pronation ou mixte. Gainage du tronc, dos plat. Pousser le sol pour monter en gardant la barre proche du corps. Hanches et épaules montent simultanément.",
    level: "avancé",
  },
  {
    name: "Soulevé de terre roumain",
    category: "force",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Lombaires"],
    equipment: ["Barre"],
    description: "Jambes quasi tendues, descendre la barre le long des tibias en maintenant le dos droit et les hanches en arrière. Sentir l'étirement des ischio-jambiers, puis revenir en extension. Contrairement au deadlift classique, le mouvement est initié par les hanches.",
    level: "intermédiaire",
  },
  {
    name: "Hip thrust barre",
    category: "force",
    muscleGroups: ["Fessiers", "Ischio-jambiers", "Core"],
    equipment: ["Barre"],
    description: "Dos appuyé sur un banc, barre sur les hanches. Pieds à plat à largeur des épaules. Descendre les hanches puis pousser vers le haut en contractant fort les fessiers. Finir en pont avec le corps aligné.",
    level: "intermédiaire",
  },
  {
    name: "Développé couché barre",
    category: "force",
    muscleGroups: ["Pectoraux", "Triceps", "Épaules antérieures"],
    equipment: ["Barre"],
    description: "Allongé sur banc, barre saisie légèrement plus large que les épaules. Descendre jusqu'au sternum en contrôlant, puis repousser en extension complète. Garder les coudes à environ 45° du corps.",
    level: "intermédiaire",
  },
  {
    name: "Développé couché haltères",
    category: "force",
    muscleGroups: ["Pectoraux", "Triceps", "Épaules antérieures"],
    equipment: ["Haltères"],
    description: "Allongé sur banc, haltères au niveau de la poitrine. Pousser vers le haut et rapprocher légèrement les haltères au sommet sans les toucher. Plus grande amplitude qu'à la barre. Contrôler la descente.",
    level: "intermédiaire",
  },
  {
    name: "Développé incliné haltères",
    category: "force",
    muscleGroups: ["Pectoraux supérieurs", "Triceps", "Épaules antérieures"],
    equipment: ["Haltères"],
    description: "Banc incliné à 30-45°. Haltères en pronation à hauteur de la poitrine. Pousser vers le haut sans verrouiller les coudes, les rapprocher légèrement au sommet. Contrôler la descente. Cible le haut des pectoraux.",
    level: "intermédiaire",
  },
  {
    name: "Développé militaire barre",
    category: "force",
    muscleGroups: ["Épaules", "Triceps", "Trapèzes supérieurs"],
    equipment: ["Barre"],
    description: "Debout ou assis, barre au menton en prise à largeur des épaules. Pousser au-dessus de la tête jusqu'à extension. Redescendre lentement. Gainage abdominal maintenu tout au long du mouvement.",
    level: "intermédiaire",
  },
  {
    name: "Tractions (pull-up)",
    category: "force",
    muscleGroups: ["Grand dorsal", "Biceps", "Rhomboïdes", "Core"],
    equipment: ["Barre de traction"],
    description: "Prise pronation légèrement plus large que les épaules. Tirer le corps vers le haut jusqu'à ce que le menton dépasse la barre. Descendre lentement à bras tendus. Éviter le balancement.",
    level: "avancé",
  },
  {
    name: "Chin-up (prise supination)",
    category: "force",
    muscleGroups: ["Biceps", "Grand dorsal", "Rhomboïdes"],
    equipment: ["Barre de traction"],
    description: "Prise supination (paumes vers soi) à largeur des épaules. Tirer le corps jusqu'au menton au-dessus de la barre. La prise supination sollicite davantage les biceps comparé au pull-up classique.",
    level: "avancé",
  },
  {
    name: "Rowing barre",
    category: "force",
    muscleGroups: ["Grand dorsal", "Rhomboïdes", "Biceps", "Trapèzes"],
    equipment: ["Barre"],
    description: "Buste penché à 45°, barre saisie en pronation. Tirer la barre vers le nombril en serrant les omoplates. Redescendre sous contrôle. Genoux légèrement fléchis, dos plat.",
    level: "intermédiaire",
  },
  {
    name: "Rowing haltère unilatéral",
    category: "force",
    muscleGroups: ["Grand dorsal", "Biceps", "Rhomboïdes"],
    equipment: ["Haltères"],
    description: "Un genou et une main posés sur un banc, autre pied au sol. Tirer l'haltère vers la hanche en gardant le coude proche du corps. Descendre en extension complète. Corrige les asymétries de force.",
    level: "intermédiaire",
  },
  {
    name: "Tirage vertical poulie",
    category: "force",
    muscleGroups: ["Grand dorsal", "Biceps", "Rhomboïdes"],
    equipment: ["Câbles"],
    description: "Assis à la poulie haute, saisir la barre large en pronation. Tirer la barre vers la clavicule en ramenant les coudes vers les hanches. Poitrine vers l'avant, dos légèrement arqué. Contrôler le retour.",
    level: "débutant",
  },
  {
    name: "Tirage horizontal câble",
    category: "force",
    muscleGroups: ["Grand dorsal", "Rhomboïdes", "Biceps"],
    equipment: ["Câbles"],
    description: "Assis face au câble bas, saisir la poignée et tirer vers le nombril en serrant les omoplates. Dos droit, coudes le long du corps. Excellent pour la masse dorsale et la posture.",
    level: "débutant",
  },
  {
    name: "Presse à cuisses (leg press)",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Ischio-jambiers"],
    equipment: ["Machine"],
    description: "Assis sur la machine, pieds à largeur des épaules sur la plateforme. Fléchir les genoux jusqu'à 90° maximum puis repousser. Ne pas verrouiller les genoux en extension. Permet de charger lourd avec peu de risque lombaire.",
    level: "débutant",
  },
  {
    name: "Hack squat machine",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers"],
    equipment: ["Machine"],
    description: "Dos appuyé contre le dossier incliné de la machine, épaules sous les épaulières. Descendre en squat, puis repousser jusqu'à presque l'extension complète. La position fixe du dos permet de cibler davantage les quadriceps.",
    level: "intermédiaire",
  },
  {
    name: "Step-up",
    category: "force",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets"],
    equipment: ["Box"],
    description: "Monter sur une box ou un banc avec un pied, pousser pour étendre la jambe et monter le corps, puis descendre de façon contrôlée. Alterner les jambes. La hauteur de la box détermine l'angle de travail du fessier.",
    level: "débutant",
  },
  {
    name: "Pompes (push-up)",
    category: "force",
    muscleGroups: ["Pectoraux", "Triceps", "Épaules antérieures", "Core"],
    equipment: ["Poids du corps"],
    description: "Position de planche sur les mains, bras tendus. Descendre en fléchissant les coudes jusqu'à effleurer le sol, puis remonter. Corps rigide de la tête aux talons tout au long du mouvement. Variantes : large, serré, incliné, décliné.",
    level: "débutant",
  },
  {
    name: "Dips triceps",
    category: "force",
    muscleGroups: ["Triceps", "Pectoraux", "Épaules antérieures"],
    equipment: ["Poids du corps"],
    description: "Mains posées sur des barres parallèles ou un banc. Descendre en fléchissant les coudes jusqu'à ce que les bras soient à 90°. Remonter en extension. Pencher le buste vers l'avant cible les pectoraux ; rester vertical cible les triceps.",
    level: "intermédiaire",
  },
  {
    name: "Curl biceps barre",
    category: "force",
    muscleGroups: ["Biceps"],
    equipment: ["Barre"],
    description: "Debout, barre saisie en prise supination à largeur des épaules. Fléchir les coudes pour monter la barre jusqu'aux épaules sans bouger les coudes ni le buste. Descendre lentement.",
    level: "débutant",
  },
  {
    name: "Extension triceps poulie haute",
    category: "force",
    muscleGroups: ["Triceps"],
    equipment: ["Câbles"],
    description: "Face à la poulie haute. Saisir la poignée (corde ou barre), coudes fléchis à hauteur du menton. Étendre les bras vers le bas jusqu'à extension complète. Les coudes restent fixes et collés au corps.",
    level: "débutant",
  },
  {
    name: "Élévations latérales haltères",
    category: "force",
    muscleGroups: ["Épaules latérales", "Trapèzes"],
    equipment: ["Haltères"],
    description: "Debout, haltères le long du corps. Lever les bras sur les côtés jusqu'à hauteur des épaules, légère flexion des coudes. Contrôler la descente. Cible le faisceau latéral du deltoïde.",
    level: "débutant",
  },
  {
    name: "Clean de puissance",
    category: "force",
    muscleGroups: ["Corps entier", "Quadriceps", "Fessiers", "Trapèzes", "Épaules"],
    equipment: ["Barre"],
    description: "Mouvement d'haltérophilie développant la puissance explosive. La barre est tirée du sol avec accélération maximale, puis rattrapée en position de demi-squat. Requiert une technique soignée — commencer léger sous supervision.",
    level: "avancé",
  },
  {
    name: "Push press",
    category: "force",
    muscleGroups: ["Épaules", "Triceps", "Fessiers", "Quadriceps"],
    equipment: ["Barre"],
    description: "Barre en position frontale à hauteur des épaules. Légère flexion des genoux (dip), puis extension explosive des jambes et des bras. Combine puissance du bas du corps et force des épaules.",
    level: "intermédiaire",
  },

  // ================================================================
  // PLIOMÉTRIE (11 exercices — minimum requis : 10)
  // ================================================================
  {
    name: "Box jump",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets", "Core"],
    equipment: ["Box"],
    description: "Debout devant une box, fléchir les genoux et sauter explosif pour atterrir sur la boîte. Amortir la réception, genoux dans l'axe. Soit sauter en arrière soit descendre en pas pour revenir. Développe la puissance explosive des membres inférieurs.",
    level: "intermédiaire",
  },
  {
    name: "Depth jump",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets"],
    equipment: ["Box"],
    description: "Tomber d'une box, atterrir et repartir immédiatement en saut vertical avec un temps de contact minimal. Travaille la raideur musculo-tendineuse et le réflexe myotatique. Réservé aux athlètes ayant une bonne base de force.",
    level: "avancé",
  },
  {
    name: "Broad jump (saut en longueur)",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets", "Core"],
    equipment: ["Poids du corps"],
    description: "Depuis la position debout, fléchir les genoux, balancer les bras en arrière puis sauter en avant le plus loin possible. Atterrir amorti sur deux pieds. Mesurer la distance pour le suivi de progression.",
    level: "intermédiaire",
  },
  {
    name: "Saut latéral (skater jump)",
    category: "pliométrie",
    muscleGroups: ["Fessiers", "Quadriceps", "Stabilisateurs"],
    equipment: ["Poids du corps"],
    description: "Sauter d'un pied sur l'autre latéralement en imitant un patineur. Atterrir sur un pied, amortir la réception avec le genou fléchi. Augmenter progressivement la distance et la vitesse. Développe la stabilité latérale.",
    level: "intermédiaire",
  },
  {
    name: "Drop jump",
    category: "pliométrie",
    muscleGroups: ["Mollets", "Quadriceps", "Tendon d'Achille"],
    equipment: ["Box"],
    description: "Se laisser tomber d'une box basse, atterrir sur la pointe des pieds et rebondir immédiatement le plus haut possible. Réception sur avant-pieds uniquement. Cible la raideur du complexe mollet-tendon.",
    level: "avancé",
  },
  {
    name: "Saut à la corde",
    category: "pliométrie",
    muscleGroups: ["Mollets", "Quadriceps", "Coordination"],
    equipment: ["Aucun"],
    description: "Sauter à la corde avec un minimum de hauteur et un maximum de vitesse. Maintenir les coudes près du corps, faire tourner la corde avec les poignets. Développe la coordination, la cadence de pas et l'endurance des mollets.",
    level: "débutant",
  },
  {
    name: "Skipping (montées de genoux hautes)",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Core"],
    equipment: ["Poids du corps"],
    description: "Courir sur place en montant les genoux à hauteur de la hanche à chaque pas. Tempo élevé, bras en opposition. Travaille la cadence, la coordination et la puissance de flexion de hanche.",
    level: "débutant",
  },
  {
    name: "Jumping jacks (sauts écartés)",
    category: "pliométrie",
    muscleGroups: ["Épaules", "Fessiers", "Mollets"],
    equipment: ["Poids du corps"],
    description: "Position de départ pieds joints, bras le long du corps. Sauter en écartant les jambes tout en levant les bras au-dessus de la tête, puis revenir. Exercice d'activation cardiovasculaire et de coordination.",
    level: "débutant",
  },
  {
    name: "Saut vertical sur place",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets", "Core"],
    equipment: ["Poids du corps"],
    description: "Depuis la position debout, fléchir les genoux et les hanches tout en balançant les bras en arrière, puis sauter le plus haut possible en étendant tout le corps. Atterrir amorti. Mesurer la hauteur pour le suivi.",
    level: "débutant",
  },
  {
    name: "Pogo jumps (sauts sur les pointes)",
    category: "pliométrie",
    muscleGroups: ["Mollets", "Tendon d'Achille"],
    equipment: ["Poids du corps"],
    description: "Sauts répétés sur les pointes de pied avec un minimum de flexion des genoux et des hanches. Maximiser la réactivité au sol et la vitesse de répétition. Développe la raideur du complexe mollet-tendon d'Achille.",
    level: "intermédiaire",
  },
  {
    name: "Fente sautée (split jump)",
    category: "pliométrie",
    muscleGroups: ["Quadriceps", "Fessiers", "Mollets"],
    equipment: ["Poids du corps"],
    description: "Depuis la position de fente basse, sauter et changer de jambe en l'air pour atterrir en fente sur l'autre jambe. Alterner rapidement. Combine pliométrie et travail des membres inférieurs.",
    level: "intermédiaire",
  },

  // ================================================================
  // CARDIO (16 exercices — minimum requis : 15)
  // ================================================================
  {
    name: "Course sur tapis roulant",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Cardiovasculaire"],
    equipment: ["Machine"],
    description: "Ajuster la vitesse et l'inclinaison selon l'objectif : aérobie modéré (60-70% FCmax), seuil (80-85%), ou intervalles. Maintenir une foulée naturelle, bras actifs, regard droit devant.",
    level: "débutant",
  },
  {
    name: "Vélo stationnaire",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Cardiovasculaire"],
    equipment: ["Machine"],
    description: "Cardio à faible impact articulaire. Régler la selle à hauteur de la hanche. Pédaler avec cadence régulière. Pratiqué en endurance continue ou en intervalles. Idéal en récupération active ou réathlétisation.",
    level: "débutant",
  },
  {
    name: "Rameur ergomètre",
    category: "cardio",
    muscleGroups: ["Corps entier", "Dos", "Jambes", "Cardiovasculaire"],
    equipment: ["Machine"],
    description: "Séquence : jambes d'abord (60% de la puissance), puis buste en arrière, puis bras tirent. Au retour : bras, buste, genoux. Ratio 1:2 effort/récupération pour les intervalles.",
    level: "intermédiaire",
  },
  {
    name: "Assault bike",
    category: "cardio",
    muscleGroups: ["Corps entier", "Épaules", "Quadriceps", "Cardiovasculaire"],
    equipment: ["Machine"],
    description: "Vélo à résistance à air : plus on pousse fort, plus la résistance augmente. Alterner sprints courts (15-20 sec) et récupérations. Sollicite simultanément membres supérieurs et inférieurs.",
    level: "intermédiaire",
  },
  {
    name: "Elliptique",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Fessiers", "Épaules", "Cardiovasculaire"],
    equipment: ["Machine"],
    description: "Cardio à très faible impact articulaire. Mouvement elliptique simulant la marche nordique. Maintenir la résistance adaptée pour garder une cadence de 65-80 RPM. Excellent en période de blessure.",
    level: "débutant",
  },
  {
    name: "Sled push (traîneau)",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Fessiers", "Épaules", "Core"],
    equipment: ["Aucun"],
    description: "Pousser un traîneau lesté. Rester penché en avant, bras tendus sur les poignées. Cadence de pas rapide et courte. Intervalle classique : 20-30 m de poussée, 2 min de repos.",
    level: "intermédiaire",
  },
  {
    name: "Sled pull (traction traîneau)",
    category: "cardio",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Dos", "Core"],
    equipment: ["Aucun"],
    description: "Tirer un traîneau lesté via cordes ou baudrier. Peut se faire en marchant en arrière ou en course avant avec harnais. Excellent pour la réathlétisation des genoux.",
    level: "intermédiaire",
  },
  {
    name: "Farmer's carry (marche fermière)",
    category: "cardio",
    muscleGroups: ["Avant-bras", "Trapèzes", "Core", "Stabilisateurs"],
    equipment: ["Haltères"],
    description: "Tenir des haltères lourds dans chaque main, bras le long du corps. Marcher sur une distance donnée en maintenant le torse droit et les omoplates serrées. Développe la force de préhension et l'endurance.",
    level: "intermédiaire",
  },
  {
    name: "Wall ball",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Épaules", "Core"],
    equipment: ["Médecine ball"],
    description: "Tenir le médecine ball à hauteur du menton. Descendre en squat, puis lancer contre un mur à environ 3 m lors de la remontée. Attraper le rebond et enchaîner directement avec le squat suivant.",
    level: "intermédiaire",
  },
  {
    name: "Battle ropes",
    category: "cardio",
    muscleGroups: ["Épaules", "Biceps", "Core"],
    equipment: ["Aucun"],
    description: "Tenir une corde épaisse dans chaque main. Créer des vagues alternées ou simultanées avec les bras. Genoux légèrement fléchis, tronc stable. Excellent pour la puissance-endurance et la cardio.",
    level: "débutant",
  },
  {
    name: "Kettlebell swing",
    category: "cardio",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Core", "Épaules"],
    equipment: ["Kettlebell"],
    description: "Pieds plus larges que les épaules. Balancer le kettlebell entre les jambes puis propulser avec une extension explosive des hanches. Les bras restent passifs — la poussée des hanches génère le mouvement.",
    level: "intermédiaire",
  },
  {
    name: "Burpee avec saut",
    category: "cardio",
    muscleGroups: ["Corps entier", "Pectoraux", "Core", "Cardiovasculaire"],
    equipment: ["Poids du corps"],
    description: "Depuis debout : poser les mains au sol, sauter pieds en arrière, effectuer une pompe, sauter pieds vers les mains, puis saut vertical bras levés. Enchaîner sans pause.",
    level: "intermédiaire",
  },
  {
    name: "Mountain climbers",
    category: "cardio",
    muscleGroups: ["Core", "Épaules", "Cardiovasculaire"],
    equipment: ["Poids du corps"],
    description: "En position de planche haute, ramener alternativement les genoux vers la poitrine à cadence rapide. Maintenir les hanches basses. Combine gainage du tronc et travail cardiovasculaire.",
    level: "débutant",
  },
  {
    name: "Médecine ball slam",
    category: "cardio",
    muscleGroups: ["Core", "Épaules", "Dos", "Quadriceps"],
    equipment: ["Médecine ball"],
    description: "Tenir le médecine ball à deux mains. Élever au-dessus de la tête en extension, puis lancer au sol avec force maximale en fléchissant les hanches. Rattraper le rebond et enchaîner directement.",
    level: "débutant",
  },
  {
    name: "Sprint sur place",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Fessiers", "Cardiovasculaire"],
    equipment: ["Poids du corps"],
    description: "Sprinter sur place à intensité maximale pendant 10-20 secondes. Monter les genoux haut, bras actifs. Tabata classique : 8 rounds de 20 sec effort / 10 sec repos.",
    level: "débutant",
  },
  {
    name: "Montées de genoux sur place",
    category: "cardio",
    muscleGroups: ["Quadriceps", "Core", "Cardiovasculaire"],
    equipment: ["Poids du corps"],
    description: "Courir sur place à haute intensité en montant les genoux au niveau des hanches. Bras actifs en opposition. Maintenir un rythme élevé. Idéal en circuit training ou comme exercice de transition cardio.",
    level: "débutant",
  },

  // ================================================================
  // MOBILITÉ (15 exercices — minimum requis : 15)
  // ================================================================
  {
    name: "Mobilisation thoracique au foam roller",
    category: "mobilité",
    muscleGroups: ["Colonne thoracique", "Dos"],
    equipment: ["Foam roller"],
    description: "Foam roller perpendiculairement à la colonne, sous les omoplates. Bras croisés sur la poitrine, laisser la tête descendre. Rouler doucement de T4 à T12. S'arrêter sur les zones tendues 30-60 sec.",
    level: "débutant",
  },
  {
    name: "Hip flexor stretch",
    category: "mobilité",
    muscleGroups: ["Fléchisseurs de hanche", "Quadriceps"],
    equipment: ["Tapis"],
    description: "Position de fente basse, genou arrière au sol. Avancer légèrement pour étirer le fléchisseur de hanche de la jambe arrière. Contracter le fessier arrière pour augmenter l'étirement. 30-60 sec par côté.",
    level: "débutant",
  },
  {
    name: "Étirement piriforme (figure 4)",
    category: "mobilité",
    muscleGroups: ["Piriforme", "Fessiers", "Rotateurs externes"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, croiser une cheville sur le genou opposé. Saisir la cuisse du bas et tirer vers la poitrine. Tenir 30-60 sec par côté. Soulage les douleurs du nerf sciatique.",
    level: "débutant",
  },
  {
    name: "Mobilisation hanche 90/90",
    category: "mobilité",
    muscleGroups: ["Hanche", "Rotateurs internes", "Rotateurs externes"],
    equipment: ["Tapis"],
    description: "Assis au sol, les deux jambes à 90° (jambe avant en rotation externe, jambe arrière en rotation interne). Se pencher sur la jambe avant puis en rotation vers la jambe arrière. Développe la polyvalence de la hanche.",
    level: "débutant",
  },
  {
    name: "Cat-cow (chat-vache)",
    category: "mobilité",
    muscleGroups: ["Colonne vertébrale", "Core", "Dos"],
    equipment: ["Tapis"],
    description: "À quatre pattes. Inspiration : creuser le dos, lever tête et coccyx (vache). Expiration : arrondir le dos vers le plafond, rentrer le menton et le bassin (chat). Mouvement continu et contrôlé.",
    level: "débutant",
  },
  {
    name: "Thread the needle (rotation thoracique)",
    category: "mobilité",
    muscleGroups: ["Colonne thoracique", "Épaule", "Dos"],
    equipment: ["Tapis"],
    description: "À quatre pattes. Glisser un bras sous le corps en rotation jusqu'à poser l'épaule au sol. Tenir 3-5 sec puis revenir. Option : lever le bras libre vers le plafond. Excellente mobilité thoracique en rotation.",
    level: "débutant",
  },
  {
    name: "Spiderman stretch",
    category: "mobilité",
    muscleGroups: ["Fléchisseurs hanche", "Adducteurs", "Colonne thoracique"],
    equipment: ["Tapis"],
    description: "En position de pompe, avancer un pied vers la main du même côté. Poser le pied à l'extérieur de la main. Option : rotation du bras vers le plafond. Combine étirements et mobilité thoracique.",
    level: "débutant",
  },
  {
    name: "World's greatest stretch",
    category: "mobilité",
    muscleGroups: ["Fléchisseurs hanche", "Adducteurs", "Colonne thoracique", "Ischio-jambiers"],
    equipment: ["Tapis"],
    description: "En fente avant : main arrière au sol, rotation du bras avant vers le plafond, puis redresser la jambe avant. Enchaîner les 3 mouvements sur 5 reps par côté. Considéré comme l'étirement le plus complet.",
    level: "intermédiaire",
  },
  {
    name: "Band pull-apart",
    category: "mobilité",
    muscleGroups: ["Rotateurs externes épaule", "Rhomboïdes", "Trapèzes"],
    equipment: ["Bandes élastiques"],
    description: "Tenir un élastique à deux mains devant soi, bras tendus à hauteur des épaules. Écarter les bras en tirant jusqu'à toucher la poitrine. Contrôler le retour. Active la coiffe et renforce les muscles posturaux.",
    level: "débutant",
  },
  {
    name: "Flexion de cheville au mur",
    category: "mobilité",
    muscleGroups: ["Cheville", "Mollets"],
    equipment: ["Poids du corps"],
    description: "Debout face à un mur, un pied à environ 10-15 cm. Fléchir le genou pour toucher le mur sans décoller le talon. Avancer progressivement le pied. Améliore la dorsiflexion de cheville, essentielle pour le squat profond.",
    level: "débutant",
  },
  {
    name: "Dislocations épaules (bâton)",
    category: "mobilité",
    muscleGroups: ["Épaule", "Rotateurs", "Coiffe des rotateurs"],
    equipment: ["Poids du corps"],
    description: "Tenir un bâton ou une corde devant soi, mains très écartées. Passer le bâton par-dessus la tête jusqu'à l'amener derrière le dos, bras tendus. Réduire progressivement l'écartement des mains au fil des séances.",
    level: "intermédiaire",
  },
  {
    name: "Hip CARs (cercles de hanche)",
    category: "mobilité",
    muscleGroups: ["Hanche", "Stabilisateurs", "Fessiers"],
    equipment: ["Poids du corps"],
    description: "Debout sur une jambe, lever le genou opposé et faire des cercles complets avec la hanche. Lentement, avec amplitude maximale et contrôle. 5 répétitions par direction et par côté.",
    level: "intermédiaire",
  },
  {
    name: "Rotation cervicale active",
    category: "mobilité",
    muscleGroups: ["Cervicales", "Muscles du cou"],
    equipment: ["Poids du corps"],
    description: "Assis ou debout, dos droit. Tourner lentement la tête vers la droite jusqu'à la limite de la rotation, maintenir 2 sec, revenir au centre, puis à gauche. 5 à 8 répétitions par côté.",
    level: "débutant",
  },
  {
    name: "Étirement pectoral au mur",
    category: "mobilité",
    muscleGroups: ["Pectoraux", "Épaule antérieure", "Biceps"],
    equipment: ["Poids du corps"],
    description: "Debout face à un mur. Placer le bras en L (coude à 90°) contre la surface. Pivoter le corps vers l'opposé jusqu'à sentir l'étirement dans le pectoral et l'épaule. 30-60 sec par côté.",
    level: "débutant",
  },
  {
    name: "Squat to stand (mobilité ischio-jambiers)",
    category: "mobilité",
    muscleGroups: ["Ischio-jambiers", "Hanche", "Cheville"],
    equipment: ["Poids du corps"],
    description: "Pieds à largeur des épaules, se pencher en avant et saisir les orteils. Descendre en squat en gardant les orteils saisis, poitrine vers le haut. Se relever, puis redescendre. Étire les ischio-jambiers et améliore la mobilité de hanche.",
    level: "débutant",
  },

  // ================================================================
  // CORE (20 exercices — minimum requis : 20)
  // ================================================================
  {
    name: "Gainage frontal (planche)",
    category: "core",
    muscleGroups: ["Core", "Épaules", "Fessiers"],
    equipment: ["Tapis"],
    description: "Position de gainage sur avant-bras, corps en ligne droite de la tête aux talons. Contracter les fessiers, serrer le core, regarder le sol. Éviter que les hanches s'affaissent ou montent.",
    level: "débutant",
  },
  {
    name: "Gainage latéral",
    category: "core",
    muscleGroups: ["Obliques", "Core", "Épaules"],
    equipment: ["Tapis"],
    description: "Sur l'avant-bras d'un côté, corps aligné de la tête aux pieds. Hanches levées, ne pas s'affaisser. Tenir le temps requis puis changer de côté. Variante difficile : lever la jambe supérieure.",
    level: "débutant",
  },
  {
    name: "Gainage dynamique (rotation)",
    category: "core",
    muscleGroups: ["Core", "Épaules", "Obliques"],
    equipment: ["Tapis"],
    description: "Depuis planche sur les mains, pivoter vers un gainage latéral en levant un bras vers le plafond. Revenir au centre et alterner. Contrôler la rotation et stabiliser le bassin.",
    level: "intermédiaire",
  },
  {
    name: "Crunch abdominal",
    category: "core",
    muscleGroups: ["Abdominaux", "Core"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, genoux fléchis, mains derrière la tête. Contracter les abdominaux pour soulever légèrement les épaules du sol. Ne pas tirer sur la nuque. Mouvement court et contrôlé.",
    level: "débutant",
  },
  {
    name: "Crunch inversé",
    category: "core",
    muscleGroups: ["Abdominaux inférieurs", "Core"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, jambes en l'air. Contracter les abdominaux pour soulever le bassin du sol et ramener les genoux vers la poitrine. Redescendre lentement sans laisser les jambes tomber.",
    level: "débutant",
  },
  {
    name: "Russian twist",
    category: "core",
    muscleGroups: ["Obliques", "Core", "Abdominaux"],
    equipment: ["Médecine ball"],
    description: "Assis, genoux fléchis, buste à 45°. Tenir un poids ou médecine ball contre la poitrine. Rotation du buste de droite à gauche en contrôlant. Progression : jambes levées ou amplitude accrue.",
    level: "débutant",
  },
  {
    name: "Relevé de jambes suspendu",
    category: "core",
    muscleGroups: ["Abdominaux", "Fléchisseurs de hanche"],
    equipment: ["Barre de traction"],
    description: "Suspendu à la barre, bras tendus. Lever les jambes tendues jusqu'à l'horizontale en contractant les abdominaux. Redescendre sans se balancer. Variante accessible : genoux fléchis.",
    level: "avancé",
  },
  {
    name: "Ab wheel rollout",
    category: "core",
    muscleGroups: ["Core", "Grand dorsal", "Épaules"],
    equipment: ["Aucun"],
    description: "À genoux, tenir la roue abdominale. Faire rouler vers l'avant en étendant le corps dos plat jusqu'à la limite de contrôle. Revenir en fléchissant les hanches. Développe la résistance à l'extension du tronc.",
    level: "intermédiaire",
  },
  {
    name: "Dragon flag",
    category: "core",
    muscleGroups: ["Core", "Abdominaux", "Dos"],
    equipment: ["Tapis"],
    description: "Allongé sur un banc, saisir le banc derrière la tête. Soulever les hanches et le corps jusqu'à la verticalité, puis descendre en corps rigide en résistant à la gravité. Exercice avancé — commencer par variantes genoux fléchis.",
    level: "avancé",
  },
  {
    name: "Pallof press",
    category: "core",
    muscleGroups: ["Core", "Obliques", "Stabilisateurs"],
    equipment: ["Câbles"],
    description: "Debout de côté par rapport à un câble, poignée à hauteur du sternum. Pousser vers l'avant jusqu'à extension des bras sans laisser la rotation s'installer, puis ramener. Excellent pour la stabilité anti-rotation.",
    level: "intermédiaire",
  },
  {
    name: "Dead bug",
    category: "core",
    muscleGroups: ["Core", "Abdominaux", "Stabilisateurs lombaires"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, bras tendus au plafond, genoux à 90° en l'air. Abaisser simultanément bras droit et jambe gauche sans décoller le dos du sol. Revenir et alterner. Développe le gainage profond sans contrainte spinale.",
    level: "débutant",
  },
  {
    name: "Hollow body hold",
    category: "core",
    muscleGroups: ["Core", "Abdominaux", "Fléchisseurs de hanche"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, bras tendus derrière la tête, jambes tendues légèrement décollées du sol. Presser le bas du dos contre le sol. Maintenir en respirant normalement. Exercice fondamental de la gymnastique.",
    level: "intermédiaire",
  },
  {
    name: "Bicycle crunch",
    category: "core",
    muscleGroups: ["Obliques", "Abdominaux", "Fléchisseurs de hanche"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, mains derrière la tête, jambes levées. Alterner : ramener un genou vers la poitrine tout en tournant le buste pour amener le coude opposé vers ce genou. Mouvement de pédalage.",
    level: "débutant",
  },
  {
    name: "RKC plank",
    category: "core",
    muscleGroups: ["Core", "Fessiers", "Quadriceps", "Épaules"],
    equipment: ["Tapis"],
    description: "Position de gainage sur avant-bras. Contracter simultanément les fessiers, serrer les cuisses, écraser les poings au sol. Cette contraction maximale augmente considérablement la difficulté. 10 sec intenses = 1 min de planche classique.",
    level: "intermédiaire",
  },
  {
    name: "Gainage avec marche de bras",
    category: "core",
    muscleGroups: ["Core", "Épaules", "Triceps"],
    equipment: ["Tapis"],
    description: "Depuis planche sur avant-bras, se lever sur une main puis sur l'autre pour arriver en planche haute, puis redescendre. Alterner le bras qui mène. Hanches stables sans rotation.",
    level: "intermédiaire",
  },
  {
    name: "Rotation du tronc câble",
    category: "core",
    muscleGroups: ["Obliques", "Core"],
    equipment: ["Câbles"],
    description: "Debout de côté face à un câble. Saisir la poignée à deux mains, bras tendus. Rotation du buste de façon contrôlée. En woodchop (haut-bas) ou reverse woodchop (bas-haut). Développe les obliques fonctionnellement.",
    level: "intermédiaire",
  },
  {
    name: "Side bend haltère",
    category: "core",
    muscleGroups: ["Obliques", "Carré des lombes"],
    equipment: ["Haltères"],
    description: "Debout, haltère dans une main, bras le long du corps. Inclinaison latérale vers le côté portant l'haltère, puis contraction des obliques opposés pour revenir. Unilatéral pour maximiser le recrutement.",
    level: "débutant",
  },
  {
    name: "V-up",
    category: "core",
    muscleGroups: ["Abdominaux", "Fléchisseurs de hanche"],
    equipment: ["Tapis"],
    description: "Allongé à plat, bras derrière la tête, jambes jointes. Soulever simultanément les bras et les jambes pour former un V, toucher les orteils ou les tibias. Redescendre lentement. Sollicite tout le droit abdominal.",
    level: "intermédiaire",
  },
  {
    name: "Copenhagen plank",
    category: "core",
    muscleGroups: ["Adducteurs", "Core", "Obliques"],
    equipment: ["Tapis"],
    description: "Allongé sur le côté, pied supérieur sur un banc ou une box. Soulever les hanches pour former une ligne droite. La jambe inférieure peut rester au sol (version facile) ou être soulevée. Cible spécifiquement les adducteurs.",
    level: "avancé",
  },
  {
    name: "Bird dog",
    category: "core",
    muscleGroups: ["Lombaires", "Core", "Fessiers"],
    equipment: ["Tapis"],
    description: "À quatre pattes, mains sous épaules, genoux sous hanches. Étendre simultanément bras droit et jambe gauche jusqu'à l'horizontale. Maintenir 3 sec, revenir. Alterner. Développe la stabilité lombaire et la coordination croisée.",
    level: "débutant",
  },

  // ================================================================
  // RÉATHLÉTISATION (16 exercices — minimum requis : 15)
  // ================================================================
  {
    name: "Pont fessier (glute bridge)",
    category: "réathlétisation",
    muscleGroups: ["Fessiers", "Ischio-jambiers", "Core"],
    equipment: ["Tapis"],
    description: "Allongé sur le dos, genoux fléchis à 90°, pieds à plat. Pousser le sol pour soulever les hanches jusqu'à alignement genoux-hanches-épaules. Contracter les fessiers au sommet. Exercice de base en réathlétisation du genou.",
    level: "débutant",
  },
  {
    name: "Clamshell (coquille)",
    category: "réathlétisation",
    muscleGroups: ["Fessiers moyens", "Rotateurs externes hanche"],
    equipment: ["Bandes élastiques"],
    description: "Allongé sur le côté, genoux fléchis à 45°, hanches empilées. Lever le genou supérieur comme une coquille qui s'ouvre, sans rouler le bassin. Élastique au-dessus des genoux pour progresser. Exercice clé en réathlétisation du genou.",
    level: "débutant",
  },
  {
    name: "Monster walk (élastique)",
    category: "réathlétisation",
    muscleGroups: ["Fessiers", "Abducteurs", "Stabilisateurs genou"],
    equipment: ["Bandes élastiques"],
    description: "Élastique au-dessus des genoux. Légère flexion des genoux. Avancer en maintenant l'élastique tendu à chaque pas, sans laisser les genoux se rapprocher. Variantes : avant, arrière, latérale. Outil fondamental de préhabilitation.",
    level: "débutant",
  },
  {
    name: "Terminal knee extension (TKE)",
    category: "réathlétisation",
    muscleGroups: ["Quadriceps", "VMO", "Stabilisateurs genou"],
    equipment: ["Bandes élastiques"],
    description: "Élastique attaché derrière le genou. Debout, genou légèrement fléchi. Étendre le genou contre la résistance jusqu'à extension complète. Maintenir 2 sec. Cible le VMO et améliore le contrôle de l'extension du genou.",
    level: "débutant",
  },
  {
    name: "Rotation externe épaule (élastique)",
    category: "réathlétisation",
    muscleGroups: ["Rotateurs externes épaule", "Coiffe des rotateurs"],
    equipment: ["Bandes élastiques"],
    description: "Coude fléchi à 90°, collé au flanc. Rotation externe de l'avant-bras contre un élastique ou un câble. Contrôler le retour. Peut se faire couché sur le côté avec haltère léger. Exercice prophylactique pour la santé de l'épaule.",
    level: "débutant",
  },
  {
    name: "Y-T-W-L (épaule)",
    category: "réathlétisation",
    muscleGroups: ["Trapèzes moyens et inférieurs", "Rhomboïdes", "Coiffe des rotateurs"],
    equipment: ["Tapis"],
    description: "Allongé ventre au sol ou sur banc incliné, bras tendus. Former successivement Y (bras à 45°), T (bras à 90°), W (coudes à 90° en hauteur), L (coudes à 90° le long du corps). Haltères légers ou poids du corps.",
    level: "débutant",
  },
  {
    name: "Single leg deadlift (corps libre)",
    category: "réathlétisation",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Stabilisateurs cheville"],
    equipment: ["Poids du corps"],
    description: "Debout sur une jambe. Pencher le buste vers l'avant tout en élevant la jambe libre derrière soi jusqu'à former une ligne horizontale. Commencer sans poids, progresser avec haltère. Développe l'équilibre et les ischio-jambiers.",
    level: "intermédiaire",
  },
  {
    name: "Équilibre sur une jambe",
    category: "réathlétisation",
    muscleGroups: ["Stabilisateurs cheville", "Proprioception", "Core"],
    equipment: ["Poids du corps"],
    description: "Debout sur une jambe, autre genou levé. Maintenir l'équilibre 30-60 sec. Progressions : yeux fermés, surface instable, lancers de balle. Base de la réathlétisation proprioceptive après entorse ou chirurgie du genou.",
    level: "débutant",
  },
  {
    name: "Step-down excentrique",
    category: "réathlétisation",
    muscleGroups: ["Quadriceps", "VMO", "Stabilisateurs genou"],
    equipment: ["Box"],
    description: "Debout sur une box. Descendre lentement (3-4 sec) le pied libre vers le sol sans le poser, en contrôlant avec la jambe d'appui. Remonter. L'accent excentrique renforce le quadriceps, essentiel après blessure au genou.",
    level: "intermédiaire",
  },
  {
    name: "Reverse Nordic curl",
    category: "réathlétisation",
    muscleGroups: ["Quadriceps", "Fléchisseurs de hanche"],
    equipment: ["Tapis"],
    description: "À genoux sur tapis, pieds bloqués. Corps droit. Se pencher en arrière le plus lentement possible, corps rigide. Revenir avec les mains au sol. Travaille les quadriceps excentriquement — utile en prévention des blessures au genou.",
    level: "avancé",
  },
  {
    name: "Nordic curl",
    category: "réathlétisation",
    muscleGroups: ["Ischio-jambiers", "Core"],
    equipment: ["Tapis"],
    description: "À genoux, chevilles bloquées par un partenaire. Descendre lentement le buste vers le sol en résistant avec les ischio-jambiers. Se rattraper avec les mains. Un des exercices les plus efficaces en prévention des déchirures des ischio-jambiers.",
    level: "avancé",
  },
  {
    name: "Dorsal (superman)",
    category: "réathlétisation",
    muscleGroups: ["Lombaires", "Fessiers", "Trapèzes"],
    equipment: ["Tapis"],
    description: "Allongé ventre au sol, bras tendus devant. Soulever simultanément les bras et les jambes en contractant lombaires et fessiers. Maintenir 2-3 sec au sommet. Renforce les érecteurs du rachis et les fessiers.",
    level: "débutant",
  },
  {
    name: "Lateral band walk",
    category: "réathlétisation",
    muscleGroups: ["Fessiers moyens", "Abducteurs", "Stabilisateurs genou"],
    equipment: ["Bandes élastiques"],
    description: "Mini-bande au-dessus des genoux. Légère flexion des genoux. Pas latéraux en maintenant la tension de l'élastique. Les pieds ne se rejoignent pas complètement. Active le moyen fessier et améliore la stabilité en valgus du genou.",
    level: "débutant",
  },
  {
    name: "Pistol squat assisté",
    category: "réathlétisation",
    muscleGroups: ["Quadriceps", "Fessiers", "Stabilisateurs", "Cheville"],
    equipment: ["Bandes élastiques"],
    description: "Squat sur une jambe en tenant un élastique ou support pour l'équilibre. Descendre le plus bas possible, jambe libre décollée du sol. La bande assiste le bas du mouvement. Développe la force unijambiste.",
    level: "avancé",
  },
  {
    name: "Hip hinge assisté",
    category: "réathlétisation",
    muscleGroups: ["Ischio-jambiers", "Fessiers", "Lombaires"],
    equipment: ["Poids du corps"],
    description: "Debout dos contre un mur, hanches à 30 cm. Fléchir les hanches en poussant les fesses vers le mur, dos plat. Toucher le mur avec les fesses puis revenir en extension. Apprend le mouvement de charnière (hinge) fondamental.",
    level: "débutant",
  },
  {
    name: "Isométrie mollet (calf raise isométrique)",
    category: "réathlétisation",
    muscleGroups: ["Mollets", "Tendon d'Achille"],
    equipment: ["Poids du corps"],
    description: "Sur une marche ou une box, monter sur la pointe du pied et maintenir la position haute le temps requis (30-45 sec). Progression : unilatéral. Protocole de renforcement excentrique-isométrique utilisé en tendinopathie d'Achille.",
    level: "débutant",
  },

];

export async function seedExercises(): Promise<{ inserted: number; levelUpdated: number; categoryUpdated: number }> {
  let existing: { name: string }[] = [];
  try {
    existing = await db
      .select({ name: exercisesTable.name })
      .from(exercisesTable)
      .where(isNull(exercisesTable.createdBy));
  } catch (e) {
    console.warn("⚠  Impossible de lire les exercices existants — table absente ou inaccessible:", (e as Error).message);
    return { inserted: 0, levelUpdated: 0, categoryUpdated: 0 };
  }

  const existingNames = new Set(existing.map((e) => e.name));

  const toInsert = EXERCISES.filter((e) => !existingNames.has(e.name));

  let inserted = 0;
  if (toInsert.length > 0) {
    try {
      await db.insert(exercisesTable).values(
        toInsert.map((e) => ({
          name: e.name,
          category: e.category,
          muscleGroups: e.muscleGroups,
          equipment: e.equipment,
          description: e.description,
          level: e.level,
        }))
      );
      inserted = toInsert.length;
    } catch (e) {
      console.warn(`⚠  Insert exercices échoué (${toInsert.length} exercices) — poursuite:`, (e as Error).message);
    }
  }

  let levelUpdated = 0;
  let categoryUpdated = 0;
  for (const ex of EXERCISES) {
    if (existingNames.has(ex.name)) {
      try {
        const lvlResult = await db
          .update(exercisesTable)
          .set({ level: ex.level })
          .where(
            and(
              eq(exercisesTable.name, ex.name),
              isNull(exercisesTable.createdBy),
              sql`${exercisesTable.level} IS NULL`
            )
          );
        if ((lvlResult as { rowCount?: number }).rowCount) levelUpdated++;
      } catch {
        // level column might not exist yet — non-fatal
      }

      try {
        const catResult = await db
          .update(exercisesTable)
          .set({ category: ex.category })
          .where(
            and(
              eq(exercisesTable.name, ex.name),
              isNull(exercisesTable.createdBy),
              eq(exercisesTable.category, "mobility")
            )
          );
        if (
          (catResult as { rowCount?: number }).rowCount &&
          ex.category === "réathlétisation"
        )
          categoryUpdated++;
      } catch {
        // non-fatal
      }
    }
  }

  return { inserted, levelUpdated, categoryUpdated };
}
