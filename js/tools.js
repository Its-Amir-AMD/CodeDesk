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
export function jsonTree(value, key = "root") {
  if (value === null) return `<div class="tree-n"><b>${key}</b>: <i>null</i></div>`;
  if (typeof value !== "object") {
    const cls = typeof value === "string" ? "tok-str" : typeof value === "number" ? "tok-num" : "tok-kw";
    const shown = typeof value === "string" ? JSON.stringify(value) : String(value);
    return `<div class="tree-n"><b>${key}</b>: <span class="${cls}">${shown}</span></div>`;
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  return `<details open class="tree-n"><summary><b>${key}</b> ${Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`}</summary>${entries
    .map(([k, v]) => jsonTree(v, k))
    .join("")}</details>`;
}

function inferTs(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? inferTs(v[0]) + "[]" : "unknown[]";
  if (typeof v === "object") {
    const body = Object.entries(v)
      .map(([k, val]) => `  ${k}: ${inferTs(val)};`)
      .join("\n");
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
    if (Array.isArray(x)) {
      return "[\n" + x.map((i) => sp + "  " + conv(i, pad + 1)).join(",\n") + "\n" + sp + "]";
    }
    const body = Object.entries(x)
      .map(([k, val]) => `${sp}  ${JSON.stringify(k)} => ${conv(val, pad + 1)}`)
      .join(",\n");
    return "[\n" + body + "\n" + sp + "]";
  };
  return "<?php\n$data = " + conv(v) + ";\n";
}
export function jsonToJava(text, name = "Root") {
  const v = JSON.parse(text);
  const fields = Object.entries(typeof v === "object" && v && !Array.isArray(v) ? v : { value: v })
    .map(([k, val]) => {
      const t = typeof val === "number" ? "double" : typeof val === "boolean" ? "boolean" : "String";
      return `  public ${t} ${k};`;
    })
    .join("\n");
  return `public class ${name} {\n${fields}\n}`;
}

export function formatSql(sql) {
  const kws = [
    "select",
    "from",
    "where",
    "inner join",
    "left join",
    "right join",
    "group by",
    "order by",
    "limit",
    "insert into",
    "values",
    "update",
    "set",
    "delete from",
    "create table",
  ];
  let s = sql.replace(/\s+/g, " ").trim();
  kws.forEach((k) => {
    const re = new RegExp("\\b" + k + "\\b", "gi");
    s = s.replace(re, "\n" + k.toUpperCase());
  });
  return s.replace(/^\n/, "").replace(/,\s*/g, ",\n  ");
}
export function minifySql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}
export function validateSql(sql) {
  const t = sql.trim();
  if (!t) throw new Error("Empty query");
  if (!/^(select|insert|update|delete|create|alter|with|drop|show|explain)\b/i.test(t)) {
    throw new Error("Query should start with a SQL keyword");
  }
  const opens = (t.match(/\(/g) || []).length;
  const closes = (t.match(/\)/g) || []).length;
  if (opens !== closes) throw new Error("Unbalanced parentheses");
  return true;
}
export function jsonToSql(text, table = "items") {
  const v = JSON.parse(text);
  const rows = Array.isArray(v) ? v : [v];
  if (!rows.length || typeof rows[0] !== "object") throw new Error("Expected object or array of objects");
  const cols = Object.keys(rows[0]);
  const create =
    `CREATE TABLE ${table} (\n` +
    cols
      .map((c) => {
        const sample = rows[0][c];
        const typ = typeof sample === "number" ? "INT" : typeof sample === "boolean" ? "BOOLEAN" : "TEXT";
        return `  ${c} ${typ}`;
      })
      .join(",\n") +
    "\n);";
  const inserts = rows
    .map((r) => {
      const vals = cols.map((c) => (typeof r[c] === "number" ? r[c] : `'${String(r[c]).replace(/'/g, "''")}'`)).join(", ");
      return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals});`;
    })
    .join("\n");
  return create + "\n\n" + inserts;
}
export function tableSql(name, colsText) {
  const cols = colsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!cols.length) throw new Error("Add columns, comma separated");
  return (
    `CREATE TABLE ${name} (\n  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n` +
    cols.map((c) => `  ${c} VARCHAR(255) NULL`).join(",\n") +
    ",\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);"
  );
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
  const highlighted = input.replace(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"), (s) => `{{{M}}}${s}{{{/M}}}`);
  const replaced = replace !== undefined ? input.replace(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"), replace) : "";
  return { matches, highlighted, replaced };
}

export function renderMarkdown(src) {
  const esc = (s) => s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inCode = false;
  let inTable = false;
  let listType = null;
  const flushList = () => {
    if (listType) {
      html += listType === "ul" ? "</ul>" : "</ol>";
      listType = null;
    }
  };
  for (let line of lines) {
    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        html += "</code></pre>";
        inCode = false;
      } else {
        html += "<pre><code>";
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += esc(line) + "\n";
      continue;
    }
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (/^\s*[-:]+/.test(cells.join(""))) {
        continue;
      }
      if (!inTable) {
        html += "<table><thead>";
        html += "<tr>" + cells.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
        inTable = true;
      } else {
        html += "<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      }
      continue;
    } else if (inTable) {
      html += "</tbody></table>";
      inTable = false;
    }
    if (/^### /.test(line)) {
      flushList();
      html += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (/^## /.test(line)) {
      flushList();
      html += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (/^# /.test(line)) {
      flushList();
      html += `<h1>${inline(line.slice(2))}</h1>`;
    } else if (/^> /.test(line)) {
      flushList();
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
    } else if (/^[-*] /.test(line)) {
      if (listType !== "ul") {
        flushList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else if (/^\d+\. /.test(line)) {
      if (listType !== "ol") {
        flushList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`;
    } else if (!line.trim()) {
      flushList();
      html += "";
    } else {
      flushList();
      html += `<p>${inline(line)}</p>`;
    }
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
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }
}

export function diffLines(a, b) {
  const A = a.split("\n");
  const B = b.split("\n");
  const m = A.length;
  const n = B.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0,
    j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      out.push({ t: "eq", v: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ t: "del", v: A[i++] });
    } else {
      out.push({ t: "add", v: B[j++] });
    }
  }
  while (i < m) out.push({ t: "del", v: A[i++] });
  while (j < n) out.push({ t: "add", v: B[j++] });
  return out;
}

export const encoders = {
  b64e: (s) => btoa(unescape(encodeURIComponent(s))),
  b64d: (s) => decodeURIComponent(escape(atob(s))),
  urle: (s) => encodeURIComponent(s),
  urld: (s) => decodeURIComponent(s),
  htmle: (s) => {
    const amp = String.fromCharCode(38);
    return s
      .split(amp).join(amp + "amp;")
      .split("<").join(amp + "lt;")
      .split(">").join(amp + "gt;")
      .split('"').join(amp + "quot;");
  },
  htmld: (s) => {
    const amp = String.fromCharCode(38);
    return s
      .split(amp + "quot;").join('"')
      .split(amp + "lt;").join("<")
      .split(amp + "gt;").join(">")
      .split(amp + "amp;").join(amp);
  },
};

export function randomString(len = 16, alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  let o = "";
  const arr = crypto.getRandomValues(new Uint32Array(len));
  for (let i = 0; i < len; i++) o += alphabet[arr[i] % alphabet.length];
  return o;
}

export const lorem =
  "CodeDesk gives developers a calm workspace for projects, snippets, APIs and notes. Build faster without switching between a dozen tabs. Format JSON, test regex, compare diffs, and keep environment variables next to the tasks that actually ship.";
