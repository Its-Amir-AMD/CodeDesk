export function formatJson(text) {
  const v = JSON.parse(text);
  return JSON.stringify(v, null, 2);
}
export function minifyJson(text) {
  return JSON.stringify(JSON.parse(text));
}
export function validateJson(text) {
  JSON.parse(text);
  return true;
}

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function jsonTree(value, key = "root") {
  const safeKey = htmlEscape(key);
  if (value === null) return `<div class="tree-n"><b>${safeKey}</b>: <i>null</i></div>`;
  if (typeof value !== "object") {
    const cls = typeof value === "string" ? "tok-str" : typeof value === "number" ? "tok-num" : "tok-kw";
    const shown = typeof value === "string" ? JSON.stringify(value) : String(value);
    return `<div class="tree-n"><b>${safeKey}</b>: <span class="${cls}">${htmlEscape(shown)}</span></div>`;
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  return `<details open class="tree-n"><summary><b>${safeKey}</b> ${Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`}</summary>${entries.map(([k, v]) => jsonTree(v, k)).join("")}</details>`;
}

function inferTs(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? inferTs(v[0]) + "[]" : "unknown[]";
  if (typeof v === "object") {
    const body = Object.entries(v).map(([k, val]) => `  ${k}: ${inferTs(val)};`).join("\n");
    return `{\n${body}\n}`;
  }
  return typeof v;
}

export function jsonToTs(text, name = "Root") {
  const v = JSON.parse(text);
  return `export interface ${name} ${inferTs(v)}`;
}
export function jsonToJs(text) {
  const v = JSON.parse(text);
  return `export const data = ${JSON.stringify(v, null, 2)};`;
}
export function jsonToPhp(text) {
  const v = JSON.parse(text);
  const conv = (x, pad = 0) => {
    const sp = "  ".repeat(pad);
    if (x === null) return "null";
    if (typeof x === "string") return JSON.stringify(x);
    if (typeof x === "number" || typeof x === "boolean") return String(x);
    if (Array.isArray(x)) return "[\n" + x.map((i) => sp + "  " + conv(i, pad + 1)).join(",\n") + "\n" + sp + "]";
    const body = Object.entries(x).map(([k, val]) => `${sp}  ${JSON.stringify(k)} => ${conv(val, pad + 1)}`).join(",\n");
    return "[\n" + body + "\n" + sp + "]";
  };
  return "<?php\n$data = " + conv(v) + ";\n";
}
export function jsonToJava(text, name = "Root") {
  const v = JSON.parse(text);
  const fields = Object.entries(typeof v === "object" && v && !Array.isArray(v) ? v : { value: v }).map(([k, val]) => {
    const t = typeof val === "number" ? "double" : typeof val === "boolean" ? "boolean" : "String";
    return `  public ${t} ${k};`;
  }).join("\n");
  return `public class ${name} {\n${fields}\n}`;
}

export function formatSql(sql) {
  const kws = ["select", "from", "where", "inner join", "left join", "right join", "group by", "order by", "limit", "insert into", "values", "update", "set", "delete from", "create table"];
  let s = sql.replace(/\s+/g, " ").trim();
  kws.forEach((k) => { s = s.replace(new RegExp("\\b" + k + "\\b", "gi"), "\n" + k.toUpperCase()); });
  return s.replace(/^\n/, "").replace(/,\s*/g, ",\n  ");
}
export function minifySql(sql) { return sql.replace(/\s+/g, " ").trim(); }
export function validateSql(sql) {
  const t = sql.trim();
  if (!t) throw new Error("Empty query");
  if (!/^(select|insert|update|delete|create|alter|with|drop|show|explain)\b/i.test(t)) throw new Error("Query should start with a SQL keyword");
  if ((t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length) throw new Error("Unbalanced parentheses");
  return true;
}
export function jsonToSql(text, table = "items") {
  const v = JSON.parse(text);
  const rows = Array.isArray(v) ? v : [v];
  if (!rows.length || !rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) throw new Error("Expected object or array of objects");
  const cols = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const quote = (value) => value === null ? "NULL" : typeof value === "number" || typeof value === "boolean" ? String(value) : `'${String(value ?? "").replaceAll("'", "''")}'`;
  const create = `CREATE TABLE ${table} (\n` + cols.map((c) => `  ${c} ${typeof rows.find((r) => r[c] !== undefined)?.[c] === "number" ? "INT" : "TEXT"}`).join(",\n") + "\n);";
  const inserts = rows.map((r) => `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => quote(r[c])).join(", ")});`).join("\n");
  return create + "\n\n" + inserts;
}
export function tableSql(name, colsText) {
  const safeName = String(name || "items").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(safeName)) throw new Error("Invalid table name");
  const cols = colsText.split(",").map((s) => s.trim()).filter(Boolean);
  if (!cols.length || cols.some((c) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(c))) throw new Error("Use valid comma-separated column names");
  return `CREATE TABLE ${safeName} (\n  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n${cols.map((c) => `  ${c} VARCHAR(255) NULL`).join(",\n")},\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`;
}

