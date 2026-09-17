import { Icon } from "./icons.js";
import { t } from "./i18n.js";
import { createStore } from "./store.js";
import { highlight } from "./highlight.js";
import {
  copyText,
  escapeHtml,
  uid,
  uuid,
  hashString,
  randomString,
  today,
} from "./utils.js";
import {
  formatJson,
  minifyJson,
  jsonTree,
  jsonToTs,
  jsonToJs,
  jsonToPhp,
  jsonToJava,
  formatSql,
  minifySql,
  validateSql,
  jsonToSql,
  tableSql,
  runRegex,
  renderMarkdown,
  diffLines,
  encoders,
  lorem,
} from "./tools.js";
import { toast, openModal, openCommand } from "./ui.js";

const NAV = [
  { group: "workspace", items: [
    ["dashboard", "grid", "dashboard"],
    ["projects", "folder", "projects"],
    ["snippets", "code", "snippets"],
    ["notes", "note", "notes"],
    ["terminal", "term", "terminal"],
  ]},
  { group: "tools", items: [
    ["api", "api", "apiLab"],
    ["json", "json", "jsonTools"],
    ["sql", "db", "sqlTools"],
    ["regex", "regex", "regexLab"],
    ["markdown", "md", "markdown"],
    ["diff", "diff", "codeDiff"],
    ["encoders", "lock", "encoders"],
    ["generators", "spark", "generators"],
  ]},
  { group: "system", items: [["settings", "gear", "settings"]] },
];

const SAMPLE_JSON = `{
  "orderId": 1842,
  "status": "paid",
  "customer": { "name": "Sara Nouri", "email": "sara@example.com" },
  "items": [
    { "sku": "TSHIRT-BLU", "qty": 2, "price": 24.5 }
  ]
}`;

const SAMPLE_SQL = `select id, email, name from users where created_at > '2026-01-01' order by id desc limit 20`;
const SAMPLE_MD = `# CodeDesk\n\nYour **Developer Workspace**.\n\n- Projects\n- Snippets\n- API Lab\n\n\`const x = 1\`\n\n> Ship from one desk.\n\n| Tool | Use |\n| --- | --- |\n| JSON | Format |\n| Regex | Test |\n`;

let store;
let seed;
let route = { name: "dashboard", params: {} };

function lang() {
  return store.get().settings.lang || "fa";
}
function tt(k) {
  return t(lang(), k);
}

function parseHash() {
  const h = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  const name = parts[0] || "dashboard";
  if (name === "projects" && parts[1]) {
    return { name: "project", params: { id: parts[1], tab: parts[2] || "overview" } };
  }
  if (name === "snippets" && parts[1]) return { name: "snippet", params: { id: parts[1] } };
  if (name === "notes" && parts[1]) return { name: "note", params: { id: parts[1] } };
  return { name, params: {} };
}

