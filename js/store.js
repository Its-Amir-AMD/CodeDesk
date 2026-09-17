import { uid, today, nowStamp } from "./utils.js";

const KEY = "codedesk.v1";
const API_KEY = KEY + ".api";

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

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function createStore(seed) {
  let state = readJson(KEY, null);
  if (!state || !Array.isArray(state.projects)) {
    state = { ...clone(seed), settings: { ...defaultSettings } };
  } else {
    state = { ...clone(seed), ...state };
    state.settings = { ...defaultSettings, ...(state.settings || {}) };
    for (const key of ["projects", "snippets", "notes", "tasks", "envs", "bookmarks", "changelog", "activity"]) {
      if (!Array.isArray(state[key])) state[key] = [];
    }
  }

  const listeners = new Set();
  const persist = () => {
    writeJson(KEY, state);
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
      state.settings.recentTools = [id, ...(state.settings.recentTools || []).filter((x) => x !== id)].slice(0, 6);
      persist();
    },
    log(text) {
      state.activity = [{ id: uid("a"), text: String(text), time: nowStamp() }, ...(state.activity || [])].slice(0, 40);
      persist();
    },
    reset(seedData) {
      state = { ...clone(seedData), settings: { ...state.settings } };
      persist();
    },
    addProject(p) {
      const item = { id: uid("p"), created: today(), updated: today(), status: "active", tech: [], tags: [], ...p };
      state.projects.unshift(item);
      this.log("Created project " + item.name);
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
      state.bookmarks = state.bookmarks.filter((x) => x.projectId !== id);
      state.changelog = state.changelog.filter((x) => x.projectId !== id);
      state.snippets = state.snippets.map((x) => x.projectId === id ? { ...x, projectId: null } : x);
      persist();
    },
    addSnippet(s) {
      const item = { id: uid("s"), favorite: false, category: "general", ...s };
      state.snippets.unshift(item);
      this.log("Created snippet " + item.title);
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
      const item = { id: uid("n"), pinned: false, favorite: false, tags: [], category: "general", updated: today(), ...n };
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
      return item;
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
      list: () => readJson(API_KEY, []),
      push(item) {
        const list = [item, ...readJson(API_KEY, [])].slice(0, 30);
        writeJson(API_KEY, list);
      },
    },
  };
}
