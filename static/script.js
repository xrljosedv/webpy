class APIManager {
    constructor() {
        this.endpoints = [];
        this.currentEndpoint = null;
        this.categories = new Set();
        this.currentMediaUrl = null;
        this.uploadedFiles = [];
        this.currentResponseData = null;
        this.userIP = 'Cargando...';
        this.sidebarVisible = window.innerWidth > 768;
        this.currentRequestController = null;
        this.extractedMedia = [];
        this.init();
    }

    async init() {
        await this.loadUserIP();
        await this.loadEndpoints();
        this.setupEventListeners();
        this.setupSidebarToggle();
        this.setupMediaModal();
        setTimeout(() => hljs.highlightAll(), 500);
    }

    setupMediaModal() {
        const modal = document.getElementById('mediaModal');
        const modalContainer = document.getElementById('modalMediaContainer');
        const closeBtn = document.querySelector('.modal-close');
        
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            modalContainer.innerHTML = '';
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modalContainer.innerHTML = '';
            }
        };
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
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sidebarVisible = !this.sidebarVisible;
            sidebar.style.display = this.sidebarVisible ? 'flex' : 'none';
        });
    }

    async loadUserIP() {
        try {
            const r = await fetch('https://api.ipify.org?format=json');
            const d = await r.json();
            this.userIP = d.ip;
            document.getElementById('user-ip').textContent = this.userIP;
        } catch {
            document.getElementById('user-ip').textContent = 'desconocida';
        }
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
                if (this.endpoints.length === 0) {
                    document.getElementById('endpoint-list').innerHTML = `
                        <div class="loading-placeholder">
                            <i class="far fa-folder-open"></i>
                            <span>No hay endpoints en la carpeta router</span>
                        </div>
                    `;
                    return;
                }
                this.extractCategories();
                this.renderSidebar();
            }
        } catch (error) {
            document.getElementById('endpoint-list').innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-circle-exclamation"></i>
                    <span>Error al cargar endpoints</span>
                </div>
            `;
        }
    }

    extractCategories() {
        this.categories.clear();
        this.endpoints.forEach(e => {
            if (e.category) this.categories.add(e.category);
        });
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
                html += `<div class="endpoint-item" data-endpoint="${e.endpoint}" data-method="${e.method}" data-category="${cat.toLowerCase()}" data-name="${e.name.toLowerCase()}">`;
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
                if (listEl.style.display === 'none' || listEl.style.display === '') {
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
            setTimeout(() => {
                const first = document.querySelector('.endpoint-item');
                if (first) first.click();
            }, 300);
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
            btn.addEventListener('click', (e) => {
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
                    const txt = item.textContent.toLowerCase();
                    const match = txt.includes(term);
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
        document.getElementById('detail-endpoint-name').textContent = ep.name || ep.endpoint;
        document.getElementById('detail-method').textContent = ep.method;
        document.getElementById('api-method').textContent = ep.method;
        document.getElementById('api-method').className = `method-tag method-${ep.method.toLowerCase()}`;
        document.getElementById('api-path').textContent = ep.endpoint;
        document.getElementById('api-description').textContent = ep.description || 'Sin descripcion disponible.';
        
        const baseUrl = window.location.origin;
        document.getElementById('try-url').value = baseUrl + ep.endpoint;
        document.getElementById('try-method').value = ep.method;
        
        const tbody = document.querySelector('#parameters-table tbody');
        if (!ep.parameters || ep.parameters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-table"><i class="fas fa-circle-info"></i> No requiere parametros</td></tr>';
        } else {
            tbody.innerHTML = ep.parameters.map(p => `
                <tr>
                    <td><strong>${p.name}</strong> ${p.required ? '<span class="required-badge">req</span>' : ''}</td>
                    <td>${p.description || '-'}</td>
                    <td>${p.required ? 'requerido' : 'opcional'}</td>
                    <td><code>${p.example || '-'}</code></td>
                </tr>
            `).join('');
        }
        
        const base = baseUrl + ep.endpoint;
        const exampleParams = ep.parameters && ep.parameters.length > 0 
            ? '?' + ep.parameters.filter(p => p.example).map(p => `${p.name}=${encodeURIComponent(p.example)}`).join('&')
            : '';
        const exampleUrl = base + exampleParams;
        
        document.getElementById('curl-code').textContent = `curl -X ${ep.method} "${exampleUrl}"`;
        document.getElementById('js-code').textContent = `fetch('${exampleUrl}', {\n  method: '${ep.method}'\n})\n  .then(r => r.json())\n  .then(console.log)\n  .catch(console.error);`;
        document.getElementById('python-code').textContent = `import requests\n\nresponse = requests.${ep.method.toLowerCase()}('${exampleUrl}')\nprint(response.json())`;
        
        const paramsDiv = document.getElementById('try-params-container');
        if (!ep.parameters || ep.parameters.length === 0) {
            paramsDiv.innerHTML = '<div class="info-note"><i class="fas fa-circle-info"></i> Este endpoint no requiere parametros.</div>';
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
        if (ep.supportsUpload) {
            uploadSec.style.display = 'block';
        } else {
            uploadSec.style.display = 'none';
            this.uploadedFiles = [];
            document.getElementById('file-preview').innerHTML = '';
        }
        
        this.clearResponse();
        setTimeout(() => hljs.highlightAll(), 100);
    }
    
    clearResponse() {
        if (this.currentMediaUrl) {
            URL.revokeObjectURL(this.currentMediaUrl);
            this.currentMediaUrl = null;
        }
        document.getElementById('response-status').textContent = '-';
        document.getElementById('response-time-value').textContent = '-';
        document.getElementById('try-response-body').innerHTML = '<code class="language-json">// La respuesta aparecera aqui</code>';
        document.getElementById('response-actions').style.display = 'none';
        document.getElementById('media-section').style.display = 'none';
        document.getElementById('json-media-section').style.display = 'none';
        document.getElementById('media-preview').innerHTML = '';
        document.getElementById('json-media-container').innerHTML = '';
        document.getElementById('open-media-btn').style.display = 'none';
        this.extractedMedia = [];
        this.currentResponseData = null;
    }

    buildFullUrl() {
        if (!this.currentEndpoint) return '';
        const base = window.location.origin + this.currentEndpoint.endpoint;
        const params = {};
        document.querySelectorAll('#try-params-container input[type="text"]').forEach(i => {
            if (i.value.trim()) params[i.dataset.param] = i.value;
        });
        if (Object.keys(params).length > 0) {
            return base + '?' + new URLSearchParams(params).toString();
        }
        return base;
    }

    extractMediaUrls(obj) {
        let media = [];
        if (!obj || typeof obj !== 'object') return media;
        
        if (Array.isArray(obj)) {
            obj.forEach(item => media.push(...this.extractMediaUrls(item)));
        } else {
            for (let key in obj) {
                const value = obj[key];
                if (typeof value === 'string') {
                    if (value.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || 
                        value.match(/\.(mp4|webm|mov)(\?.*)?$/i) ||
                        value.match(/\.(mp3|wav|ogg)(\?.*)?$/i) ||
                        (value.startsWith('http') && (value.includes('image') || value.includes('video')))) {
                        media.push({
                            url: value,
                            type: value.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? 'video' :
                                  value.match(/\.(mp3|wav|ogg)(\?.*)?$/i) ? 'audio' : 'image'
                        });
                    }
                } else if (typeof value === 'object' && value !== null) {
                    media.push(...this.extractMediaUrls(value));
                }
            }
        }
        return media.filter((item, index, self) => 
            index === self.findIndex(m => m.url === item.url)
        );
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
                if (target) {
                    navigator.clipboard.writeText(target.textContent);
                    this.showMsg('Copiado al portapapeles', 'success');
                }
            });
        });
        
        document.getElementById('copyFullUrlBtn').addEventListener('click', () => {
            if (!this.currentEndpoint) return;
            const url = this.buildFullUrl();
            navigator.clipboard.writeText(url);
            this.showMsg('URL copiada', 'success');
        });
        
        document.getElementById('shareEndpointBtn').addEventListener('click', () => {
            if (!this.currentEndpoint) return;
            const url = this.buildFullUrl();
            if (navigator.share) {
                navigator.share({ title: this.currentEndpoint.name, url: url });
            } else {
                navigator.clipboard.writeText(url);
                this.showMsg('URL copiada para compartir', 'success');
            }
        });
        
        document.getElementById('send-request').addEventListener('click', () => this.sendRequest());
        document.getElementById('copy-json-btn').addEventListener('click', () => {
            if (this.currentResponseData) {
                navigator.clipboard.writeText(this.currentResponseData);
                this.showMsg('Respuesta copiada', 'success');
            }
        });
        
        document.getElementById('open-api-btn').addEventListener('click', () => {
            const url = this.buildFullUrl();
            if (url) window.open(url, '_blank');
        });
        
        document.getElementById('open-media-btn').addEventListener('click', () => {
            if (this.extractedMedia.length > 0) {
                this.openMediaInModal(this.extractedMedia[0]);
            }
        });
        
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-upload');
        
        document.getElementById('browse-btn').addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
        
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleFiles(e.dataTransfer.files);
        });
        
        const downloadBtn = document.querySelector('.download-btn');
        const shareMediaBtn = document.querySelector('.share-media-btn');
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadCurrentMedia());
        if (shareMediaBtn) shareMediaBtn.addEventListener('click', () => this.shareCurrentMedia());
    }

    handleFiles(files) {
        this.uploadedFiles = Array.from(files);
        const preview = document.getElementById('file-preview');
        if (this.uploadedFiles.length === 0) {
            preview.innerHTML = '';
            return;
        }
        preview.innerHTML = this.uploadedFiles.map((f, i) => `
            <div class="file-item">
                <i class="far fa-file"></i>
                <span>${f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name}</span>
                <button class="file-remove" data-index="${i}"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
        preview.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.uploadedFiles.splice(idx, 1);
                this.handleFiles(this.uploadedFiles);
            });
        });
    }

    async sendRequest() {
        if (!this.currentEndpoint) {
            this.showMsg('Selecciona un endpoint primero', 'error');
            return;
        }
        
        if (this.currentRequestController) {
            this.currentRequestController.abort();
        }
        
        this.currentRequestController = new AbortController();
        let method = document.getElementById('try-method').value;
        let url = document.getElementById('try-url').value;
        const params = {};
        
        document.querySelectorAll('#try-params-container input[type="text"]').forEach(i => {
            if (i.value.trim()) params[i.dataset.param] = i.value;
        });
        
        const start = Date.now();
        const loader = document.getElementById('response-loader');
        const respBody = document.getElementById('try-response-body');
        const mediaSection = document.getElementById('media-section');
        const responseActions = document.getElementById('response-actions');
        const mediaPreview = document.getElementById('media-preview');
        const responseStatus = document.getElementById('response-status');
        const responseTime = document.getElementById('response-time-value');
        const openMediaBtn = document.getElementById('open-media-btn');
        const jsonMediaSection = document.getElementById('json-media-section');
        const jsonMediaContainer = document.getElementById('json-media-container');
        
        loader.style.display = 'flex';
        mediaSection.style.display = 'none';
        jsonMediaSection.style.display = 'none';
        responseActions.style.display = 'none';
        openMediaBtn.style.display = 'none';
        
        if (this.currentMediaUrl) {
            URL.revokeObjectURL(this.currentMediaUrl);
            this.currentMediaUrl = null;
        }
        
        mediaPreview.innerHTML = '';
        jsonMediaContainer.innerHTML = '';
        respBody.innerHTML = '<code class="language-json">// Cargando...</code>';
        responseStatus.textContent = '-';
        responseTime.textContent = '-';
        this.extractedMedia = [];
        
        try {
            const options = {
                method: method,
                headers: {},
                signal: this.currentRequestController.signal
            };
            
            if (this.uploadedFiles.length > 0) {
                const fd = new FormData();
                this.uploadedFiles.forEach(f => fd.append('file', f));
                Object.keys(params).forEach(k => fd.append(k, params[k]));
                options.body = fd;
            } else {
                if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                    options.headers['Content-Type'] = 'application/json';
                    if (Object.keys(params).length > 0) {
                        options.body = JSON.stringify(params);
                    }
                }
            }
            
            if (method === 'GET' && Object.keys(params).length > 0) {
                url += '?' + new URLSearchParams(params).toString();
            }
            
            const res = await fetch(url, options);
            const end = Date.now();
            const time = end - start;
            
            responseStatus.textContent = res.status;
            responseTime.textContent = time;
            
            const ct = res.headers.get('content-type') || '';
            
            if (ct.includes('application/json')) {
                const data = await res.json();
                this.currentResponseData = JSON.stringify(data, null, 2);
                respBody.innerHTML = `<code class="language-json">${this.escapeHtml(this.currentResponseData)}</code>`;
                responseActions.style.display = 'flex';
                mediaSection.style.display = 'none';
                
                this.extractedMedia = this.extractMediaUrls(data);
                if (this.extractedMedia.length > 0) {
                    openMediaBtn.style.display = 'inline-flex';
                    let mediaHtml = '';
                    this.extractedMedia.slice(0, 8).forEach((media, index) => {
                        mediaHtml += `
                            <div class="json-media-item">
                                ${media.type === 'image' ? `<img src="${media.url}" class="json-media-thumb" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50\' y=\'50\' font-size=\'12\' text-anchor=\'middle\' fill=\'%23999\' dy=\'.3em\'%3EError%3C/text%3E%3C/svg%3E'">` : `<div class="json-media-thumb video-thumb"><i class="fas fa-${media.type === 'video' ? 'video' : 'music'}"></i></div>`}
                                <div class="json-media-actions">
                                    <button class="json-media-btn" data-index="${index}"><i class="fas fa-eye"></i> Ver</button>
                                </div>
                            </div>
                        `;
                    });
                    jsonMediaContainer.innerHTML = mediaHtml;
                    jsonMediaSection.style.display = 'block';
                    jsonMediaContainer.querySelectorAll('.json-media-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.openMediaInModal(this.extractedMedia[btn.dataset.index]);
                        });
                    });
                }
            } else if (ct.includes('image/') || ct.includes('video/') || ct.includes('audio/')) {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                this.currentMediaUrl = blobUrl;
                
                let mediaType = 'image';
                if (ct.includes('video/')) mediaType = 'video';
                if (ct.includes('audio/')) mediaType = 'audio';
                
                this.extractedMedia = [{ url: blobUrl, type: mediaType }];
                
                if (ct.includes('image/')) {
                    const img = document.createElement('img');
                    img.src = blobUrl;
                    img.onclick = () => this.openMediaInModal(this.extractedMedia[0]);
                    mediaPreview.appendChild(img);
                } else if (ct.includes('video/')) {
                    const video = document.createElement('video');
                    video.src = blobUrl;
                    video.controls = true;
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '300px';
                    mediaPreview.appendChild(video);
                } else if (ct.includes('audio/')) {
                    const audio = document.createElement('audio');
                    audio.src = blobUrl;
                    audio.controls = true;
                    mediaPreview.appendChild(audio);
                }
                
                mediaSection.style.display = 'block';
                responseActions.style.display = 'flex';
                openMediaBtn.style.display = ct.includes('image/') ? 'inline-flex' : 'none';
                respBody.innerHTML = '<code>// Respuesta multimedia</code>';
            } else {
                const text = await res.text();
                this.currentResponseData = text;
                respBody.innerHTML = `<code>${this.escapeHtml(text)}</code>`;
                responseActions.style.display = 'flex';
                mediaSection.style.display = 'none';
            }
            
            hljs.highlightAll();
        } catch (err) {
            if (err.name === 'AbortError') return;
            this.currentResponseData = JSON.stringify({ error: err.message });
            respBody.innerHTML = `<code class="language-json">${this.escapeHtml(this.currentResponseData)}</code>`;
            responseStatus.textContent = 'Error';
            responseActions.style.display = 'flex';
            mediaSection.style.display = 'none';
        } finally {
            loader.style.display = 'none';
            this.currentRequestController = null;
        }
    }
    
    openMediaInModal(media) {
        const modal = document.getElementById('mediaModal');
        const modalContainer = document.getElementById('modalMediaContainer');
        modalContainer.innerHTML = '';
        
        if (media.type === 'image') {
            const img = document.createElement('img');
            img.src = media.url;
            modalContainer.appendChild(img);
        } else if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.url;
            video.controls = true;
            video.autoplay = true;
            modalContainer.appendChild(video);
        } else if (media.type === 'audio') {
            const audio = document.createElement('audio');
            audio.src = media.url;
            audio.controls = true;
            audio.autoplay = true;
            modalContainer.appendChild(audio);
        }
        
        modal.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadCurrentMedia() {
        if (this.currentMediaUrl) {
            const a = document.createElement('a');
            a.href = this.currentMediaUrl;
            a.download = 'download_' + Date.now();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    shareCurrentMedia() {
        if (this.currentMediaUrl) {
            const text = `Mira este archivo: ${this.currentMediaUrl}`;
            if (navigator.share) {
                navigator.share({ title: 'Media', text: text });
            } else {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(whatsappUrl, '_blank');
            }
        }
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