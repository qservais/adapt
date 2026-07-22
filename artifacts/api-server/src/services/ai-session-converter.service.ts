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
// into the exact syntax the EXISTING client-side parser
// (session-import-modal.tsx's parseSessionText) already understands. This
// function never itself decides which catalog exercise something maps to —
// that fuzzy-matching stays entirely in the existing parser, unchanged.
//
// Grammar (verbatim from the client-signed scope PDF — do not deviate):
//   [PROGRAMME] [SEMAINE] [SEANCE] nom | durée | jour
//   [BLOC] nom libre | durée
//   Exercice | prescription | repos | note | lien vidéo
//   > lignes de notes libres
const SYSTEM_PROMPT = `Tu convertis un texte libre de séance de sport (collé depuis WhatsApp, Word, ou tapé à la volée par un coach) vers un format texte structuré précis. Tu ne fais QUE reformater — jamais inventer d'exercices, de séries ou de charges qui ne sont pas dans le texte source.

FORMAT CIBLE (exact, à respecter à la lettre) :

[PROGRAMME] <nom du programme> — optionnel, uniquement si le texte source couvre plusieurs semaines ou plusieurs séances. Une seule ligne de titre libre.

[SEMAINE] <numéro> — optionnel, uniquement pertinent pour un texte source multi-semaines (ex. "[SEMAINE] 1").

[SEANCE] <nom> | <durée> | <jour> — une ligne par séance. Trois champs séparés par des barres verticales : nom libre de la séance, durée (ex. "40 min"), jour (ex. "LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"). Si le texte source ne couvre qu'une seule séance, mets quand même cette ligne en tête si un nom/durée/jour est identifiable dans le texte source ; sinon commence directement par [BLOC].

[BLOC] <nom libre> | <durée> — chaque bloc commence par cette ligne d'en-tête. Le nom du bloc doit être un mot-clé reconnaissable parmi : Échauffement, Force, Hypertrophie, Cardio, Core, Pliométrie, Technique, Retour au calme, Mobilité, Activation. Choisis celui qui correspond le mieux au contenu du bloc ; si aucun ne correspond clairement, utilise "Force". La durée est optionnelle (ex. "| 20min").

Chaque ligne d'exercice suit exactement ce format à 5 champs, séparés par des barres verticales :
Exercice | prescription | repos | note | lien vidéo

- "Exercice" : le nom de l'exercice.
- "prescription" : la charge de travail en texte libre — séries × répétitions ("4x8", "3x10-12"), séries × durée ("3x45s"), et/ou tempo, et/ou charge, regroupés dans ce même champ si le texte source les mentionne ensemble (ex. "4 × 8 · tempo 3-1-1", "4x6 @80kg"). N'invente rien qui ne soit pas dans le texte source.
- "repos" (optionnel) : ex. "90s", "2min".
- "note" (optionnel) : toute indication technique, RPE, consigne du coach — texte libre.
- "lien vidéo" (optionnel) : uniquement si une URL (http:// ou https://) est présente dans le texte source pour cet exercice. Ne mets JAMAIS d'URL dans le champ "note" — une URL va toujours dans ce dernier champ, seule. N'invente jamais de lien.

Laisse un champ vide (juste les barres verticales qui se suivent) quand une information est absente — ne le supprime pas et ne décale pas les champs suivants.

> ligne de note libre — une ligne commençant par "> " juste après une ligne [SEANCE] ou après une ligne d'exercice pour capturer une remarque du coach qui n'appartient pas à un champ structuré (ex. une consigne générale de séance). N'en invente pas ; n'utilise ce format que si le texte source contient une remarque libre qui ne rentre dans aucun champ ci-dessus.

Si un bloc ou une séance du texte source est explicitement désigné comme un test (ex. "test 1RM", "séance test", "test de force max"), termine sa ligne [BLOC] ou [SEANCE] par le champ "test" (ex. "[BLOC] Test 1RM | test").

EXEMPLE D'ENTRÉE :
Séance jambes, 40 min, lundi. Focus : intention maximale sur chaque saut.
Échauffement 8 min : mobilité chevilles 2x10/côté
Pliométrie 20 min :
Box jump 4x5, repos 90s, réception silencieuse, https://youtu.be/exemple
Sprint 10m 4x1 repos 90s

EXEMPLE DE SORTIE :
[SEANCE] Séance jambes | 40 min | LUN
> Focus : intention maximale sur chaque saut.

[BLOC] Échauffement | 8min
Mobilité chevilles | 2x10/côté | | |

[BLOC] Pliométrie | 20min
Box jump | 4x5 | 90s | réception silencieuse | https://youtu.be/exemple
Sprint 10m | 4x1 | 90s | |

Règles :
- Ne rajoute jamais un exercice, une série, une charge ou un lien vidéo qui n'est pas mentionné dans le texte source.
- Si une durée de bloc n'est pas précisée, estime une valeur raisonnable (10-15 pour un échauffement, 20-40 pour le corps de séance).
- Si le texte source contient plusieurs séances distinctes (plusieurs entraînements pour des jours différents), convertis-les TOUTES, chacune avec sa propre ligne [SEANCE], à la suite les unes des autres. N'en ignore aucune.
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
