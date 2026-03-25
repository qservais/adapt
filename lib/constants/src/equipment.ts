export interface EquipmentItem {
  key: string;
  labelFr: string;
  category: string;
}

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  { key: "aucun", labelFr: "Aucun", category: "Basique" },
  { key: "poids-du-corps", labelFr: "Poids du corps", category: "Basique" },
  { key: "halteres", labelFr: "Haltères", category: "Poids libres" },
  { key: "barre", labelFr: "Barre", category: "Poids libres" },
  { key: "barre-ez", labelFr: "Barre EZ", category: "Poids libres" },
  { key: "barre-hexagonale", labelFr: "Barre Hexagonale", category: "Poids libres" },
  { key: "barre-de-traction", labelFr: "Barre de traction", category: "Poids libres" },
  { key: "barre-de-dips", labelFr: "Barre de dips", category: "Poids libres" },
  { key: "barres-paralleles", labelFr: "Barres parallèles", category: "Poids libres" },
  { key: "kettlebell", labelFr: "Kettlebell", category: "Poids libres" },
  { key: "medecine-ball", labelFr: "Médecine ball", category: "Poids libres" },
  { key: "slam-ball", labelFr: "Slam ball", category: "Poids libres" },
  { key: "wall-ball", labelFr: "Wall ball", category: "Poids libres" },
  { key: "ballon-exercice", labelFr: "Ballon d'exercice", category: "Poids libres" },
  { key: "bandes-elastiques", labelFr: "Bandes élastiques", category: "Élastiques" },
  { key: "bande-legere", labelFr: "Bande de résistance légère", category: "Élastiques" },
  { key: "bande-moyenne", labelFr: "Bande de résistance moyenne", category: "Élastiques" },
  { key: "bande-forte", labelFr: "Bande de résistance forte", category: "Élastiques" },
  { key: "bande-tres-forte", labelFr: "Bande de résistance très forte", category: "Élastiques" },
  { key: "trx", labelFr: "TRX", category: "Suspension" },
  { key: "sangles-suspension", labelFr: "Sangles de suspension", category: "Suspension" },
  { key: "anneaux-gymnastique", labelFr: "Anneaux de gymnastique", category: "Suspension" },
  { key: "parallettes", labelFr: "Parallettes", category: "Suspension" },
  { key: "box", labelFr: "Box", category: "Mobilier" },
  { key: "step", labelFr: "Step", category: "Mobilier" },
  { key: "banc", labelFr: "Banc", category: "Mobilier" },
  { key: "banc-incline", labelFr: "Banc incliné", category: "Mobilier" },
  { key: "banc-decline", labelFr: "Banc décliné", category: "Mobilier" },
  { key: "rack-squat", labelFr: "Rack squat", category: "Mobilier" },
  { key: "cage-multifonctions", labelFr: "Cage multifonctions", category: "Mobilier" },
  { key: "barre-fixation-murale", labelFr: "Barre de fixation murale", category: "Mobilier" },
  { key: "cables", labelFr: "Câbles", category: "Machines" },
  { key: "poulie-haute", labelFr: "Poulie haute", category: "Machines" },
  { key: "poulie-basse", labelFr: "Poulie basse", category: "Machines" },
  { key: "machine-guidee", labelFr: "Machine guidée", category: "Machines" },
  { key: "machine-smith", labelFr: "Machine Smith", category: "Machines" },
  { key: "leg-press", labelFr: "Leg press", category: "Machines" },
  { key: "hack-squat", labelFr: "Hack squat", category: "Machines" },
  { key: "pec-deck", labelFr: "Pec deck", category: "Machines" },
  { key: "butterfly-machine", labelFr: "Butterfly machine", category: "Machines" },
  { key: "chest-press-machine", labelFr: "Chest press machine", category: "Machines" },
  { key: "shoulder-press-machine", labelFr: "Shoulder press machine", category: "Machines" },
  { key: "lat-pulldown-machine", labelFr: "Lat pulldown machine", category: "Machines" },
  { key: "cable-row-machine", labelFr: "Cable row machine", category: "Machines" },
  { key: "leg-curl-machine", labelFr: "Leg curl machine", category: "Machines" },
  { key: "leg-extension-machine", labelFr: "Leg extension machine", category: "Machines" },
  { key: "abducteur-machine", labelFr: "Abducteur machine", category: "Machines" },
  { key: "adducteur-machine", labelFr: "Adducteur machine", category: "Machines" },
  { key: "mollet-debout-machine", labelFr: "Mollet debout machine", category: "Machines" },
  { key: "mollet-assis-machine", labelFr: "Mollet assis machine", category: "Machines" },
  { key: "tapis-de-sol", labelFr: "Tapis de sol", category: "Récupération" },
  { key: "foam-roller", labelFr: "Foam roller", category: "Récupération" },
  { key: "balle-de-massage", labelFr: "Balle de massage", category: "Récupération" },
  { key: "rouleau-mousse", labelFr: "Rouleau mousse", category: "Récupération" },
  { key: "corde-a-sauter", labelFr: "Corde à sauter", category: "Cardio & Fonctionnel" },
  { key: "corde-de-battle", labelFr: "Corde de battle", category: "Cardio & Fonctionnel" },
  { key: "bosu", labelFr: "Ballon BOSU", category: "Cardio & Fonctionnel" },
  { key: "planche-equilibre", labelFr: "Planche d'équilibre", category: "Cardio & Fonctionnel" },
  { key: "disques-de-glisse", labelFr: "Disques de glisse", category: "Cardio & Fonctionnel" },
  { key: "sac-de-frappe", labelFr: "Sac de frappe", category: "Cardio & Fonctionnel" },
  { key: "gants-de-boxe", labelFr: "Gants de boxe", category: "Cardio & Fonctionnel" },
  { key: "velo-stationnaire", labelFr: "Vélo stationnaire", category: "Cardio & Fonctionnel" },
  { key: "velo-elliptique", labelFr: "Vélo elliptique", category: "Cardio & Fonctionnel" },
  { key: "rameur", labelFr: "Rameur", category: "Cardio & Fonctionnel" },
  { key: "tapis-de-course", labelFr: "Tapis de course", category: "Cardio & Fonctionnel" },
  { key: "ski-erg", labelFr: "Ski erg", category: "Cardio & Fonctionnel" },
  { key: "bike-assault", labelFr: "Bike Assault", category: "Cardio & Fonctionnel" },
  { key: "sled", labelFr: "Sled", category: "Athlétisme" },
  { key: "traineau", labelFr: "Traîneau", category: "Athlétisme" },
  { key: "pneu", labelFr: "Pneu", category: "Athlétisme" },
  { key: "marteau", labelFr: "Marteau", category: "Athlétisme" },
  { key: "baguettes-vitesse", labelFr: "Baguettes de vitesse", category: "Athlétisme" },
  { key: "echelles-vitesse", labelFr: "Échelles de vitesse", category: "Athlétisme" },
  { key: "cones", labelFr: "Cônes", category: "Athlétisme" },
  { key: "haies", labelFr: "Haies", category: "Athlétisme" },
  { key: "ceinture-de-dips", labelFr: "Ceinture de dips", category: "Accessoires" },
  { key: "gilet-leste", labelFr: "Gilet lesté", category: "Accessoires" },
  { key: "sac-leste", labelFr: "Sac lesté", category: "Accessoires" },
  { key: "straps", labelFr: "Straps", category: "Accessoires" },
  { key: "magnésie", labelFr: "Magnésie", category: "Accessoires" },
  { key: "ceinture-lombaire", labelFr: "Ceinture lombaire", category: "Accessoires" },
  { key: "genouillères", labelFr: "Genouillères", category: "Accessoires" },
  { key: "hyper-extension", labelFr: "Hyper-extension", category: "Machines" },
  { key: "chaise-romaine", labelFr: "Chaise romaine", category: "Machines" },
];

export const EQUIPMENT_CATEGORIES = [...new Set(EQUIPMENT_CATALOG.map(e => e.category))];

export const EQUIPMENT_LABELS = EQUIPMENT_CATALOG.map(e => e.labelFr);

export function equipmentLabelFromKey(key: string): string {
  return EQUIPMENT_CATALOG.find(e => e.key === key)?.labelFr ?? key;
}

export function equipmentKeyFromLabel(label: string): string {
  return EQUIPMENT_CATALOG.find(e => e.labelFr === label)?.key ?? label;
}