function go(path) {
  location.hash = "#/" + path.replace(/^#\/?/, "");
}

function applyChrome() {
  const s = store.get().settings;
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.accent = s.accent;
  document.documentElement.lang = s.lang;
  document.documentElement.dir = s.lang === "fa" ? "rtl" : "ltr";
}

function layout() {
  const L = lang();
  document.getElementById("app").innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand">${Icon.logo}<div><div class="brand-name">CodeDesk</div><span class="brand-tag">${tt("tagline")}</span></div></div>
      <nav class="nav">
        ${NAV.map((g) => `
          <div class="nav-label">${tt(g.group)}</div>
          ${g.items.map(([id, icon, key]) => `
            <button class="nav-item" data-nav="${id}">${Icon[icon]}<span>${tt(key)}</span></button>
          `).join("")}
        `).join("")}
      </nav>
      <div class="sidebar-foot">
        <button class="btn btn-outline" id="theme-toggle" style="flex:1">${store.get().settings.theme === "dark" ? Icon.sun : Icon.moon}<span>${store.get().settings.theme === "dark" ? tt("light") : tt("dark")}</span></button>
      </div>
    </aside>
    <div class="drawer-backdrop" id="backdrop"></div>
    <section class="workspace">
      <header class="topbar">
        <button class="menu-btn icon-btn" id="menu-btn">${Icon.menu}</button>
        <button class="search-trigger" id="global-search">${Icon.search}<span>${tt("search")}</span><kbd>Ctrl K</kbd></button>
        <div class="top-actions">
          <button class="icon-btn" id="lang-btn" title="${tt("language")}">${Icon.lang}</button>
          <button class="btn btn-primary" id="qa-project">${Icon.plus}<span>${tt("newProject")}</span></button>
        </div>
      </header>
      <main class="content" id="content"></main>
    </section>
    <div id="toasts" class="toasts"></div>
    <div id="modal-root" class="modal-root"></div>
    <div id="cmd-root" class="cmd-root"></div>
  `;
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.nav === (route.name === "project" ? "projects" : route.name === "snippet" ? "snippets" : route.name === "note" ? "notes" : route.name));
    el.addEventListener("click", () => {
      go(el.dataset.nav);
      closeDrawer();
    });
  });
  document.getElementById("theme-toggle").onclick = () => {
    const next = store.get().settings.theme === "dark" ? "light" : "dark";
    store.setSettings({ theme: next });
    applyChrome();
    layout();
    render();
  };
  document.getElementById("lang-btn").onclick = () => {
    store.setSettings({ lang: lang() === "fa" ? "en" : "fa" });
    applyChrome();
    layout();
    render();
  };
  document.getElementById("qa-project").onclick = () => projectModal();
  document.getElementById("global-search").onclick = () => openGlobalSearch();
  document.getElementById("menu-btn").onclick = () => {
    document.getElementById("sidebar").classList.add("is-open");
    document.getElementById("backdrop").classList.add("is-open");
  };
  document.getElementById("backdrop").onclick = closeDrawer;
}

function closeDrawer() {
  document.getElementById("sidebar")?.classList.remove("is-open");
  document.getElementById("backdrop")?.classList.remove("is-open");
}

function projectModal(existing) {
  openModal({
    title: existing ? tt("edit") + " " + existing.name : tt("newProject"),
    submitLabel: tt("save"),
    body: `
      <div class="field"><label>${tt("name")}</label><input class="input" name="name" required value="${existing?.name || ""}"></div>
      <div class="field"><label>${tt("description")}</label><textarea class="textarea" name="description" style="min-height:90px;font-family:inherit">${existing?.description || ""}</textarea></div>
      <div class="field"><label>${tt("technology")}</label><input class="input" name="tech" value="${existing?.tech?.join(", ") || ""}" placeholder="PHP, JavaScript"></div>
      <div class="field"><label>${tt("status")}</label>
        <select class="select" name="status">
          <option value="active"${existing?.status === "active" ? " selected" : ""}>${tt("active")}</option>
          <option value="in-progress"${existing?.status === "in-progress" ? " selected" : ""}>${tt("inProgress")}</option>
          <option value="done"${existing?.status === "done" ? " selected" : ""}>${tt("done")}</option>
        </select>
      </div>
      <div class="field"><label>${tt("tags")}</label><input class="input" name="tags" value="${existing?.tags?.join(", ") || ""}"></div>
    `,
    onSubmit(data, close) {
      const payload = {
        name: data.name,
        description: data.description,
        tech: data.tech.split(",").map((s) => s.trim()).filter(Boolean),
        status: data.status,
        tags: data.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (existing) store.updateProject(existing.id, payload);
      else {
        const p = store.addProject(payload);
        close();
        toast("success", tt("success"), p.name);
        go("projects/" + p.id + "/overview");
        return;
      }
      close();
      toast("success", tt("success"), data.name);
      render();
    },
  });
}

function snippetModal(existing) {
  openModal({
    title: existing ? tt("edit") : tt("newSnippet"),
    submitLabel: tt("save"),
    body: `
      <div class="field"><label>${tt("name")}</label><input class="input" name="title" required value="${existing?.title || ""}"></div>
      <div class="field"><label>${tt("language")}</label>
        <select class="select" name="language">${["PHP","JavaScript","Python","Java","HTML","CSS","SQL","JSON"].map(l=>`<option ${existing?.language===l?"selected":""}>${l}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${tt("category")}</label><input class="input" name="category" value="${existing?.category || "general"}"></div>
      <div class="field"><label>Code</label><textarea class="textarea" name="code">${escapeHtml(existing?.code || "")}</textarea></div>
    `,
    onSubmit(data, close) {
      if (existing) store.updateSnippet(existing.id, data);
      else store.addSnippet(data);
      close();
      toast("success", tt("copied").replace(tt("copied"), tt("success")), data.title);
      render();
    },
  });
}

function noteModal(existing) {
  openModal({
    title: existing ? tt("edit") : tt("newNote"),
    submitLabel: tt("save"),
    body: `
      <div class="field"><label>${tt("name")}</label><input class="input" name="title" required value="${existing?.title || ""}"></div>
      <div class="field"><label>${tt("category")}</label><input class="input" name="category" value="${existing?.category || "general"}"></div>
      <div class="field"><label>${tt("tags")}</label><input class="input" name="tags" value="${existing?.tags?.join(", ") || ""}"></div>
      <div class="field"><label>Body</label><textarea class="textarea" name="body" style="font-family:inherit">${escapeHtml(existing?.body || "")}</textarea></div>
    `,
    onSubmit(data, close) {
      const payload = { ...data, tags: data.tags.split(",").map((s) => s.trim()).filter(Boolean) };
      if (existing) store.updateNote(existing.id, payload);
      else store.addNote(payload);
      close();
      toast("success", tt("success"), data.title);
      render();
    },
  });
}

function statusBadge(st) {
  const map = { active: "green", "in-progress": "yellow", done: "blue", todo: "blue", "in-progress": "yellow" };
  const label = st === "in-progress" ? tt("inProgress") : st === "done" ? tt("done") : st === "todo" ? tt("todo") : tt("active");
  const cls = st === "done" ? "blue" : st === "in-progress" ? "yellow" : st === "todo" ? "purple" : "green";
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function dashboardView() {
  const d = store.get();
  const tools = [
    ["api", tt("apiLab")],
    ["json", tt("jsonTools")],
    ["sql", tt("sqlTools")],
    ["regex", tt("regexLab")],
    ["markdown", tt("markdown")],
    ["diff", tt("codeDiff")],
  ];
  document.getElementById("content").innerHTML = `
    <div class="spread" style="margin-bottom:18px">
      <div>
        <h1 class="page-title">${tt("welcome")}, ${d.user.name}</h1>
        <p class="page-sub">${tt("tagline")} — ${d.user.role}</p>
      </div>
      <button class="btn btn-primary" id="dash-new">${Icon.plus}${tt("newProject")}</button>
    </div>
    <div class="grid-4" style="margin-bottom:16px">
      ${[
        [d.projects.length, tt("projects")],
        [d.snippets.length, tt("snippets")],
        [d.notes.length, tt("notes")],
        [d.tasks.filter((x) => x.status !== "done").length, tt("tasks")],
      ].map(([n, l]) => `<div class="card stat"><b>${n}</b><span>${l}</span></div>`).join("")}
    </div>
    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:12px">${tt("quickActions")}</h3>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn btn-outline" data-go="api">${tt("apiLab")}</button>
          <button class="btn btn-outline" data-go="json">${tt("jsonTools")}</button>
          <button class="btn btn-outline" data-go="snippets">${tt("newSnippet")}</button>
          <button class="btn btn-outline" data-go="regex">${tt("regexLab")}</button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">${tt("favoriteTools")}</h3>
        <div class="row" style="flex-wrap:wrap">
          ${(d.favorites || []).map((id) => `<button class="btn btn-outline" data-go="${id}">${id}</button>`).join("")}
        </div>
      </div>
    </div>
    <h3 style="margin:18px 0 10px">${tt("recentProjects")}</h3>
    <div class="grid-4">
      ${d.projects.map((p) => `
        <article class="card card-hover" data-open="projects/${p.id}/overview">
          <div class="spread"><strong>${p.name}</strong>${statusBadge(p.status)}</div>
          <p class="muted" style="margin:8px 0 10px;font-size:13px">${escapeHtml(p.description)}</p>
          <div class="row">${p.tech.map((x) => `<span class="badge">${x}</span>`).join("")}</div>
        </article>`).join("")}
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <h3 style="margin-bottom:10px">${tt("recentSnippets")}</h3>
        ${d.snippets.slice(0,5).map(s => `<button class="nav-item" data-open="snippets/${s.id}"><span>${s.title}</span><span class="badge">${s.language}</span></button>`).join("")}
      </div>
      <div class="card">
        <h3 style="margin-bottom:10px">${tt("activity")}</h3>
        ${d.activity.slice(0,6).map(a => `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>${escapeHtml(a.text)}</span><span class="faint" style="font-size:12px">${a.time}</span></div>`).join("")}
      </div>
    </div>
    <h3 style="margin:18px 0 10px">${tt("recentTools")}</h3>
    <div class="row">${(d.settings.recentTools||[]).map(id => `<button class="btn btn-outline" data-go="${id}">${id}</button>`).join("")}</div>
  `;
  document.getElementById("dash-new").onclick = () => projectModal();
  bindOpens();
}

function bindOpens() {
  document.querySelectorAll("[data-open]").forEach((el) => el.addEventListener("click", () => go(el.dataset.open)));
  document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));
}

