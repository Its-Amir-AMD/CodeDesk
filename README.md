# CodeDesk

**Your Developer Workspace**

A modern developer workspace for projects, snippets, APIs, notes, and everyday coding tools. Built as a vanilla HTML/CSS/JavaScript application with optional PHP endpoints for server-side testing.

## Stack

- HTML5, CSS3, vanilla JavaScript (ES modules)
- JSON demo data (`data/demo.json`)
- PHP echo/health endpoints in `api/`
- No React, Vue, Angular, or CMS

## Run

Open `index.html` with any static server, or with PHP:

```bash
php -S localhost:8080
```

Then visit `/` (or `/index.html`).

## Features

- Dashboard with real demo projects (MyShop, UserDesk, BalleBot, Portfolio)
- Project workspaces: overview, API, snippets, notes, environment, tasks, bookmarks, changelog
- Snippet manager with search, languages, favorites, copy, and simple syntax highlighting
- REST API Lab (GET/POST/PUT/PATCH/DELETE, headers, query, body, history)
- JSON / SQL / Regex / Markdown / Diff / Encoders / Generators
- Notes, terminal, command palette (`Ctrl+K`), light/dark themes, FA/EN, RTL
- Data persists in `localStorage` and can be reset from Settings

## License

MIT
