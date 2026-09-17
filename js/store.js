import { uid, today, nowStamp } from "./utils.js";

const KEY = "codedesk.v1";

const defaultSettings = {
  theme: "dark",
  lang: "fa",
  accent: "blue",
  sidebarCompact: false,
  editorFontSize: 13,
  notifications: true,
  recentTools: ["api", "json", "regex"],
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

export function createStore(seed) {
  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch {
    state = null;
  }
  if (!state || !state.projects) {
    state = { ...clone(seed), settings: { ...defaultSettings } };
  } else {
    state.settings = { ...defaultSettings, ...(state.settings || {}) };
  }

  const listeners = new Set();
  const persist = () => {
    localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach((fn) => fn(state));
  };

  return {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setSettings(patch) {
      state.settings = { ...state.settings, ...patch };
      persist();
    },
    touchTool(id) {
      const r = [id, ...(state.settings.recentTools || []).filter((x) => x !== id)].slice(0, 6);
      state.settings.recentTools = r;
      persist();
    },
    log(text) {
      state.activity = [{ id: uid("a"), text, time: nowStamp() }, ...(state.activity || [])].slice(0, 40);
      persist();
    },
    reset(seedData) {
      state = { ...clone(seedData), settings: { ...state.settings } };
      persist();
    },
    addProject(p) {
      const item = {
        id: uid("p"),
        created: today(),
        updated: today(),
        status: "active",
        tech: [],
        tags: [],
        ...p,
      };
      state.projects.unshift(item);
      this.log("Created project " + item.name);
      persist();
      return item;
    },
    updateProject(id, patch) {
      const i = state.projects.findIndex((x) => x.id === id);
      if (i < 0) return;
      state.projects[i] = { ...state.projects[i], ...patch, updated: today() };
      persist();
    },
    deleteProject(id) {
      state.projects = state.projects.filter((x) => x.id !== id);
      state.tasks = state.tasks.filter((x) => x.projectId !== id);
      state.envs = state.envs.filter((x) => x.projectId !== id);
      persist();
    },
    addSnippet(s) {
      const item = { id: uid("s"), favorite: false, category: "general", ...s };
      state.snippets.unshift(item);
      this.log("Created snippet " + item.title);
      persist();
      return item;
    },
    updateSnippet(id, patch) {
      const i = state.snippets.findIndex((x) => x.id === id);
      if (i < 0) return;
      state.snippets[i] = { ...state.snippets[i], ...patch };
      persist();
    },
    deleteSnippet(id) {
      state.snippets = state.snippets.filter((x) => x.id !== id);
      persist();
    },
    addNote(n) {
      const item = {
        id: uid("n"),
        pinned: false,
        favorite: false,
        tags: [],
        category: "general",
        updated: today(),
        ...n,
      };
      state.notes.unshift(item);
      persist();
      return item;
    },
    updateNote(id, patch) {
      const i = state.notes.findIndex((x) => x.id === id);
      if (i < 0) return;
      state.notes[i] = { ...state.notes[i], ...patch, updated: today() };
      persist();
    },
    deleteNote(id) {
      state.notes = state.notes.filter((x) => x.id !== id);
      persist();
    },
    addTask(t) {
      const item = { id: uid("t"), status: "todo", priority: "medium", due: today(), ...t };
      state.tasks.unshift(item);
      persist();
      return item;
    },
    updateTask(id, patch) {
      const i = state.tasks.findIndex((x) => x.id === id);
      if (i < 0) return;
      state.tasks[i] = { ...state.tasks[i], ...patch };
      persist();
    },
    deleteTask(id) {
      state.tasks = state.tasks.filter((x) => x.id !== id);
      persist();
    },
    addEnv(e) {
      const item = { id: uid("e"), secret: false, ...e };
      state.envs.unshift(item);
      persist();
      return item;
    },
    deleteEnv(id) {
      state.envs = state.envs.filter((x) => x.id !== id);
      persist();
    },
    addBookmark(b) {
      const item = { id: uid("b"), ...b };
      state.bookmarks.unshift(item);
      persist();
    },
    deleteBookmark(id) {
      state.bookmarks = state.bookmarks.filter((x) => x.id !== id);
      persist();
    },
    addChangelog(c) {
      state.changelog.unshift({ id: uid("c"), date: today(), ...c });
      persist();
    },
    toggleFavoriteTool(id) {
      const set = new Set(state.favorites || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      state.favorites = [...set];
      persist();
    },
    apiHistory: {
      list: () => JSON.parse(localStorage.getItem(KEY + ".api") || "[]"),
      push(item) {
        const list = [item, ...JSON.parse(localStorage.getItem(KEY + ".api") || "[]")].slice(0, 30);
        localStorage.setItem(KEY + ".api", JSON.stringify(list));
      },
    },
  };
}