function projectsView() {
  const d = store.get();
  document.getElementById("content").innerHTML = `
    <div class="spread" style="margin-bottom:16px">
      <div><h1 class="page-title">${tt("projects")}</h1><p class="page-sub">${d.projects.length} workspaces</p></div>
      <button class="btn btn-primary" id="p-new">${Icon.plus}${tt("newProject")}</button>
    </div>
    <div class="toolbar"><input class="input" id="p-q" placeholder="${tt("search")}" style="max-width:280px"></div>
    <div class="grid-3" id="p-list"></div>
  `;
  const draw = () => {
    const q = (document.getElementById("p-q").value || "").toLowerCase();
    const list = d.projects.filter((p) => (p.name + p.description + p.tech.join()).toLowerCase().includes(q));
    document.getElementById("p-list").innerHTML = list.map((p) => `
      <article class="card">
        <div class="spread"><strong>${p.name}</strong>${statusBadge(p.status)}</div>
        <p class="muted" style="margin:8px 0;font-size:13px">${escapeHtml(p.description)}</p>
        <div class="row" style="margin-bottom:12px">${p.tech.map((x)=>`<span class="badge">${x}</span>`).join("")}</div>
        <div class="row">
          <button class="btn btn-primary btn-sm" data-open="projects/${p.id}/overview">${tt("open")}</button>
          <button class="btn btn-outline btn-sm" data-edit="${p.id}">${tt("edit")}</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">${tt("delete")}</button>
        </div>
      </article>`).join("") || `<div class="empty">${tt("empty")}</div>`;
    bindOpens();
    document.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => projectModal(d.projects.find(p => p.id === b.dataset.edit)));
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
      store.deleteProject(b.dataset.del);
      toast("warning", tt("delete"), b.dataset.del);
      projectsView();
    });
  };
  document.getElementById("p-new").onclick = () => projectModal();
  document.getElementById("p-q").oninput = draw;
  draw();
}

