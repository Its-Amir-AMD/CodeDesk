export const uid = (p = "id") => {
  const suffix = crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${p}-${suffix}`;
};

export const qs = (s, el = document) => el.querySelector(s);
export const qsa = (s, el = document) => [...el.querySelectorAll(s)];

export const escapeHtml = (str = "") => {
  const value = String(str);
  const amp = String.fromCharCode(38);
  return value
    .split(amp).join(amp + "amp;")
    .split("<").join(amp + "lt;")
    .split(">").join(amp + "gt;")
    .split('"').join(amp + "quot;")
    .split("'").join(amp + "#39;");
};

export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text ?? ""));
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = String(text ?? "");
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function download(name, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = String(name || "download.txt");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function fmtDate(d) {
  if (!d) return "—";
  return d;
}

export function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function hashString(str, algo = "SHA-256") {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this context");
  return crypto.subtle.digest(algo, new TextEncoder().encode(String(str ?? ""))).then((buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function randomString(len = 16, alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  const n = Math.max(1, Math.min(1024, Number.parseInt(len, 10) || 16));
  const chars = String(alphabet || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  if (!chars.length) throw new Error("Alphabet cannot be empty");
  if (!globalThis.crypto?.getRandomValues) throw new Error("Secure random generator is unavailable");

  let out = "";
  const max = 0x100000000;
  const limit = Math.floor(max / chars.length) * chars.length;

  while (out.length < n) {
    const batch = new Uint32Array(Math.max(32, n - out.length));
    crypto.getRandomValues(batch);
    for (const value of batch) {
      if (value >= limit) continue;
      out += chars[value % chars.length];
      if (out.length >= n) break;
    }
  }
  return out;
}
