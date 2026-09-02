"use client";

import { useState } from "react";
import type { GenerateRequestBody, GenerateResult, Language, Tone } from "@/lib/types";

const EXAMPLE: GenerateRequestBody = {
  description:
    "AYA est une gamme de cosmétiques naturels inspirés du patrimoine berbère marocain : huile d'argan pure, savon noir traditionnel et masques à l'argile ghassoul. Fabrication artisanale, ingrédients bruts et traçables, packaging minimaliste.",
  audience: "Femmes 25-45 ans en Europe, sensibles au naturel et à l'origine des produits",
  tone: "premium",
  language: "fr",
};

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildFullMarkdown(result: GenerateResult): string {
  return `${result.landing_markdown}

---

## Kit de contenu

### Slogans

${result.content_kit.slogans.map((s) => `- ${s}`).join("\n")}

### Post LinkedIn

${result.content_kit.linkedin_post}

### Email de lancement

${result.content_kit.launch_email}
`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silencieux : échec de copie non bloquant pour l'UX
    }
  }

  return (
    <button type="button" className="ghost" onClick={handleCopy}>
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<Tone>("pro");
  const [language, setLanguage] = useState<Language>("fr");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  function loadExample() {
    setDescription(EXAMPLE.description);
    setAudience(EXAMPLE.audience);
    setTone(EXAMPLE.tone);
    setLanguage(EXAMPLE.language);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (description.trim().length < 20) {
      setError("La description doit contenir au moins 20 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, audience, tone, language } as GenerateRequestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      setResult(data as GenerateResult);
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <h1>Pitch2Site</h1>
        <p>Décris ton produit. Obtiens une landing page et un kit de contenu, prêts à l'emploi.</p>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="description">Description du produit / service</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="Ex : Une app qui aide les indépendants à générer leurs factures en 30 secondes..."
            required
          />
        </div>

        <div className="field">
          <label htmlFor="audience">Audience cible (optionnel)</label>
          <input
            id="audience"
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            maxLength={200}
            placeholder="Ex : Freelances et petites agences en France"
          />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="tone">Ton</label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
              <option value="pro">Professionnel</option>
              <option value="fun">Fun</option>
              <option value="premium">Premium</option>
              <option value="direct">Direct</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="language">Langue de sortie</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="nl">Néerlandais</option>
            </select>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Génération en cours..." : "Générer"}
          </button>
          <button type="button" className="secondary" onClick={loadExample} disabled={loading}>
            Charger un exemple
          </button>
        </div>
      </form>

      {result && (
        <div className="card">
          <div className="actions" style={{ marginBottom: 24 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => downloadMarkdown("pitch2site-resultat.md", buildFullMarkdown(result))}
            >
              Télécharger tout (.md)
            </button>
            <CopyButton text={buildFullMarkdown(result)} />
          </div>

          <div className="result-section">
            <div className="result-section-header">
              <h2>Landing page</h2>
              <CopyButton text={result.landing_markdown} />
            </div>
            <pre className="content-block">{result.landing_markdown}</pre>
          </div>

          <div className="result-section">
            <div className="result-section-header">
              <h2>Slogans</h2>
              <CopyButton text={result.content_kit.slogans.join("\n")} />
            </div>
            <ul className="slogans">
              {result.content_kit.slogans.map((slogan, i) => (
                <li key={i}>{slogan}</li>
              ))}
            </ul>
          </div>

          <div className="result-section">
            <div className="result-section-header">
              <h2>Post LinkedIn</h2>
              <CopyButton text={result.content_kit.linkedin_post} />
            </div>
            <pre className="content-block">{result.content_kit.linkedin_post}</pre>
          </div>

          <div className="result-section">
            <div className="result-section-header">
              <h2>Email de lancement</h2>
              <CopyButton text={result.content_kit.launch_email} />
            </div>
            <pre className="content-block">{result.content_kit.launch_email}</pre>
          </div>
        </div>
      )}

      <footer>Pitch2Site — MVP · propulsé par l'API Anthropic</footer>
    </div>
  );
}