function projectView() {
  const d = store.get();
  const p = d.projects.find((x) => x.id === route.params.id);
  if (!p) {
    document.getElementById("content").innerHTML = `<div class="empty">${tt("empty")}</div>`;
    return;
  }
  const tab = route.params.tab;
  const tabs = ["overview","api","snippets","notes","environment","tasks","bookmarks","changelog"];
  const labels = { overview: tt("overview"), api: tt("apiLab"), snippets: tt("snippets"), notes: tt("notes"), environment: tt("environment"), tasks: tt("tasks"), bookmarks: tt("bookmarks"), changelog: tt("changelog") };
  let body = "";
  if (tab === "overview") {
    body = `
      <div class="grid-2">
        <div class="card">
          <p class="muted">${escapeHtml(p.description)}</p>
          <div class="row" style="margin-top:12px">${p.tech.map(x=>`<span class="badge badge-blue">${x}</span>`).join("")}</div>
          <div class="row" style="margin-top:12px">${p.tags.map(x=>`<span class="badge">${x}</span>`).join("")}</div>
          <p class="faint" style="margin-top:12px;font-size:12px">${p.created} → ${p.updated}</p>
          <div class="row" style="margin-top:12px">
            <button class="btn btn-outline" id="ed-p">${tt("edit")}</button>
            <button class="btn btn-danger" id="del-p">${tt("delete")}</button>
          </div>
        </div>
        <div class="card">
          <h3>${tt("statistics")}</h3>
          <p>${d.snippets.filter(s=>s.projectId===p.id).length} ${tt("snippets")}</p>
          <p>${d.tasks.filter(s=>s.projectId===p.id).length} ${tt("tasks")}</p>
          <p>${d.envs.filter(s=>s.projectId===p.id).length} env</p>
        </div>
      </div>`;
  } else if (tab === "snippets") {
    const list = d.snippets.filter(s => s.projectId === p.id);
    body = list.map(s => `<div class="card" style="margin-bottom:8px"><div class="spread"><strong>${s.title}</strong><span class="badge">${s.language}</span></div><pre class="code-view" style="margin-top:8px">${highlight(s.code,s.language)}</pre></div>`).join("") || `<div class="empty">${tt("empty")}</div>`;
  } else if (tab === "notes") {
    const list = d.notes.filter(n => (n.tags||[]).includes(p.id) || (n.tags||[]).includes(p.name.toLowerCase()));
    body = list.map(n => `<div class="card" style="margin-bottom:8px"><strong>${n.title}</strong><p class="muted">${escapeHtml(n.body)}</p></div>`).join("") || `<div class="empty">${tt("empty")}</div>`;
  } else if (tab === "environment") {
    const list = d.envs.filter(e => e.projectId === p.id);
    body = `
      <div class="toolbar">
        <input class="input" id="ek" placeholder="KEY" style="max-width:180px">
        <input class="input" id="ev" placeholder="value" style="max-width:220px">
        <label class="row"><input type="checkbox" id="esec"> secret</label>
        <button class="btn btn-primary" id="eadd">${tt("create")}</button>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Key</th><th>Value</th><th></th></tr></thead><tbody>
        ${list.map(e => `<tr><td class="mono">${e.key}</td><td class="mono ${e.secret?"masked":""}">${e.secret ? "••••••••" : escapeHtml(e.value)} ${e.secret?`<button class="btn btn-ghost btn-sm" data-rev="${e.id}">${tt("reveal")}</button>`:""}</td><td><button class="btn btn-danger btn-sm" data-edel="${e.id}">${tt("delete")}</button></td></tr>`).join("")}
      </tbody></table></div>`;
  } else if (tab === "tasks") {
    const cols = ["todo","in-progress","done"];
    body = `
      <div class="toolbar">
        <input class="input" id="ttitle" placeholder="${tt("name")}" style="max-width:220px">
        <select class="select" id="tprio" style="max-width:140px"><option>high</option><option selected>medium</option><option>low</option></select>
        <input class="input" id="tdue" type="date" style="max-width:160px" value="${today()}">
        <button class="btn btn-primary" id="tadd">${tt("create")}</button>
      </div>
      <div class="kanban">${cols.map(c => {
        const items = d.tasks.filter(x => x.projectId===p.id && x.status===c);
        return `<div class="kanban-col"><div class="spread" style="margin-bottom:8px"><strong>${c==="in-progress"?tt("inProgress"):c==="done"?tt("done"):tt("todo")}</strong><span class="badge">${items.length}</span></div>
          ${items.map(it => `<div class="task-card"><div class="spread"><span>${it.title}</span><button class="icon-btn" data-tdel="${it.id}">${Icon.close}</button></div>
            <div class="row" style="margin-top:6px"><span class="prio-${it.priority}">${it.priority}</span><span class="faint">${it.due}</span></div>
            <div class="row" style="margin-top:8px">${cols.filter(x=>x!==it.status).map(x=>`<button class="btn btn-outline btn-sm" data-tmove="${it.id}" data-st="${x}">${x}</button>`).join("")}</div>
          </div>`).join("")}</div>`;
      }).join("")}</div>`;
  } else if (tab === "bookmarks") {
    const list = d.bookmarks.filter(b => b.projectId===p.id);
    body = `
      <div class="toolbar"><input class="input" id="bt" placeholder="${tt("name")}" style="max-width:180px"><input class="input" id="bu" placeholder="https://" style="max-width:260px"><button class="btn btn-primary" id="badd">${tt("create")}</button></div>
      ${list.map(b => `<div class="spread card" style="margin-bottom:8px"><a href="${b.url}" target="_blank">${b.title}</a><button class="btn btn-danger btn-sm" data-bdel="${b.id}">${tt("delete")}</button></div>`).join("")}`;
  } else if (tab === "changelog") {
    const list = d.changelog.filter(c => c.projectId===p.id);
    body = `
      <div class="toolbar"><input class="input" id="ct" placeholder="change" style="max-width:360px"><button class="btn btn-primary" id="cadd">${tt("create")}</button></div>
      ${list.map(c => `<div class="card" style="margin-bottom:8px"><span class="badge">${c.date}</span> ${escapeHtml(c.text)}</div>`).join("")}`;
  } else if (tab === "api") {
    body = `<p class="muted" style="margin-bottom:10px">Workspace API shortcuts for ${p.name}</p>
      <button class="btn btn-primary" data-go="api">${tt("apiLab")}</button>
      <pre class="code-view" style="margin-top:12px">${highlight(SAMPLE_JSON,"JSON")}</pre>`;
  }
  document.getElementById("content").innerHTML = `
    <div class="spread" style="margin-bottom:12px">
      <div><h1 class="page-title">${p.name}</h1><p class="page-sub">${p.tech.join(" · ")}</p></div>
      ${statusBadge(p.status)}
    </div>
    <div class="tabs" style="margin-bottom:14px">
      ${tabs.map(tb => `<button class="tab ${tb===tab?"is-active":""}" data-open="projects/${p.id}/${tb}">${labels[tb]}</button>`).join("")}
    </div>
    ${body}
  `;
  bindOpens();
  document.getElementById("ed-p")?.addEventListener("click", () => projectModal(p));
  document.getElementById("del-p")?.addEventListener("click", () => { store.deleteProject(p.id); go("projects"); toast("warning", tt("delete"), p.name); });
  document.getElementById("eadd")?.addEventListener("click", () => {
    store.addEnv({ projectId: p.id, key: document.getElementById("ek").value, value: document.getElementById("ev").value, secret: document.getElementById("esec").checked });
    render();
  });
  document.querySelectorAll("[data-edel]").forEach(b => b.onclick = () => { store.deleteEnv(b.dataset.edel); render(); });
  document.querySelectorAll("[data-rev]").forEach(b => b.onclick = () => {
    const e = store.get().envs.find(x => x.id === b.dataset.rev);
    toast("info", e.key, e.value);
  });
  document.getElementById("tadd")?.addEventListener("click", () => {
    store.addTask({ projectId: p.id, title: document.getElementById("ttitle").value, priority: document.getElementById("tprio").value, due: document.getElementById("tdue").value });
    render();
  });
  document.querySelectorAll("[data-tdel]").forEach(b => b.onclick = () => { store.deleteTask(b.dataset.tdel); render(); });
  document.querySelectorAll("[data-tmove]").forEach(b => b.onclick = () => { store.updateTask(b.dataset.tmove, { status: b.dataset.st }); render(); });
  document.getElementById("badd")?.addEventListener("click", () => {
    store.addBookmark({ projectId: p.id, title: document.getElementById("bt").value, url: document.getElementById("bu").value });
    render();
  });
  document.querySelectorAll("[data-bdel]").forEach(b => b.onclick = () => { store.deleteBookmark(b.dataset.bdel); render(); });
  document.getElementById("cadd")?.addEventListener("click", () => {
    store.addChangelog({ projectId: p.id, text: document.getElementById("ct").value });
    render();
  });
}

function snippetsView() {
  const d = store.get();
  document.getElementById("content").innerHTML = `
    <div class="spread" style="margin-bottom:16px">
      <div><h1 class="page-title">${tt("snippets")}</h1></div>
      <button class="btn btn-primary" id="s-new">${Icon.plus}${tt("newSnippet")}</button>
    </div>
    <div class="toolbar">
      <input class="input" id="s-q" placeholder="${tt("search")}" style="max-width:240px">
      <select class="select" id="s-lang" style="max-width:160px"><option value="">${tt("language")}</option>${["PHP","JavaScript","Python","Java","HTML","CSS","SQL","JSON"].map(l=>`<option>${l}</option>`).join("")}</select>
    </div>
    <div class="grid-2" id="s-list"></div>
  `;
  const draw = () => {
    const q = document.getElementById("s-q").value.toLowerCase();
    const lg = document.getElementById("s-lang").value;
    const list = d.snippets.filter(s => (!lg || s.language===lg) && (s.title+s.code+s.language).toLowerCase().includes(q));
    document.getElementById("s-list").innerHTML = list.map(s => `
      <article class="card">
        <div class="spread"><strong>${s.title}</strong>
          <div class="row">
            <button class="icon-btn" data-fav="${s.id}" style="color:${s.favorite?"var(--accent-yellow)":"inherit"}">${Icon.star}</button>
            <span class="badge badge-blue">${s.language}</span>
          </div>
        </div>
        <p class="faint" style="font-size:12px;margin:6px 0">${s.category}</p>
        <pre class="code-view">${highlight(s.code, s.language)}</pre>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-outline btn-sm" data-copy="${s.id}">${Icon.copy}${tt("copy")}</button>
          <button class="btn btn-outline btn-sm" data-sedit="${s.id}">${tt("edit")}</button>
          <button class="btn btn-danger btn-sm" data-sdel="${s.id}">${tt("delete")}</button>
        </div>
      </article>`).join("") || `<div class="empty">${tt("empty")}</div>`;
    document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
      const s = d.snippets.find(x=>x.id===b.dataset.copy);
      await copyText(s.code);
      toast("success", tt("copied"), s.title);
    });
    document.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => {
      const s = d.snippets.find(x=>x.id===b.dataset.fav);
      store.updateSnippet(s.id, { favorite: !s.favorite });
      snippetsView();
    });
    document.querySelectorAll("[data-sedit]").forEach(b => b.onclick = () => snippetModal(d.snippets.find(x=>x.id===b.dataset.sedit)));
    document.querySelectorAll("[data-sdel]").forEach(b => b.onclick = () => { store.deleteSnippet(b.dataset.sdel); snippetsView(); toast("warning", tt("delete"), ""); });
  };
  document.getElementById("s-new").onclick = () => snippetModal();
  document.getElementById("s-q").oninput = draw;
  document.getElementById("s-lang").onchange = draw;
  draw();
}

