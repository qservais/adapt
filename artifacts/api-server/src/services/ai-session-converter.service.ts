import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { logger } from "../lib/logger.js";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set — AI session conversion is unavailable");
    this.name = "AiNotConfiguredError";
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new AiNotConfiguredError();
    client = new Anthropic({ apiKey });
  }
  return client;
}

const ConvertedSessionSchema = z.object({
  convertedText: z.string(),
});

// This is the ONLY consumer of the free-text input — its whole job is to
// reformat arbitrary coach-pasted text (WhatsApp, Word, a plain list...)
// into the [BLOC]/exercice syntax the EXISTING client-side parser
// (session-import-modal.tsx's parseSessionText) already understands. This
// function never itself decides which catalog exercise something maps to —
// that fuzzy-matching stays entirely in the existing parser, unchanged.
const SYSTEM_PROMPT = `Tu convertis un texte libre de séance de sport (collé depuis WhatsApp, Word, ou tapé à la volée par un coach) vers un format texte structuré précis. Tu ne fais QUE reformater — jamais inventer d'exercices, de séries ou de charges qui ne sont pas dans le texte source.

FORMAT CIBLE (exact, à respecter à la lettre) :

Chaque bloc commence par une ligne d'en-tête :
[BLOC] <nom du bloc> | <durée>min

Le nom du bloc doit être un mot-clé reconnaissable parmi : Échauffement, Force, Hypertrophie, Cardio, Core, Pliométrie, Technique, Retour au calme, Mobilité, Activation. Choisis celui qui correspond le mieux au contenu du bloc ; si aucun ne correspond clairement, utilise "Force".

Chaque ligne d'exercice suit ce format, séparé par des barres verticales :
Nom de l'exercice | dosage | charge (optionnel) | repos (optionnel) | tempo (optionnel) | consigne (optionnel)

Le dosage suit un de ces formats :
- "4x8" ou "3x10-12" (séries x répétitions, ou fourchette de répétitions)
- "3x45s" (séries x durée en secondes, pour un exercice chronométré)
- "3" tout seul si le texte ne précise qu'un nombre de séries

La charge (si mentionnée) : "80kg", "poids de corps", ou un pourcentage comme "70%".
Le repos (si mentionné) : "90s repos" ou juste "60s".
Le tempo (si mentionné) : format "3-1-1-0" (excentrique-pause-concentrique-pause).
Toute autre indication (consigne technique, RPE, etc.) va dans le dernier champ.

EXEMPLE D'ENTRÉE :
Échauffement 10 min : rameur léger, mobilité épaules
Force :
Squat 4x6 @80kg repos 2min
Développé couché 4x8, tempo 3-1-1-0
Tirage horizontal 3x10-12

EXEMPLE DE SORTIE :
[BLOC] Échauffement | 10min
Rameur | 1x5min | | | | léger
Mobilité épaules | 1 | | | |

[BLOC] Force | 30min
Squat | 4x6 | 80kg | 120s repos | |
Développé couché | 4x8 | | | 3-1-1-0 |
Tirage horizontal | 3x10-12 | | | |

Règles :
- Ne rajoute jamais un exercice, une série ou une charge qui n'est pas mentionnée dans le texte source.
- Si une durée de bloc n'est pas précisée, estime une valeur raisonnable (10-15 pour un échauffement, 20-40 pour le corps de séance).
- Si le texte source contient plusieurs séances distinctes, ne convertis que la première et ignore le reste.
- Réponds uniquement avec le texte converti, sans commentaire ni explication.`;

export async function convertFreeTextToAdaptFormat(rawText: string): Promise<string> {
  const response = await getClient().messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: rawText }],
    output_config: { format: zodOutputFormat(ConvertedSessionSchema) },
  });

  if (!response.parsed_output) {
    logger.error({ stopReason: response.stop_reason }, "convertFreeTextToAdaptFormat: no parsed_output");
    throw new Error("La conversion IA n'a pas produit de résultat exploitable");
  }
  return response.parsed_output.convertedText;
}
