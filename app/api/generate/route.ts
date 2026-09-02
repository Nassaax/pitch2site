import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { getClientIp, isRateLimited } from "@/lib/ratelimit";
import type {
  GenerateRequestBody,
  GenerateResult,
  Language,
  Tone,
} from "@/lib/types";

export const runtime = "nodejs";

const VALID_TONES: Tone[] = ["pro", "fun", "premium", "direct"];
const VALID_LANGUAGES: Language[] = ["fr", "en", "nl"];

function validateBody(body: unknown): { ok: true; data: GenerateRequestBody } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Corps de requête invalide." };
  }

  const b = body as Record<string, unknown>;

  const description = b.description;
  if (typeof description !== "string" || description.trim().length < 20 || description.length > 2000) {
    return {
      ok: false,
      error: "Le champ 'description' doit faire entre 20 et 2000 caractères.",
    };
  }

  const audience = b.audience ?? "";
  if (typeof audience !== "string" || audience.length > 200) {
    return { ok: false, error: "Le champ 'audience' doit faire au maximum 200 caractères." };
  }

  const tone = b.tone;
  if (typeof tone !== "string" || tone.length > 50 || !VALID_TONES.includes(tone as Tone)) {
    return {
      ok: false,
      error: `Le champ 'tone' doit être l'une des valeurs : ${VALID_TONES.join(", ")}.`,
    };
  }

  const language = b.language;
  if (typeof language !== "string" || !VALID_LANGUAGES.includes(language as Language)) {
    return {
      ok: false,
      error: `Le champ 'language' doit être l'une des valeurs : ${VALID_LANGUAGES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      description: description.trim(),
      audience: (audience as string).trim(),
      tone: tone as Tone,
      language: language as Language,
    },
  };
}

function extractJson(rawText: string): unknown {
  let text = rawText.trim();

  // Filet de sécurité : au cas où le modèle ajoute des balises markdown
  // malgré l'instruction système.
  if (text.startsWith("```")) {
    text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(text);
}

function isValidResult(value: unknown): value is GenerateResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.landing_markdown !== "string") return false;
  if (typeof v.content_kit !== "object" || v.content_kit === null) return false;

  const kit = v.content_kit as Record<string, unknown>;
  if (!Array.isArray(kit.slogans) || !kit.slogans.every((s) => typeof s === "string")) return false;
  if (typeof kit.linkedin_post !== "string") return false;
  if (typeof kit.launch_email !== "string") return false;

  return true;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configuration serveur manquante (ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  const ip = getClientIp(req.headers);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de requêtes. Merci de patienter quelques secondes avant de réessayer." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON de requête invalide." }, { status: 400 });
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(validation.data),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Réponse inattendue du modèle (aucun contenu texte)." },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: "Le modèle n'a pas renvoyé un JSON valide. Merci de réessayer." },
        { status: 502 }
      );
    }

    if (!isValidResult(parsed)) {
      return NextResponse.json(
        { error: "La réponse du modèle ne respecte pas le format attendu." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    console.error("Erreur lors de l'appel à l'API Anthropic :", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération. Merci de réessayer dans un instant." },
      { status: 500 }
    );
  }
}