function snippetView() {
  const s = store.get().snippets.find(x => x.id === route.params.id);
  if (!s) return snippetsView();
  document.getElementById("content").innerHTML = `
    <div class="spread"><h1 class="page-title">${s.title}</h1><span class="badge">${s.language}</span></div>
    <pre class="code-view" style="margin-top:12px">${highlight(s.code,s.language)}</pre>
    <div class="row" style="margin-top:12px"><button class="btn btn-primary" id="sc">${tt("copy")}</button><button class="btn btn-outline" data-go="snippets">${tt("snippets")}</button></div>`;
  document.getElementById("sc").onclick = async () => { await copyText(s.code); toast("success", tt("copied"), s.title); };
  bindOpens();
}

function notesView() {
  const d = store.get();
  document.getElementById("content").innerHTML = `
    <div class="spread" style="margin-bottom:16px"><h1 class="page-title">${tt("notes")}</h1><button class="btn btn-primary" id="n-new">${tt("newNote")}</button></div>
    <input class="input" id="n-q" placeholder="${tt("search")}" style="max-width:280px;margin-bottom:12px">
    <div class="grid-3" id="n-list"></div>`;
  const draw = () => {
    const q = document.getElementById("n-q").value.toLowerCase();
    const list = [...d.notes].sort((a,b)=>(b.pinned-a.pinned)).filter(n => (n.title+n.body+(n.tags||[]).join()).toLowerCase().includes(q));
    document.getElementById("n-list").innerHTML = list.map(n => `
      <article class="card">
        <div class="spread"><strong>${n.title}</strong><div class="row">
          <button class="icon-btn" data-pin="${n.id}">${Icon.pin}</button>
          <button class="icon-btn" data-nfav="${n.id}">${Icon.star}</button>
        </div></div>
        <p class="muted" style="white-space:pre-wrap;margin:8px 0;font-size:13px">${escapeHtml(n.body)}</p>
        <div class="row">${(n.tags||[]).map(t=>`<span class="badge">${t}</span>`).join("")}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-outline btn-sm" data-nedit="${n.id}">${tt("edit")}</button>
          <button class="btn btn-danger btn-sm" data-ndel="${n.id}">${tt("delete")}</button>
        </div>
      </article>`).join("") || `<div class="empty">${tt("empty")}</div>`;
    document.querySelectorAll("[data-pin]").forEach(b => b.onclick = () => { const n=d.notes.find(x=>x.id===b.dataset.pin); store.updateNote(n.id,{pinned:!n.pinned}); notesView(); });
    document.querySelectorAll("[data-nfav]").forEach(b => b.onclick = () => { const n=d.notes.find(x=>x.id===b.dataset.nfav); store.updateNote(n.id,{favorite:!n.favorite}); notesView(); });
    document.querySelectorAll("[data-nedit]").forEach(b => b.onclick = () => noteModal(d.notes.find(x=>x.id===b.dataset.nedit)));
    document.querySelectorAll("[data-ndel]").forEach(b => b.onclick = () => { store.deleteNote(b.dataset.ndel); notesView(); });
  };
  document.getElementById("n-new").onclick = () => noteModal();
  document.getElementById("n-q").oninput = draw;
  draw();
}

function splitTool(title, leftLabel, rightLabel, leftHtml, extraToolbar = "") {
  return `
    <div class="spread" style="margin-bottom:12px"><h1 class="page-title">${title}</h1></div>
    <div class="toolbar">${extraToolbar}</div>
    <div class="split">
      <div class="pane"><div class="pane-head">${leftLabel}</div>${leftHtml}</div>
      <div class="pane"><div class="pane-head">${rightLabel}</div><pre class="code-view" id="out" style="flex:1;border:0;border-radius:0;margin:0"></pre></div>
    </div>`;
}

function jsonView() {
  store.touchTool("json");
  document.getElementById("content").innerHTML = splitTool(tt("jsonTools"), "Input", "Output",
    `<textarea class="textarea" id="jin">${SAMPLE_JSON}</textarea>`,
    `<button class="btn btn-primary" data-act="fmt">${tt("format")}</button>
     <button class="btn btn-outline" data-act="min">${tt("minify")}</button>
     <button class="btn btn-outline" data-act="val">${tt("validate")}</button>
     <button class="btn btn-outline" data-act="tree">Tree</button>
     <button class="btn btn-outline" data-act="php">PHP</button>
     <button class="btn btn-outline" data-act="js">JS</button>
     <button class="btn btn-outline" data-act="ts">TS</button>
     <button class="btn btn-outline" data-act="java">Java</button>
     <button class="btn btn-outline" id="jcopy">${tt("copy")}</button>`
  );
  const out = document.getElementById("out");
  const run = (fn, html=false) => {
    try {
      const v = fn(document.getElementById("jin").value);
      out.innerHTML = html ? v : highlight(v, "JSON");
      toast("success", tt("success"), "JSON");
    } catch (e) {
      out.textContent = e.message;
      toast("error", tt("error"), e.message);
    }
  };
  document.querySelector('[data-act="fmt"]').onclick = () => run(formatJson);
  document.querySelector('[data-act="min"]').onclick = () => run(minifyJson);
  document.querySelector('[data-act="val"]').onclick = () => run((t) => { JSON.parse(t); return "Valid JSON"; });
  document.querySelector('[data-act="tree"]').onclick = () => run((t) => jsonTree(JSON.parse(t)), true);
  document.querySelector('[data-act="php"]').onclick = () => run(jsonToPhp);
  document.querySelector('[data-act="js"]').onclick = () => run(jsonToJs);
  document.querySelector('[data-act="ts"]').onclick = () => run(jsonToTs);
  document.querySelector('[data-act="java"]').onclick = () => run(jsonToJava);
  document.getElementById("jcopy").onclick = async () => { await copyText(out.textContent); toast("success", tt("copied"), ""); };
  run(formatJson);
}

