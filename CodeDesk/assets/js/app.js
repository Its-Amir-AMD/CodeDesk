/**
 * CodeDesk - Developer Workspace
 * Main Application Logic
 */

// ============================================
// State Management
// ============================================
const AppState = {
    data: null,
    currentView: 'dashboard',
    currentProject: null,
    theme: 'dark',
    language: 'fa',
    sidebarOpen: false
};

// ============================================
// Translations
// ============================================
const translations = {
    fa: {
        dashboard: 'داشبورد',
        projects: 'پروژه‌ها',
        snippets: 'اسنیپت‌ها',
        notes: 'یادداشت‌ها',
        apiLab: 'API Lab',
        jsonTools: 'JSON Tools',
        sqlTools: 'SQL Tools',
        regexLab: 'Regex Lab',
        markdown: 'Markdown',
        codeDiff: 'Code Diff',
        encoders: 'Encoders',
        generators: 'Generators',
        settings: 'تنظیمات',
        welcome: 'خوش آمدید',
        searchPlaceholder: 'جستجو...',
        newProject: 'پروژه جدید',
        newSnippet: 'اسنیپت جدید',
        newNote: 'یادداشت جدید'
    },
    en: {
        dashboard: 'Dashboard',
        projects: 'Projects',
        snippets: 'Snippets',
        notes: 'Notes',
        apiLab: 'API Lab',
        jsonTools: 'JSON Tools',
        sqlTools: 'SQL Tools',
        regexLab: 'Regex Lab',
        markdown: 'Markdown',
        codeDiff: 'Code Diff',
        encoders: 'Encoders',
        generators: 'Generators',
        settings: 'Settings',
        welcome: 'Welcome',
        searchPlaceholder: 'Search...',
        newProject: 'New Project',
        newSnippet: 'New Snippet',
        newNote: 'New Note'
    }
};

// ============================================
// Utility Functions
// ============================================
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(AppState.language === 'fa' ? 'fa-IR' : 'en-US');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', AppState.language === 'fa' ? 'کپی شد' : 'Copied');
    });
}

// ============================================
// Toast Notifications
// ============================================
function showToast(type, message) {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    toast.querySelector('.toast-close').onclick = () => toast.remove();
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

// ============================================
// Modal System
// ============================================
function showModal(title, content, footer = '') {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = content;
    $('#modalFooter').innerHTML = footer;
    $('#modalOverlay').classList.add('active');
}

function closeModal() {
    $('#modalOverlay').classList.remove('active');
}

$('#modalClose').onclick = closeModal;
$('#modalOverlay').onclick = (e) => {
    if (e.target === $('#modalOverlay')) closeModal();
};

// ============================================
// Command Palette
// ============================================
const commands = [
    { id: 'dashboard', title: 'داشبورد', desc: 'Dashboard', icon: 'grid', keys: 'Ctrl+D' },
    { id: 'projects', title: 'پروژه‌ها', desc: 'Projects', icon: 'folder' },
    { id: 'snippets', title: 'اسنیپت‌ها', desc: 'Snippets', icon: 'code' },
    { id: 'notes', title: 'یادداشت‌ها', desc: 'Notes', icon: 'file' },
    { id: 'api-lab', title: 'API Lab', desc: 'Test APIs', icon: 'cloud' },
    { id: 'json-tools', title: 'JSON Tools', desc: 'Format & Validate', icon: 'braces' },
    { id: 'sql-tools', title: 'SQL Tools', desc: 'Query Tools', icon: 'database' },
    { id: 'regex-lab', title: 'Regex Lab', desc: 'Test Patterns', icon: 'search' },
    { id: 'markdown', title: 'Markdown', desc: 'Editor', icon: 'edit' },
    { id: 'code-diff', title: 'Code Diff', desc: 'Compare Code', icon: 'diff' },
    { id: 'encoders', title: 'Encoders', desc: 'Encode/Decode', icon: 'lock' },
    { id: 'generators', title: 'Generators', desc: 'Generate IDs', icon: 'zap' },
    { id: 'settings', title: 'تنظیمات', desc: 'Settings', icon: 'settings' }
];

let selectedCommandIndex = 0;

function openCommandPalette() {
    $('#commandPalette').classList.add('active');
    $('#commandInput').value = '';
    $('#commandInput').focus();
    selectedCommandIndex = 0;
    renderCommands('');
}

function closeCommandPalette() {
    $('#commandPalette').classList.remove('active');
}

function renderCommands(query) {
    const filtered = commands.filter(cmd => 
        cmd.title.includes(query) || cmd.desc.toLowerCase().includes(query.toLowerCase())
    );
    
    const resultsEl = $('#commandResults');
    resultsEl.innerHTML = filtered.map((cmd, index) => `
        <div class="command-item ${index === selectedCommandIndex ? 'selected' : ''}" data-index="${index}" data-id="${cmd.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
            </svg>
            <div class="command-item-text">
                <div class="command-item-title">${cmd.title}</div>
                <div class="command-item-desc">${cmd.desc}</div>
            </div>
            ${cmd.keys ? `<span class="command-item-kbd">${cmd.keys}</span>` : ''}
        </div>
    `).join('');
    
    $$('.command-item').forEach(item => {
        item.onclick = () => {
            navigateTo(item.dataset.id);
            closeCommandPalette();
        };
    });
}

$('#commandInput').oninput = (e) => {
    selectedCommandIndex = 0;
    renderCommands(e.target.value);
};

$('#commandInput').onkeydown = (e) => {
    const items = $$('.command-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedCommandIndex = (selectedCommandIndex + 1) % items.length;
        renderCommands($('#commandInput').value);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedCommandIndex = (selectedCommandIndex - 1 + items.length) % items.length;
        renderCommands($('#commandInput').value);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = $(`.command-item[data-index="${selectedCommandIndex}"]`);
        if (selectedItem) {
            navigateTo(selectedItem.dataset.id);
            closeCommandPalette();
        }
    } else if (e.key === 'Escape') {
        closeCommandPalette();
    }
};

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
    }
    if (e.key === 'Escape' && $('#commandPalette').classList.contains('active')) {
        closeCommandPalette();
    }
});

