/**
 * Rate limiter en mémoire, best-effort.
 *
 * Limitation connue : sur Vercel (fonctions serverless), chaque instance
 * a sa propre mémoire, et les instances peuvent être recyclées à tout
 * moment. Ce n'est donc pas une limite garantie à l'échelle globale,
 * mais une protection simple contre les appels rapprochés d'un même
 * client sur une même instance chaude. Suffisant pour un MVP.
 */

const WINDOW_MS = 10_000; // 1 requête toutes les 10 secondes par IP
const lastRequestByIp = new Map<string, number>();

// Évite une fuite mémoire si beaucoup d'IP différentes appellent l'API.
const MAX_ENTRIES = 5000;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (lastRequestByIp.size > MAX_ENTRIES) {
    for (const [key, timestamp] of lastRequestByIp) {
      if (now - timestamp > WINDOW_MS) {
        lastRequestByIp.delete(key);
      }
    }
  }

  const last = lastRequestByIp.get(ip);
  if (last !== undefined && now - last < WINDOW_MS) {
    return true;
  }

  lastRequestByIp.set(ip, now);
  return false;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