function sqlView() {
  store.touchTool("sql");
  document.getElementById("content").innerHTML = splitTool(tt("sqlTools"), "SQL / JSON", "Output",
    `<textarea class="textarea" id="sin">${SAMPLE_SQL}</textarea>`,
    `<button class="btn btn-primary" id="sfmt">${tt("format")}</button>
     <button class="btn btn-outline" id="smin">${tt("minify")}</button>
     <button class="btn btn-outline" id="sval">${tt("validate")}</button>
     <button class="btn btn-outline" id="sjson">JSON → SQL</button>
     <input class="input" id="tname" value="products" style="max-width:140px">
     <input class="input" id="tcols" value="name, sku, price" style="max-width:200px">
     <button class="btn btn-outline" id="stable">Table</button>`
  );
  const out = document.getElementById("out");
  const put = (fn) => {
    try { const v = fn(); out.innerHTML = highlight(v, "SQL"); toast("success", tt("success"), "SQL"); }
    catch(e){ out.textContent=e.message; toast("error", tt("error"), e.message); }
  };
  document.getElementById("sfmt").onclick = () => put(() => formatSql(document.getElementById("sin").value));
  document.getElementById("smin").onclick = () => put(() => minifySql(document.getElementById("sin").value));
  document.getElementById("sval").onclick = () => put(() => { validateSql(document.getElementById("sin").value); return "Valid SQL structure"; });
  document.getElementById("sjson").onclick = () => put(() => jsonToSql(document.getElementById("sin").value, "items"));
  document.getElementById("stable").onclick = () => put(() => tableSql(document.getElementById("tname").value, document.getElementById("tcols").value));
  put(() => formatSql(SAMPLE_SQL));
}

function regexView() {
  store.touchTool("regex");
  const examples = [
    ["Email", "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", "i"],
    ["URL", "https?:\\/\\/\\S+", "g"],
    ["IPv4", "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", "g"],
    ["ISO date", "\\d{4}-\\d{2}-\\d{2}", "g"],
  ];
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("regexLab")}</h1>
    <div class="grid-2" style="margin-top:12px">
      <div class="stack">
        <div class="field"><label>Pattern</label><input class="input mono" id="rp" value="[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"></div>
        <div class="field"><label>Flags</label><input class="input mono" id="rf" value="gi"></div>
        <div class="field"><label>Test string</label><textarea class="textarea" id="rt">Contact sara@example.com or ops@codedesk.dev on 2026-09-17.</textarea></div>
        <div class="field"><label>Replace</label><input class="input mono" id="rr" value="[email]"></div>
        <div class="row">${examples.map(([n,p,f])=>`<button class="btn btn-outline btn-sm" data-ex="${n}" data-p="${encodeURIComponent(p)}" data-f="${f}">${n}</button>`).join("")}</div>
      </div>
      <div class="card">
        <h3>Matches</h3>
        <div id="rm" class="muted" style="margin:8px 0"></div>
        <div id="rh" class="code-view" style="white-space:pre-wrap"></div>
        <h3 style="margin-top:12px">Replace preview</h3>
        <pre class="code-view" id="rprev"></pre>
      </div>
    </div>`;
  const run = () => {
    try {
      const res = runRegex(document.getElementById("rp").value, document.getElementById("rf").value, document.getElementById("rt").value, document.getElementById("rr").value);
      document.getElementById("rm").textContent = res.matches.length + " match(es)";
      document.getElementById("rh").innerHTML = escapeHtml(res.highlighted).replaceAll("{{{M}}}", '<span class="match-hl">').replaceAll("{{{/M}}}", "</span>");
      document.getElementById("rprev").textContent = res.replaced;
    } catch (e) {
      document.getElementById("rm").textContent = e.message;
      toast("error", tt("error"), e.message);
    }
  };
  ["rp","rf","rt","rr"].forEach(id => document.getElementById(id).addEventListener("input", run));
  document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => {
    document.getElementById("rp").value = decodeURIComponent(b.dataset.p);
    document.getElementById("rf").value = b.dataset.f;
    run();
  });
  run();
}

function markdownView() {
  store.touchTool("markdown");
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("markdown")}</h1>
    <div class="split" style="margin-top:12px">
      <div class="pane"><div class="pane-head">Editor</div><textarea class="textarea" id="md">${SAMPLE_MD}</textarea></div>
      <div class="pane"><div class="pane-head">${tt("preview")}</div><div class="md-preview" id="mdp"></div></div>
    </div>`;
  const sync = () => { document.getElementById("mdp").innerHTML = renderMarkdown(document.getElementById("md").value); };
  document.getElementById("md").addEventListener("input", sync);
  sync();
}