// ============================================
// Navigation
// ============================================
function navigateTo(view, projectId = null) {
    AppState.currentView = view;
    AppState.currentProject = projectId;
    
    $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    renderView(view, projectId);
    
    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
        $('#sidebar').classList.remove('open');
    }
}

$$('.nav-item').forEach(item => {
    item.onclick = () => navigateTo(item.dataset.view);
});

// ============================================
// View Rendering
// ============================================
function renderView(view, projectId = null) {
    const pageContent = $('#pageContent');
    
    switch(view) {
        case 'dashboard':
            renderDashboard(pageContent);
            break;
        case 'projects':
            renderProjects(pageContent);
            break;
        case 'project-workspace':
            renderProjectWorkspace(pageContent, projectId);
            break;
        case 'snippets':
            renderSnippets(pageContent);
            break;
        case 'notes':
            renderNotes(pageContent);
            break;
        case 'api-lab':
            renderAPILab(pageContent);
            break;
        case 'json-tools':
            renderJSONTools(pageContent);
            break;
        case 'sql-tools':
            renderSQLTools(pageContent);
            break;
        case 'regex-lab':
            renderRegexLab(pageContent);
            break;
        case 'markdown':
            renderMarkdown(pageContent);
            break;
        case 'code-diff':
            renderCodeDiff(pageContent);
            break;
        case 'encoders':
            renderEncoders(pageContent);
            break;
        case 'generators':
            renderGenerators(pageContent);
            break;
        case 'settings':
            renderSettings(pageContent);
            break;
    }
}

