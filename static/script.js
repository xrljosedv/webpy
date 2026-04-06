class APIManager {
    constructor() {
        this.endpoints = [];
        this.currentEndpoint = null;
        this.categories = new Set();
        this.uploadedFiles = [];
        this.sidebarVisible = window.innerWidth > 768;
        this.init();
    }

    async init() {
        await this.loadEndpoints();
        this.setupEventListeners();
        this.setupSidebarToggle();
    }

    setupSidebarToggle() {
        const toggle = document.getElementById('menuToggleBtn');
        const sidebar = document.getElementById('sidebar');
        const update = () => {
            if (window.innerWidth > 768) {
                sidebar.style.display = 'flex';
                toggle.style.display = 'none';
            } else {
                sidebar.style.display = this.sidebarVisible ? 'flex' : 'none';
                toggle.style.display = 'inline-flex';
            }
        };
        update();
        window.addEventListener('resize', update);
        toggle.addEventListener('click', () => {
            this.sidebarVisible = !this.sidebarVisible;
            sidebar.style.display = this.sidebarVisible ? 'flex' : 'none';
        });
    }

    async loadEndpoints() {
        try {
            const start = Date.now();
            const res = await fetch('/api/list');
            const json = await res.json();
            if (json.status && json.data) {
                this.endpoints = json.data;
                document.getElementById('live-response').textContent = (Date.now() - start) + 'ms';
                document.getElementById('api-count').textContent = this.endpoints.length;
                document.getElementById('endpoint-count').textContent = this.endpoints.length;
                this.extractCategories();
                this.renderSidebar();
            }
        } catch (error) {
            document.getElementById('endpoint-list').innerHTML = '<div class="loading-placeholder"><i class="fas fa-circle-exclamation"></i><span>Error</span></div>';
        }
    }

    extractCategories() {
        this.categories.clear();
        this.endpoints.forEach(e => { if (e.category) this.categories.add(e.category); });
    }

    renderSidebar() {
        const list = document.getElementById('endpoint-list');
        const cats = {};
        this.endpoints.forEach(e => {
            if (!cats[e.category]) cats[e.category] = [];
            cats[e.category].push(e);
        });
        let html = '';
        for (let cat in cats) {
            html += `<div class="category-section" data-category="${cat.toLowerCase()}">`;
            html += `<div class="category-header"><i class="far fa-folder-open"></i><span>${cat}</span><span class="endpoint-badge">${cats[cat].length}</span><i class="fas fa-chevron-down"></i></div>`;
            html += `<div class="endpoints-list">`;
            cats[cat].forEach(e => {
                html += `<div class="endpoint-item" data-endpoint="${e.endpoint}" data-method="${e.method}">`;
                html += `<div class="endpoint-method method-${e.method.toLowerCase()}">${e.method}</div>`;
                html += `<div class="endpoint-info"><div class="endpoint-name">${e.name}</div><div class="endpoint-path">${e.endpoint}</div></div>`;
                html += `</div>`;
            });
            html += `</div></div>`;
        }
        list.innerHTML = html;
        
        document.querySelectorAll('.endpoint-item').forEach(el => {
            el.addEventListener('click', () => {
                const endpoint = this.endpoints.find(ep => ep.endpoint === el.dataset.endpoint);
                if (endpoint) this.loadEndpoint(endpoint);
                document.querySelectorAll('.endpoint-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
                if (window.innerWidth <= 768) {
                    this.sidebarVisible = false;
                    document.getElementById('sidebar').style.display = 'none';
                }
            });
        });
        
        document.querySelectorAll('.category-header').forEach(h => {
            h.addEventListener('click', (e) => {
                e.stopPropagation();
                const listEl = h.nextElementSibling;
                const arrow = h.querySelector('.fas.fa-chevron-down');
                if (listEl.style.display === 'none') {
                    listEl.style.display = 'flex';
                    arrow.style.transform = 'rotate(0deg)';
                } else {
                    listEl.style.display = 'none';
                    arrow.style.transform = 'rotate(-90deg)';
                }
            });
        });
        
        this.renderCategoryFilters();
        this.setupSearch();
        if (this.endpoints.length > 0) {
            setTimeout(() => { const first = document.querySelector('.endpoint-item'); if (first) first.click(); }, 300);
        }
    }

    renderCategoryFilters() {
        const container = document.getElementById('category-filters');
        let html = `<button class="pill-btn active" data-filter="all"><i class="fas fa-layer-group"></i> Todos</button>`;
        this.categories.forEach(cat => {
            html += `<button class="pill-btn" data-filter="${cat.toLowerCase()}"><i class="fas fa-folder"></i> ${cat}</button>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('.pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                document.querySelectorAll('.category-section').forEach(s => {
                    s.style.display = (filter === 'all' || s.dataset.category === filter) ? 'block' : 'none';
                });
            });
        });
    }

    setupSearch() {
        document.getElementById('endpoint-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.category-section').forEach(cat => {
                let any = false;
                cat.querySelectorAll('.endpoint-item').forEach(item => {
                    const match = item.textContent.toLowerCase().includes(term);
                    item.style.display = match ? 'flex' : 'none';
                    if (match) any = true;
                });
                cat.style.display = any || term === '' ? 'block' : 'none';
            });
        });
    }

    loadEndpoint(ep) {
        this.currentEndpoint = ep;
        document.getElementById('api-grid').style.display = 'none';
        document.getElementById('api-detail-view').style.display = 'block';
        document.getElementById('detail-endpoint-name').textContent = ep.name;
        document.getElementById('detail-method').textContent = ep.method;
        document.getElementById('api-method').textContent = ep.method;
        document.getElementById('api-method').className = `method-tag method-${ep.method.toLowerCase()}`;
        document.getElementById('api-path').textContent = ep.endpoint;
        document.getElementById('api-description').textContent = ep.description || 'Sin descripcion';
        
        const baseUrl = window.location.origin;
        document.getElementById('try-url').value = baseUrl + ep.endpoint;
        document.getElementById('try-method').value = ep.method;
        
        const tbody = document.querySelector('#parameters-table tbody');
        if (!ep.parameters || ep.parameters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-table"><i class="fas fa-circle-info"></i> No requiere parametros</td></tr>';
        } else {
            tbody.innerHTML = ep.parameters.map(p => `
                <tr><td><strong>${p.name}</strong> ${p.required ? '<span class="required-badge">req</span>' : ''}</td>
                <td>${p.description || '-'}</td><td>${p.required ? 'requerido' : 'opcional'}</td>
                <td><code>${p.example || '-'}</code></td></tr>
            `).join('');
        }
        
        const exampleParams = ep.parameters && ep.parameters.length > 0 
            ? '?' + ep.parameters.filter(p => p.example).map(p => `${p.name}=${encodeURIComponent(p.example)}`).join('&') : '';
        const exampleUrl = baseUrl + ep.endpoint + exampleParams;
        
        document.getElementById('curl-code').textContent = `curl -X ${ep.method} "${exampleUrl}"`;
        document.getElementById('js-code').textContent = `fetch('${exampleUrl}', { method: '${ep.method}' })\n  .then(r => r.json())\n  .then(console.log);`;
        document.getElementById('python-code').textContent = `import requests\n\nresponse = requests.${ep.method.toLowerCase()}('${exampleUrl}')\nprint(response.json())`;
        
        const paramsDiv = document.getElementById('try-params-container');
        if (!ep.parameters || ep.parameters.length === 0) {
            paramsDiv.innerHTML = '<div class="info-note"><i class="fas fa-circle-info"></i> No requiere parametros</div>';
        } else {
            paramsDiv.innerHTML = ep.parameters.map(p => `
                <div class="param-row">
                    <label>${p.name} ${p.required ? '<span class="required-badge">req</span>' : ''}</label>
                    <input type="text" id="param-${p.name}" placeholder="${p.description || ''}" value="${p.example || ''}" data-param="${p.name}">
                    <div class="param-desc">${p.description || ''}</div>
                </div>
            `).join('');
        }
        
        const uploadSec = document.getElementById('upload-section');
        uploadSec.style.display = ep.supportsUpload ? 'block' : 'none';
        if (!ep.supportsUpload) {
            this.uploadedFiles = [];
            document.getElementById('file-preview').innerHTML = '';
        }
        
        this.clearResponse();
        setTimeout(() => hljs.highlightAll(), 100);
    }
    
    clearResponse() {
        document.getElementById('response-status').textContent = '-';
        document.getElementById('response-time-value').textContent = '-';
        document.getElementById('try-response-body').innerHTML = '<code class="language-json">// Respuesta</code>';
        document.getElementById('response-actions').style.display = 'none';
        document.getElementById('media-section').style.display = 'none';
        document.getElementById('json-media-section').style.display = 'none';
        document.getElementById('media-preview').innerHTML = '';
        document.getElementById('json-media-container').innerHTML = '';
    }

    buildFullUrl() {
        if (!this.currentEndpoint) return '';
        const base = window.location.origin + this.currentEndpoint.endpoint;
        const params = {};
        document.querySelectorAll('#try-params-container input[type="text"]').forEach(i => {
            if (i.value.trim()) params[i.dataset.param] = i.value;
        });
        if (Object.keys(params).length > 0) return base + '?' + new URLSearchParams(params).toString();
        return base;
    }

    setupEventListeners() {
        document.getElementById('backBtn').addEventListener('click', () => {
            document.getElementById('api-grid').style.display = 'flex';
            document.getElementById('api-detail-view').style.display = 'none';
            this.clearResponse();
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
            });
        });
        
        document.querySelectorAll('.copy-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) navigator.clipboard.writeText(target.textContent);
                this.showMsg('Copiado', 'success');
            });
        });
        
        document.getElementById('copyFullUrlBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(this.buildFullUrl());
            this.showMsg('URL copiada', 'success');
        });
        
        document.getElementById('send-request').addEventListener('click', () => this.sendRequest());
        document.getElementById('copy-json-btn').addEventListener('click', () => {
            const data = document.getElementById('try-response-body').textContent;
            if (data) navigator.clipboard.writeText(data);
            this.showMsg('Copiado', 'success');
        });
        
        document.getElementById('open-api-btn').addEventListener('click', () => {
            window.open(this.buildFullUrl(), '_blank');
        });
        
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-upload');
        document.getElementById('browse-btn').addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFiles(files) {
        this.uploadedFiles = Array.from(files);
        const preview = document.getElementById('file-preview');
        if (this.uploadedFiles.length === 0) { preview.innerHTML = ''; return; }
        preview.innerHTML = this.uploadedFiles.map((f, i) => `
            <div class="file-item"><i class="far fa-file"></i><span>${f.name}</span>
            <button class="file-remove" data-index="${i}"><i class="fas fa-times"></i></button></div>
        `).join('');
        preview.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.uploadedFiles.splice(parseInt(btn.dataset.index), 1);
                this.handleFiles(this.uploadedFiles);
            });
        });
    }

    async sendRequest() {
        if (!this.currentEndpoint) { this.showMsg('Selecciona un endpoint', 'error'); return; }
        
        let method = document.getElementById('try-method').value;
        let url = document.getElementById('try-url').value;
        const params = {};
        document.querySelectorAll('#try-params-container input[type="text"]').forEach(i => {
            if (i.value.trim()) params[i.dataset.param] = i.value;
        });
        
        const start = Date.now();
        const loader = document.getElementById('response-loader');
        const respBody = document.getElementById('try-response-body');
        const responseStatus = document.getElementById('response-status');
        const responseTime = document.getElementById('response-time-value');
        
        loader.style.display = 'flex';
        respBody.innerHTML = '<code>// Cargando...</code>';
        responseStatus.textContent = '-';
        responseTime.textContent = '-';
        
        try {
            const options = { method: method, headers: {} };
            
            if (this.uploadedFiles.length > 0) {
                const fd = new FormData();
                this.uploadedFiles.forEach(f => fd.append('file', f));
                Object.keys(params).forEach(k => fd.append(k, params[k]));
                options.body = fd;
            } else if (method === 'POST' && Object.keys(params).length > 0) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(params);
            }
            
            if (method === 'GET' && Object.keys(params).length > 0) {
                url += '?' + new URLSearchParams(params).toString();
            }
            
            const res = await fetch(url, options);
            const time = Date.now() - start;
            responseStatus.textContent = res.status;
            responseTime.textContent = time;
            
            const ct = res.headers.get('content-type') || '';
            
            if (ct.includes('application/json')) {
                const data = await res.json();
                respBody.innerHTML = `<code class="language-json">${JSON.stringify(data, null, 2)}</code>`;
                document.getElementById('response-actions').style.display = 'flex';
            } else if (ct.includes('image/')) {
                const blob = await res.blob();
                const urlImg = URL.createObjectURL(blob);
                document.getElementById('media-preview').innerHTML = `<img src="${urlImg}" style="max-width:100%;max-height:300px">`;
                document.getElementById('media-section').style.display = 'block';
                respBody.innerHTML = '<code>// Imagen recibida</code>';
            } else {
                const text = await res.text();
                respBody.innerHTML = `<code>${this.escapeHtml(text)}</code>`;
            }
            
            hljs.highlightAll();
        } catch (err) {
            respBody.innerHTML = `<code class="language-json">${JSON.stringify({ error: err.message }, null, 2)}</code>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMsg(text, type) {
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'circle-info'}"></i> ${text}`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => new APIManager());