function diffView() {
  store.touchTool("diff");
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("codeDiff")}</h1>
    <div class="split" style="margin-top:12px">
      <div class="pane"><div class="pane-head">${tt("original")}</div><textarea class="textarea" id="da">function add(a, b) {\n  return a + b;\n}\n</textarea></div>
      <div class="pane"><div class="pane-head">${tt("modified")}</div><textarea class="textarea" id="db">function add(a, b, c = 0) {\n  return a + b + c;\n}\n</textarea></div>
    </div>
    <div class="card" style="margin-top:12px" id="dd"></div>`;
  const run = () => {
    const rows = diffLines(document.getElementById("da").value, document.getElementById("db").value);
    document.getElementById("dd").innerHTML = rows.map(r => `<div class="diff-line diff-${r.t==="add"?"add":r.t==="del"?"del":"eq"}">${r.t==="add"?"+ ":r.t==="del"?"- ":"  "}${escapeHtml(r.v)}</div>`).join("");
  };
  document.getElementById("da").oninput = run;
  document.getElementById("db").oninput = run;
  run();
}

function encodersView() {
  store.touchTool("encoders");
  const ops = [
    ["b64e","Base64 Encode"],["b64d","Base64 Decode"],["urle","URL Encode"],["urld","URL Decode"],["htmle","HTML Encode"],["htmld","HTML Decode"]
  ];
  document.getElementById("content").innerHTML = splitTool(tt("encoders"), "Input", "Output",
    `<textarea class="textarea" id="ein">CodeDesk / فضای کاری</textarea>`,
    ops.map(([k,l]) => `<button class="btn btn-outline" data-enc="${k}">${l}</button>`).join("") + `<button class="btn btn-primary" id="ecopy">${tt("copy")}</button>`
  );
  const out = document.getElementById("out");
  document.querySelectorAll("[data-enc]").forEach(b => b.onclick = () => {
    try { out.textContent = encoders[b.dataset.enc](document.getElementById("ein").value); toast("success", tt("success"), b.textContent); }
    catch(e){ toast("error", tt("error"), e.message); out.textContent = e.message; }
  });
  document.getElementById("ecopy").onclick = async () => { await copyText(out.textContent); toast("success", tt("copied"), ""); };
}

function generatorsView() {
  store.touchTool("generators");
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("generators")}</h1>
    <div class="grid-3" style="margin-top:12px">
      <div class="card"><h3>UUID</h3><p class="mono" id="g-uuid" style="margin:10px 0;word-break:break-all"></p><button class="btn btn-primary" id="uuid">${tt("create")}</button></div>
      <div class="card"><h3>Random / Token</h3><input class="input" id="glen" type="number" value="24" style="margin:8px 0"><button class="btn btn-outline" id="grand">Random</button> <button class="btn btn-outline" id="gtok">Token</button><p class="mono" id="g-rand" style="margin-top:8px;word-break:break-all"></p></div>
      <div class="card"><h3>Lorem</h3><button class="btn btn-outline" id="glor">Generate</button><p id="g-lor" class="muted" style="margin-top:8px;font-size:13px"></p></div>
      <div class="card"><h3>Timestamp</h3><p class="mono" id="g-ts"></p><button class="btn btn-outline" id="gts">Now</button></div>
      <div class="card"><h3>Hash SHA-256</h3><input class="input" id="ghin" value="CodeDesk"><button class="btn btn-outline" id="ghash" style="margin-top:8px">Hash</button><p class="mono" id="g-hash" style="margin-top:8px;word-break:break-all"></p></div>
      <div class="card"><h3>Color</h3><div id="g-col" style="height:48px;border-radius:10px;margin:8px 0;border:1px solid var(--border)"></div><p class="mono" id="g-hex"></p><button class="btn btn-outline" id="gcol">Generate</button></div>
    </div>`;
  const setUuid = () => { const v = uuid(); document.getElementById("g-uuid").textContent = v; };
  setUuid();
  document.getElementById("uuid").onclick = async () => { setUuid(); await copyText(document.getElementById("g-uuid").textContent); toast("success", tt("copied"), "UUID"); };
  document.getElementById("grand").onclick = () => { document.getElementById("g-rand").textContent = randomString(+document.getElementById("glen").value || 16); };
  document.getElementById("gtok").onclick = () => { document.getElementById("g-rand").textContent = randomString(40, "abcdef0123456789"); };
  document.getElementById("glor").onclick = () => { document.getElementById("g-lor").textContent = lorem; };
  document.getElementById("gts").onclick = () => { document.getElementById("g-ts").textContent = String(Date.now()) + " / " + new Date().toISOString(); };
  document.getElementById("gts").click();
  document.getElementById("ghash").onclick = async () => { document.getElementById("g-hash").textContent = await hashString(document.getElementById("ghin").value); };
  document.getElementById("gcol").onclick = () => {
    const h = "#" + randomString(6, "0123456789abcdef");
    document.getElementById("g-col").style.background = h;
    document.getElementById("g-hex").textContent = h;
  };
  document.getElementById("gcol").click();
}

function apiView() {
  store.touchTool("api");
  const hist = store.apiHistory.list();
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("apiLab")}</h1>
    <p class="page-sub">Demo target: JSONPlaceholder (CORS) · optional PHP echo at <span class="mono">api/echo.php</span></p>
    <div class="card" style="margin-top:12px">
      <div class="row" style="flex-wrap:wrap">
        <select class="select" id="amethod" style="max-width:120px">${["GET","POST","PUT","PATCH","DELETE"].map(m=>`<option>${m}</option>`).join("")}</select>
        <input class="input" id="aurl" value="https://jsonplaceholder.typicode.com/posts/1" style="flex:1;min-width:200px">
        <button class="btn btn-primary" id="asend">${Icon.send}${tt("send")}</button>
      </div>
      <div class="grid-2" style="margin-top:12px">
        <div class="field"><label>Headers (JSON)</label><textarea class="textarea" id="ahdr" style="min-height:90px">{\n  "Accept": "application/json"\n}</textarea></div>
        <div class="field"><label>Query params (JSON)</label><textarea class="textarea" id="aq" style="min-height:90px">{}</textarea></div>
      </div>
      <div class="field" style="margin-top:12px"><label>Body</label><textarea class="textarea" id="abody">{\n  "title": "CodeDesk",\n  "body": "workspace",\n  "userId": 1\n}</textarea></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="card"><div class="spread"><h3>Response</h3><span class="badge" id="astatus">—</span></div><p class="muted" id="ameta"></p><pre class="code-view" id="ares"></pre></div>
      <div class="card"><h3>History</h3><div id="ahist">${hist.map(h=>`<button class="nav-item" data-url="${escapeHtml(h.url)}" data-m="${h.method}"><span>${h.method} ${escapeHtml(h.url)}</span><span class="badge">${h.status}</span></button>`).join("") || `<div class="empty">${tt("empty")}</div>`}</div></div>
    </div>`;
  document.getElementById("asend").onclick = sendApi;
  document.querySelectorAll("#ahist [data-url]").forEach(b => b.onclick = () => {
    document.getElementById("aurl").value = b.dataset.url;
    document.getElementById("amethod").value = b.dataset.m;
  });
}

async function sendApi() {
  const method = document.getElementById("amethod").value;
  let url = document.getElementById("aurl").value.trim();
  let headers = {};
  let query = {};
  try { headers = JSON.parse(document.getElementById("ahdr").value || "{}"); } catch(e){ toast("error", tt("error"), "Headers JSON"); return; }
  try { query = JSON.parse(document.getElementById("aq").value || "{}"); } catch(e){ toast("error", tt("error"), "Query JSON"); return; }
  const u = new URL(url, location.href);
  Object.entries(query).forEach(([k,v]) => u.searchParams.set(k, v));
  const body = ["GET","HEAD"].includes(method) ? undefined : document.getElementById("abody").value;
  if (body && !headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/json";
  const t0 = performance.now();
  try {
    const res = await fetch(u.toString(), { method, headers, body });
    const ms = Math.round(performance.now() - t0);
    const text = await res.text();
    let pretty = text;
    try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
    document.getElementById("astatus").textContent = res.status + " " + res.statusText;
    document.getElementById("ameta").textContent = ms + " ms · " + (res.headers.get("content-type") || "");
    document.getElementById("ares").innerHTML = highlight(pretty, "JSON");
    store.apiHistory.push({ method, url: u.toString(), status: res.status, time: ms });
    store.log("API " + method + " " + res.status);
    toast(res.ok ? "success" : "warning", String(res.status), ms + " ms");
  } catch (e) {
    document.getElementById("ares").textContent = e.message;
    toast("error", tt("error"), e.message);
  }
}

function terminalView() {
  const lines = [];
  const print = (s) => { lines.push(s); draw(); };
  const draw = () => {
    document.getElementById("term-out").innerHTML = lines.map(escapeHtml).join("\n");
    document.getElementById("term-out").scrollTop = 9999;
  };
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("terminal")}</h1>
    <div class="term" id="term-out"></div>
    <div class="term-in"><span class="faint">codedesk$</span><input id="tin" autocomplete="off"></div>
    <p class="muted" style="margin-top:8px">help · projects · uuid · theme · date · clear · echo</p>`;
  print("CodeDesk shell. Type help.");
  const run = (cmd) => {
    const [c, ...rest] = cmd.trim().split(" ");
    const arg = rest.join(" ");
    if (c === "help") print("commands: help, projects, uuid, theme, date, clear, echo, snippets");
    else if (c === "projects") store.get().projects.forEach(p => print(" - " + p.name + " [" + p.status + "]"));
    else if (c === "snippets") store.get().snippets.forEach(s => print(" - " + s.title));
    else if (c === "uuid") print(uuid());
    else if (c === "theme") { const n = store.get().settings.theme==="dark"?"light":"dark"; store.setSettings({theme:n}); applyChrome(); print("theme="+n); }
    else if (c === "date") print(new Date().toString());
    else if (c === "clear") { lines.length = 0; draw(); }
    else if (c === "echo") print(arg);
    else print("unknown: " + c);
  };
  const input = document.getElementById("tin");
  input.focus();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { print("codedesk$ " + input.value); run(input.value); input.value=""; }
  });
}

