import type { GenerateRequestBody } from "./types";

/**
 * Instruction système envoyée à Claude.
 * Exige une sortie JSON strict, sans aucun texte hors JSON,
 * pour permettre un parsing fiable côté serveur.
 */
export function buildSystemPrompt(): string {
  return `Tu es un copywriter et stratège marketing senior, spécialisé dans les landing pages et le contenu de lancement produit.

Tu dois répondre UNIQUEMENT avec un objet JSON strictement valide, et RIEN d'autre :
- Pas de texte avant ou après le JSON.
- Pas de balises markdown (pas de \`\`\`json, pas de \`\`\`).
- Pas de commentaires.
- Le JSON doit être directement parsable par JSON.parse().

Le JSON doit respecter exactement ce schéma :

{
  "landing_markdown": string, // Contenu markdown complet de la landing page, avec ces sections en titres H2 : "## Hero", "## Problème", "## Solution", "## Bénéfices", "## Comment ça marche", "## Pricing", "## FAQ", "## CTA"
  "content_kit": {
    "slogans": string[], // exactement 5 slogans courts et percutants
    "linkedin_post": string, // 1 post LinkedIn complet, prêt à publier
    "launch_email": string // 1 email de lancement complet, avec objet et corps
  }
}

Règles de contenu :
- Adapte le ton, le vocabulaire et les exemples à l'audience et au ton demandés.
- Reste concret : bénéfices clairs, pas de blabla générique.
- La section Pricing peut proposer une structure d'offre plausible si aucune information tarifaire n'est fournie (indique que ce sont des exemples de paliers).
- La FAQ doit contenir entre 4 et 6 questions/réponses réalistes.
- Écris tout le contenu (landing_markdown et content_kit) dans la langue demandée.
- Ne jamais sortir du format JSON demandé, même si la description utilisateur est incomplète ou étrange : fais des hypothèses raisonnables et continue.`;
}

export function buildUserPrompt(input: GenerateRequestBody): string {
  const languageLabel =
    input.language === "fr" ? "français" : input.language === "nl" ? "néerlandais" : "anglais";

  return `Génère la landing page et le kit de contenu pour le produit/service suivant.

Description du produit/service :
"""
${input.description}
"""

Audience cible : ${input.audience || "non précisée, déduis-la du contexte"}
Ton souhaité : ${input.tone}
Langue de sortie : ${languageLabel} (${input.language})

Réponds uniquement avec le JSON demandé, dans la langue "${languageLabel}".`;
}
