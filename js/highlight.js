import { escapeHtml } from "./utils.js";

const KW = {
  JavaScript:
    "const let var function return if else for while class new async await import export default try catch throw of in",
  PHP: "function return if else foreach for while class public private protected new echo array isset empty try catch throw use namespace",
  Python: "def return if elif else for while class import from as try except raise with lambda True False None",
  Java: "public private protected class static void return if else for while new try catch throw import package",
  SQL: "select from where insert into values update set delete create table primary key not null and or join left right inner",
  CSS: "display flex grid position color background border margin padding font width height",
  HTML: "",
  JSON: "true false null",
};

export function highlight(code, lang = "JavaScript") {
  let s = escapeHtml(code);
  s = s.replace(/(\/\/.*?$|#.*?$)/gm, '<span class="tok-cm">$1</span>');
  s = s.replace(/(".*?"|'[^']*'|`[^`]*`)/g, '<span class="tok-str">$1</span>');
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  const words = (KW[lang] || KW.JavaScript).split(/\s+/).filter(Boolean);
  if (words.length) {
    const re = new RegExp(`\\b(${words.join("|")})\\b`, "gi");
    s = s.replace(re, '<span class="tok-kw">$1</span>');
  }
  s = s.replace(/\b([A-Za-z_][\w]*)\s*(?=\()/g, '<span class="tok-fn">$1</span>');
  return s;
}