function settingsView() {
  const s = store.get().settings;
  document.getElementById("content").innerHTML = `
    <h1 class="page-title">${tt("settings")}</h1>
    <div class="grid-2" style="margin-top:12px">
      <div class="card stack">
        <h3>${tt("appearance")}</h3>
        <div class="row">
          <button class="btn ${s.theme==="light"?"btn-primary":"btn-outline"}" data-th="light">${tt("light")}</button>
          <button class="btn ${s.theme==="dark"?"btn-primary":"btn-outline"}" data-th="dark">${tt("dark")}</button>
        </div>
        <h3>${tt("accent")}</h3>
        <div class="row">${["blue","purple","green","yellow"].map(a=>`<button class="btn ${s.accent===a?"btn-primary":"btn-outline"}" data-ac="${a}">${a}</button>`).join("")}</div>
        <h3>${tt("language")}</h3>
        <div class="row">
          <button class="btn ${s.lang==="fa"?"btn-primary":"btn-outline"}" data-lg="fa">فارسی</button>
          <button class="btn ${s.lang==="en"?"btn-primary":"btn-outline"}" data-lg="en">English</button>
        </div>
      </div>
      <div class="card stack">
        <h3>${tt("editor")}</h3>
        <label class="muted">Font size <input class="input" type="number" id="efs" value="${s.editorFontSize}" style="max-width:80px;display:inline-block"></label>
        <h3>${tt("notifications")}</h3>
        <label class="row"><input type="checkbox" id="ntf" ${s.notifications?"checked":""}> ${tt("notifications")}</label>
        <h3>${tt("shortcuts")}</h3>
        <p class="muted">Ctrl/Cmd + K — ${tt("command")}<br>Ctrl + B — sidebar</p>
        <h3>${tt("data")}</h3>
        <button class="btn btn-danger" id="reset">${tt("resetData")}</button>
      </div>
    </div>`;
  document.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { store.setSettings({theme:b.dataset.th}); applyChrome(); layout(); render(); });
  document.querySelectorAll("[data-ac]").forEach(b => b.onclick = () => { store.setSettings({accent:b.dataset.ac}); applyChrome(); layout(); render(); });
  document.querySelectorAll("[data-lg]").forEach(b => b.onclick = () => { store.setSettings({lang:b.dataset.lg}); applyChrome(); layout(); render(); });
  document.getElementById("efs").onchange = (e) => store.setSettings({ editorFontSize: +e.target.value });
  document.getElementById("ntf").onchange = (e) => store.setSettings({ notifications: e.target.checked });
  document.getElementById("reset").onclick = () => { store.reset(seed); toast("info", tt("success"), "Demo"); layout(); render(); };
}

function openGlobalSearch() {
  openCommand(lang(), (id) => {
    if (id === "new-project") projectModal();
    else if (id === "new-snippet") snippetModal();
    else if (id === "search") document.getElementById("global-search").focus();
    else go(id);
  });
}

function render() {
  applyChrome();
  const map = {
    dashboard: dashboardView,
    projects: projectsView,
    project: projectView,
    snippets: snippetsView,
    snippet: snippetView,
    notes: notesView,
    note: notesView,
    api: apiView,
    json: jsonView,
    sql: sqlView,
    regex: regexView,
    markdown: markdownView,
    diff: diffView,
    encoders: encodersView,
    generators: generatorsView,
    terminal: terminalView,
    settings: settingsView,
  };
  (map[route.name] || dashboardView)();
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const n = route.name === "project" ? "projects" : route.name === "snippet" ? "snippets" : route.name === "note" ? "notes" : route.name;
    el.classList.toggle("is-active", el.dataset.nav === n);
  });
}

export async function boot() {
  const res = await fetch("./data/demo.json");
  seed = await res.json();
  store = createStore(seed);
  applyChrome();
  route = parseHash();
  layout();
  render();
  window.addEventListener("hashchange", () => { route = parseHash(); layout(); render(); });
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openGlobalSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const sb = document.getElementById("sidebar");
      sb.classList.toggle("is-open");
      document.getElementById("backdrop").classList.toggle("is-open", sb.classList.contains("is-open"));
    }
  });
}