export function runRegex(pattern, flags, input, replace) {
  const re = new RegExp(pattern, flags);
  const matches = [];
  if (flags.includes("g")) {
    let m;
    const clone = new RegExp(pattern, flags);
    while ((m = clone.exec(input))) {
      matches.push({ text: m[0], index: m.index, groups: m.slice(1) });
      if (m[0] === "") clone.lastIndex++;
    }
  } else {
    const m = input.match(re);
    if (m) matches.push({ text: m[0], index: m.index, groups: m.slice(1) });
  }
  const renderRe = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  const highlighted = input.replace(renderRe, (s) => `{{{M}}}${s}{{{/M}}}`);
  const replaced = replace !== undefined ? input.replace(renderRe, replace) : "";
  return { matches, highlighted, replaced };
}

export function renderMarkdown(src) {
  const esc = htmlEscape;
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inCode = false;
  let inTable = false;
  let listType = null;
  const flushList = () => { if (listType) { html += listType === "ul" ? "</ul>" : "</ol>"; listType = null; } };
  for (const line of lines) {
    if (line.startsWith("```")) { flushList(); if (inCode) { html += "</code></pre>"; inCode = false; } else { html += "<pre><code>"; inCode = true; } continue; }
    if (inCode) { html += esc(line) + "\n"; continue; }
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (/^\s*[-:]+/.test(cells.join(""))) continue;
      if (!inTable) { html += "<table><thead><tr>" + cells.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>"; inTable = true; }
      else html += "<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      continue;
    } else if (inTable) { html += "</tbody></table>"; inTable = false; }
    if (/^### /.test(line)) { flushList(); html += `<h3>${inline(line.slice(4))}</h3>`; }
    else if (/^## /.test(line)) { flushList(); html += `<h2>${inline(line.slice(3))}</h2>`; }
    else if (/^# /.test(line)) { flushList(); html += `<h1>${inline(line.slice(2))}</h1>`; }
    else if (/^> /.test(line)) { flushList(); html += `<blockquote>${inline(line.slice(2))}</blockquote>`; }
    else if (/^[-*] /.test(line)) { if (listType !== "ul") { flushList(); html += "<ul>"; listType = "ul"; } html += `<li>${inline(line.slice(2))}</li>`; }
    else if (/^\d+\. /.test(line)) { if (listType !== "ol") { flushList(); html += "<ol>"; listType = "ol"; } html += `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`; }
    else if (!line.trim()) { flushList(); }
    else { flushList(); html += `<p>${inline(line)}</p>`; }
  }
  flushList();
  if (inTable) html += "</tbody></table>";
  if (inCode) html += "</code></pre>";
  return html;

  function inline(t) {
    return esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
}
