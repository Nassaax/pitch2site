# Pitch2Site

MVP d'une web app qui génère, à partir de la description d'un produit ou service :

1. Une **landing page** structurée (Hero, Problème, Solution, Bénéfices, Comment ça marche, Pricing, FAQ, CTA), au format markdown.
2. Un **kit de contenu** : 5 slogans, 1 post LinkedIn, 1 email de lancement.

Stack : Next.js 14 (App Router) + TypeScript, appel serveur à l'API Anthropic (Claude), sans authentification ni base de données.

## Arborescence

```
pitch2site/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts       # Route serveur qui appelle l'API Anthropic
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Formulaire + affichage des résultats
├── lib/
│   ├── prompts.ts               # Prompt système + prompt utilisateur
│   ├── ratelimit.ts             # Rate limiting en mémoire (1 req / 10s / IP)
│   └── types.ts
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

Prérequis : Node.js 18.18+ (ou 20+), npm.

```bash
git clone <url-de-ton-repo> pitch2site
cd pitch2site
npm install
```

## Variables d'environnement

Copie le fichier d'exemple et renseigne ta clé Anthropic :

```bash
cp .env.example .env.local
```

Contenu de `.env.local` :

| Variable            | Obligatoire | Description                                                                 |
|---------------------|-------------|-------------------------------------------------------------------------------|
| `ANTHROPIC_API_KEY` | Oui         | Clé API Anthropic (console.anthropic.com). Ne jamais la commiter ni l'exposer côté client. |
| `ANTHROPIC_MODEL`   | Non         | Modèle Anthropic à utiliser. Par défaut : `claude-sonnet-5`.                   |

La clé n'est utilisée que dans `app/api/generate/route.ts`, côté serveur (`runtime = "nodejs"`). Elle n'est jamais envoyée au navigateur.

## Lancement en local

```bash
npm run dev
```

L'app est disponible sur [http://localhost:3000](http://localhost:3000).

## Build de production (test local)

```bash
npm run build
npm run start
```

## Déploiement sur Vercel

1. Pousse le projet sur un repo GitHub.
2. Sur [vercel.com](https://vercel.com), clique sur **New Project** et importe le repo.
3. Vercel détecte automatiquement Next.js — aucune configuration de build spécifique n'est nécessaire (`next build` par défaut).
4. Dans **Settings → Environment Variables**, ajoute :
   - `ANTHROPIC_API_KEY` = ta clé Anthropic (Production, Preview, et Development si besoin)
   - `ANTHROPIC_MODEL` = `claude-sonnet-5` (optionnel)
5. Clique sur **Deploy**.
6. Une fois déployé, l'URL fournie par Vercel expose directement l'app. La route `/api/generate` tourne en fonction serverless Node.js.

### Redéploiement après changement de variables d'environnement

Si tu modifies une variable d'environnement après un premier déploiement, redéclenche un déploiement (**Deployments → ⋯ → Redeploy**) pour qu'elle soit prise en compte.

## Fonctionnement

- L'utilisateur remplit le formulaire (`description`, `audience`, `tone`, `language`) sur `app/page.tsx`.
- Le formulaire appelle `POST /api/generate`.
- La route serveur (`app/api/generate/route.ts`) :
  1. Vérifie le rate limit (1 requête / 10 secondes par IP, en mémoire — voir limitation ci-dessous).
  2. Valide le corps de la requête (longueurs, valeurs autorisées pour `tone`/`language`).
  3. Construit un prompt système strict (voir `lib/prompts.ts`) demandant une sortie JSON pur.
  4. Appelle l'API Anthropic via le SDK officiel `@anthropic-ai/sdk`.
  5. Parse et valide le JSON renvoyé, puis le retourne au client.
- Le client affiche la landing page et le kit de contenu, avec des boutons **Copier** (par section et global) et **Télécharger tout (.md)**.

## Limitation connue : rate limiting

Le rate limiting est implémenté en mémoire (`Map` côté processus). Sur Vercel, les fonctions serverless peuvent tourner sur plusieurs instances et être recyclées à tout moment : cette protection est donc **best-effort**, utile contre les appels rapprochés involontaires (double-clic, spam léger), mais **ne constitue pas une garantie stricte** à l'échelle globale. Pour une protection robuste en production, prévoir un store partagé (ex. Vercel KV / Upstash Redis).

## Prochaines évolutions possibles (hors MVP)

- Rendu markdown → HTML stylé pour la landing page (au lieu de texte brut).
- Historique des générations (nécessiterait une base de données).
- Authentification et quotas par utilisateur.
- Rate limiting distribué (Redis).
