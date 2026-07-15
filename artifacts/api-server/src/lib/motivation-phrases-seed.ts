// Default French motivation-phrase bank. Used to (1) seed every coach's
// motivation_phrases table row on first migration and (2) as a last-resort
// fallback if a coach's bank is empty (e.g. they deleted every phrase),
// so the morning notification never has nothing to say.
export const DEFAULT_MOTIVATION_PHRASES = [
  "Chaque répétition te rapproche de la meilleure version de toi-même.",
  "La discipline d'aujourd'hui est la performance de demain.",
  "Le corps atteint ce que l'esprit croit possible.",
  "Pas de raccourci — juste du travail bien fait.",
  "Tu es plus fort(e) que tu ne le penses. Prouve-le aujourd'hui.",
  "La régularité bat le talent qui ne travaille pas.",
  "Chaque effort compte, même les petits.",
  "Tu n'as pas à être parfait(e), tu dois juste avancer.",
  "La douleur d'aujourd'hui est ta force de demain.",
  "Un pas à la fois. C'est comme ça que les grandes choses se font.",
  "Fais confiance au processus. Les résultats viennent avec le temps.",
  "L'excellence n'est pas un acte, c'est une habitude.",
  "Tes limites sont là pour être repoussées.",
  "Entraîne-toi dur, récupère bien, recommence.",
  "Le seul mauvais entraînement est celui qu'on n'a pas fait.",
  "Sois la version la plus forte de toi-même, chaque jour.",
  "Le succès est la somme de petits efforts répétés chaque jour.",
  "Crois en toi. Tu as déjà surmonté des choses plus difficiles.",
  "Donne le meilleur de toi-même et laisse l'entraînement faire le reste.",
  "Progresse à ton rythme — mais ne t'arrête jamais.",
];
