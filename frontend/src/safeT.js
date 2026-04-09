// safeT.js
// Wraps translation objects in a Proxy so missing keys return a visible
// fallback string instead of throwing "Cannot read property of undefined".
// Usage: import { safeT } from "./safeT"; then const t = safeT(rawT);

const MISSING = (path) => `[missing: ${path}]`;

export function safeT(obj, path = "") {
  if (obj === null || obj === undefined) {
    return MISSING(path || "?");
  }
  if (typeof obj === "function") return obj;
  if (typeof obj !== "object") return obj;

  return new Proxy(obj, {
    get(target, key) {
      if (key in target) {
        const val = target[key];
        const nextPath = path ? `${path}.${String(key)}` : String(key);
        if (val && typeof val === "object" && !Array.isArray(val)) {
          return safeT(val, nextPath);
        }
        return val;
      }
      const missing = MISSING(path ? `${path}.${String(key)}` : String(key));
      console.warn(`⚠️  i18n missing key: ${missing}`);
      return missing;
    },
  });
}