// ============================================
// Dashboard View
// ============================================
function renderDashboard(container) {
    const t = translations[AppState.language];
    const projects = AppState.data.projects;
    const snippets = AppState.data.snippets;
    const notes = AppState.data.notes;
    
    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">${t.welcome}, CodeDesk 👋</h1>
            <p class="page-subtitle">فضای کاری توسعه‌دهنده شما</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${projects.length}</div>
                    <div class="stat-label">پروژه‌ها</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${snippets.length}</div>
                    <div class="stat-label">اسنیپت‌ها</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${notes.length}</div>
                    <div class="stat-label">یادداشت‌ها</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${projects.filter(p => p.status === 'active').length}</div>
                    <div class="stat-label">فعال</div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-2">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">پروژه‌های اخیر</h3>
                    <button class="btn btn-sm btn-secondary" onclick="navigateTo('projects')">مشاهده همه</button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>نام</th>
                                <th>وضعیت</th>
                                <th>تکنولوژی</th>
                                <th>آخرین بروزرسانی</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${projects.slice(0, 4).map(p => `
                                <tr style="cursor: pointer;" onclick="navigateTo('project-workspace', '${p.id}')">
                                    <td><strong>${p.name}</strong></td>
                                    <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                                    <td><div class="tags">${p.technology.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('')}</div></td>
                                    <td>${formatDate(p.updated_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">اسنیپت‌های محبوب</h3>
                    <button class="btn btn-sm btn-secondary" onclick="navigateTo('snippets')">مشاهده همه</button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>عنوان</th>
                                <th>زبان</th>
                                <th>تگ‌ها</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${snippets.filter(s => s.favorite).slice(0, 4).map(s => `
                                <tr>
                                    <td><strong>${s.title}</strong></td>
                                    <td><span class="tag tag-accent">${s.language}</span></td>
                                    <td><div class="tags">${s.tags.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('')}</div></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="mt-24">
            <h3 class="mb-16">ابزارهای سریع</h3>
            <div class="grid grid-4">
                <div class="card text-center" style="cursor: pointer;" onclick="navigateTo('json-tools')">
                    <div class="stat-icon" style="margin: 0 auto 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        </svg>
                    </div>
                    <strong>JSON Tools</strong>
                </div>
                <div class="card text-center" style="cursor: pointer;" onclick="navigateTo('api-lab')">
                    <div class="stat-icon" style="margin: 0 auto 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        </svg>
                    </div>
                    <strong>API Lab</strong>
                </div>
                <div class="card text-center" style="cursor: pointer;" onclick="navigateTo('regex-lab')">
                    <div class="stat-icon" style="margin: 0 auto 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                        </svg>
                    </div>
                    <strong>Regex Lab</strong>
                </div>
                <div class="card text-center" style="cursor: pointer;" onclick="navigateTo('generators')">
                    <div class="stat-icon" style="margin: 0 auto 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v4M12 18v4"/>
                        </svg>
                    </div>
                    <strong>Generators</strong>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Projects View
// ============================================
function renderProjects(container) {
    const projects = AppState.data.projects;
    
    container.innerHTML = `
        <div class="page-header flex justify-between items-center">
            <div>
                <h1 class="page-title">پروژه‌ها</h1>
                <p class="page-subtitle">مدیریت پروژه‌های خود</p>
            </div>
            <button class="btn btn-primary" onclick="showNewProjectModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                پروژه جدید
            </button>
        </div>
        
        <div class="grid grid-3">
            ${projects.map(p => `
                <div class="card" style="cursor: pointer;" onclick="navigateTo('project-workspace', '${p.id}')">
                    <div class="card-header">
                        <h3 class="card-title">${p.name}</h3>
                        <span class="status-badge status-${p.status}">${p.status}</span>
                    </div>
                    <p style="margin-bottom: 16px;">${p.description}</p>
                    <div class="tags mb-16">
                        ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                    </div>
                    <div class="tags">
                        ${p.technology.map(t => `<span class="tag tag-accent">${t}</span>`).join('')}
                    </div>
                    <div class="text-muted mt-16" style="font-size: 0.85rem;">
                        آخرین بروزرسانی: ${formatDate(p.updated_at)}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showNewProjectModal() {
    showModal(
        'پروژه جدید',
        `
            <div class="input-group">
                <label class="input-label">نام پروژه</label>
                <input type="text" class="input-field" id="newProjectName">
            </div>
            <div class="input-group">
                <label class="input-label">توضیحات</label>
                <textarea class="input-field" id="newProjectDesc"></textarea>
            </div>
            <div class="input-group">
                <label class="input-label">تکنولوژی‌ها (با کاما جدا کنید)</label>
                <input type="text" class="input-field" id="newProjectTech" placeholder="PHP, MySQL, JavaScript">
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">انصراف</button>
            <button class="btn btn-primary" onclick="createProject()">ایجاد پروژه</button>
        `
    );
}

function createProject() {
    const name = $('#newProjectName').value;
    const description = $('#newProjectDesc').value;
    const technology = $('#newProjectTech').value.split(',').map(t => t.trim()).filter(t => t);
    
    if (!name) {
        showToast('error', 'نام پروژه الزامی است');
        return;
    }
    
    const newProject = {
        id: 'proj_' + generateId(),
        name,
        description,
        technology,
        status: 'active',
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
        tags: [],
        tasks: [],
        environment: []
    };
    
    AppState.data.projects.unshift(newProject);
    closeModal();
    showToast('success', 'پروژه با موفقیت ایجاد شد');
    renderProjects($('#pageContent'));
}

// ============================================
// Project Workspace View
// ============================================
let workspaceTab = 'overview';

function renderProjectWorkspace(container, projectId) {
    const project = AppState.data.projects.find(p => p.id === projectId);
    if (!project) return;
    
    AppState.currentProject = project;
    
    container.innerHTML = `
        <div class="page-header">
            <button class="btn btn-sm btn-secondary mb-16" onclick="navigateTo('projects')">
                ← بازگشت به پروژه‌ها
            </button>
            <h1 class="page-title">${project.name}</h1>
            <p class="page-subtitle">${project.description}</p>
            <div class="tags mt-16">
                ${project.technology.map(t => `<span class="tag tag-accent">${t}</span>`).join('')}
                <span class="status-badge status-${project.status}" style="margin-right: 8px;">${project.status}</span>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab ${workspaceTab === 'overview' ? 'active' : ''}" onclick="switchWorkspaceTab('overview')">Overview</button>
            <button class="tab ${workspaceTab === 'tasks' ? 'active' : ''}" onclick="switchWorkspaceTab('tasks')">Tasks</button>
            <button class="tab ${workspaceTab === 'environment' ? 'active' : ''}" onclick="switchWorkspaceTab('environment')">Environment</button>
        </div>
        
        <div id="workspaceContent"></div>
    `;
    
    renderWorkspaceContent();
}

function switchWorkspaceTab(tab) {
    workspaceTab = tab;
    $$('.tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase() === tab));
    renderWorkspaceContent();
}

function renderWorkspaceContent() {
    const project = AppState.currentProject;
    const contentEl = $('#workspaceContent');
    
    if (workspaceTab === 'overview') {
        contentEl.innerHTML = `
            <div class="grid grid-2">
                <div class="card">
                    <h3 class="card-title mb-16">اطلاعات پروژه</h3>
                    <p><strong>تاریخ ایجاد:</strong> ${formatDate(project.created_at)}</p>
                    <p><strong>آخرین بروزرسانی:</strong> ${formatDate(project.updated_at)}</p>
                    <p><strong>وضعیت:</strong> <span class="status-badge status-${project.status}">${project.status}</span></p>
                    <div class="mt-16">
                        <strong>تگ‌ها:</strong>
                        <div class="tags mt-8">
                            ${project.tags.length > 0 ? project.tags.map(t => `<span class="tag">${t}</span>`).join('') : '<span class="text-muted">بدون تگ</span>'}
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title mb-16">آمار سریع</h3>
                    <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
                        <div class="stat-card">
                            <div class="stat-value">${project.tasks?.length || 0}</div>
                            <div class="stat-label">تسک‌ها</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${project.environment?.length || 0}</div>
                            <div class="stat-label">متغیرها</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (workspaceTab === 'tasks') {
        const tasks = project.tasks || [];
        const todo = tasks.filter(t => t.status === 'todo');
        const inProgress = tasks.filter(t => t.status === 'in_progress');
        const done = tasks.filter(t => t.status === 'done');
        
        contentEl.innerHTML = `
            <div class="kanban-board">
                <div class="kanban-column">
                    <div class="kanban-header">
                        <span class="kanban-title">Todo</span>
                        <span class="kanban-count">${todo.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${todo.map(t => renderTaskCard(t, project.id)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="kanban-header">
                        <span class="kanban-title">In Progress</span>
                        <span class="kanban-count">${inProgress.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${inProgress.map(t => renderTaskCard(t, project.id)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="kanban-header">
                        <span class="kanban-title">Done</span>
                        <span class="kanban-count">${done.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${done.map(t => renderTaskCard(t, project.id)).join('')}
                    </div>
                </div>
            </div>
            
            <button class="btn btn-primary mt-24" onclick="showNewTaskModal('${project.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                تسک جدید
            </button>
        `;
    } else if (workspaceTab === 'environment') {
        const envVars = project.environment || [];
        
        contentEl.innerHTML = `
            <div class="card">
                <div class="env-list">
                    ${envVars.length > 0 ? envVars.map(e => `
                        <div class="env-item">
                            <span class="env-key">${e.key}</span>
                            <span class="env-value ${e.masked ? 'masked' : ''}">${e.masked ? '••••••••' : e.value}</span>
                            <div class="env-actions">
                                <button class="icon-btn" onclick="copyToClipboard('${e.value}')" title="کپی">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<p class="text-muted">هیچ متغیر محیطی ثبت نشده است</p>'}
                </div>
            </div>
            
            <button class="btn btn-primary mt-24" onclick="showNewEnvModal('${project.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                متغیر جدید
            </button>
        `;
    }
}

function renderTaskCard(task, projectId) {
    return `
        <div class="kanban-card">
            <div class="kanban-card-title">${task.title}</div>
            <div class="kanban-card-meta">
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                <span>${formatDate(task.due_date)}</span>
            </div>
        </div>
    `;
}

function showNewTaskModal(projectId) {
    showModal(
        'تسک جدید',
        `
            <div class="input-group">
                <label class="input-label">عنوان تسک</label>
                <input type="text" class="input-field" id="newTaskTitle">
            </div>
            <div class="input-group">
                <label class="input-label">اولویت</label>
                <select class="input-field" id="newTaskPriority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <div class="input-group">
                <label class="input-label">تاریخ سررسید</label>
                <input type="date" class="input-field" id="newTaskDueDate">
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">انصراف</button>
            <button class="btn btn-primary" onclick="createTask('${projectId}')">ایجاد تسک</button>
        `
    );
}

function createTask(projectId) {
    const title = $('#newTaskTitle').value;
    const priority = $('#newTaskPriority').value;
    const dueDate = $('#newTaskDueDate').value;
    
    if (!title) {
        showToast('error', 'عنوان تسک الزامی است');
        return;
    }
    
    const project = AppState.data.projects.find(p => p.id === projectId);
    project.tasks.push({
        id: 't_' + generateId(),
        title,
        status: 'todo',
        priority,
        due_date: dueDate || new Date().toISOString().split('T')[0]
    });
    
    closeModal();
    showToast('success', 'تسک با موفقیت ایجاد شد');
    renderWorkspaceContent();
}

function showNewEnvModal(projectId) {
    showModal(
        'متغیر محیطی جدید',
        `
            <div class="input-group">
                <label class="input-label">کلید</label>
                <input type="text" class="input-field" id="newEnvKey" placeholder="API_KEY">
            </div>
            <div class="input-group">
                <label class="input-label">مقدار</label>
                <input type="text" class="input-field" id="newEnvValue">
            </div>
            <div class="input-group">
                <label class="input-label">
                    <input type="checkbox" id="newEnvMasked"> مخفی کردن مقدار
                </label>
            </div>
        `,
        `
            <button class="btn btn-secondary" onclick="closeModal()">انصراف</button>
            <button class="btn btn-primary" onclick="createEnv('${projectId}')">ایجاد</button>
        `
    );
}

function createEnv(projectId) {
    const key = $('#newEnvKey').value;
    const value = $('#newEnvValue').value;
    const masked = $('#newEnvMasked').checked;
    
    if (!key || !value) {
        showToast('error', 'کلید و مقدار الزامی هستند');
        return;
    }
    
    const project = AppState.data.projects.find(p => p.id === projectId);
    project.environment.push({ key, value, masked });
    
    closeModal();
    showToast('success', 'متغیر با موفقیت اضافه شد');
    renderWorkspaceContent();
}

// ادامه کد در پیام بعدی...
