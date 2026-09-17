import { Icon } from "./icons.js";
import { t } from "./i18n.js";

const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function toast(type, title, message) {
  const root = document.getElementById("toasts");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast toast-${esc(type)}`;
  const strong = document.createElement("strong");
  strong.textContent = title || "";
  const p = document.createElement("p");
  p.textContent = message || "";
  el.append(strong, p);
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function openModal({ title, body, onSubmit, submitLabel }) {
  const root = document.getElementById("modal-root");
  if (!root) return;
  root.classList.add("is-open");
  root.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="spread" style="margin-bottom:14px">
        <h3 id="modal-title">${esc(title)}</h3>
        <button class="icon-btn" data-close aria-label="Close">${Icon.close}</button>
      </div>
      <form id="modal-form" class="stack">${body}
        <div class="row" style="justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-ghost" data-close></button>
          <button class="btn btn-primary" type="submit">${esc(submitLabel || "OK")}</button>
        </div>
      </form>
    </div>`;
  const cancel = root.querySelector(".btn-ghost");
  cancel.textContent = document.documentElement.lang === "fa" ? "لغو" : "Cancel";
  const close = () => { root.classList.remove("is-open"); root.innerHTML = ""; };
  root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  root.querySelector("#modal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    onSubmit(data, close);
  });
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    openModal({
      title: document.documentElement.lang === "fa" ? "تأیید" : "Confirm",
      submitLabel: document.documentElement.lang === "fa" ? "حذف" : "Delete",
      body: `<p>${esc(message)}</p>`,
      onSubmit(_, close) { close(); resolve(true); },
    });
  });
}

export function commandItems(lang) {
  return [
    { id: "dashboard", label: t(lang, "dashboard"), hint: "G" },
    { id: "projects", label: t(lang, "projects"), hint: "P" },
    { id: "new-project", label: t(lang, "newProject"), hint: "N" },
    { id: "snippets", label: t(lang, "snippets") },
    { id: "new-snippet", label: t(lang, "newSnippet") },
    { id: "api", label: t(lang, "apiLab") },
    { id: "json", label: t(lang, "jsonTools") },
    { id: "sql", label: t(lang, "sqlTools") },
    { id: "regex", label: t(lang, "regexLab") },
    { id: "diff", label: t(lang, "codeDiff") },
    { id: "generators", label: "Generate UUID" },
    { id: "settings", label: t(lang, "settings") },
    { id: "search", label: t(lang, "search") },
  ];
}

export function openCommand(lang, onPick) {
  const root = document.getElementById("cmd-root");
  const items = commandItems(lang);
  let active = 0;
  let filter = "";
  const render = () => {
    const q = filter.toLowerCase();
    const list = items.filter((i) => i.label.toLowerCase().includes(q));
    if (active >= list.length) active = Math.max(0, list.length - 1);
    root.classList.add("is-open");
    root.innerHTML = `<div class="modal-backdrop" data-close></div><div class="cmd" role="dialog" aria-modal="true"><input id="cmd-input" aria-label="${esc(t(lang, "command"))}" placeholder="${esc(t(lang, "command"))}..." /><div class="cmd-list">${list.map((i, idx) => `<button class="cmd-item ${idx === active ? "is-active" : ""}" data-id="${esc(i.id)}"><span>${esc(i.label)}</span><span class="hint">${esc(i.hint || "")}</span></button>`).join("") || `<div class="empty">${esc(t(lang, "empty"))}</div>`}</div></div>`;
    const input = root.querySelector("#cmd-input");
    input.value = filter;
    input.focus();
    input.addEventListener("input", () => { filter = input.value; render(); });
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelectorAll(".cmd-item").forEach((el) => el.addEventListener("click", () => { onPick(el.dataset.id); close(); }));
    input.addEventListener("keydown", (e) => {
      const listNow = items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()));
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(Math.max(0, listNow.length - 1), active + 1); render(); }
      if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      if (e.key === "Enter") { e.preventDefault(); if (listNow[active]) { onPick(listNow[active].id); close(); } }
      if (e.key === "Escape") close();
    });
  };
  const close = () => { root.classList.remove("is-open"); root.innerHTML = ""; };
  render();
}
