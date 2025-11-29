/**
 * 工事看板写真システム - クライアントアプリケーション
 */

const API_BASE = window.location.origin + '/api';

class App {
    constructor() {
        this.projects = [];
        this.signboards = [];
        this.photos = [];
        this.currentProject = null;
        this.cameraStream = null;
        this.init();
    }

    async init() {
        // イベントリスナー設定
        this.setupEventListeners();

        // 初期データ読み込み
        await this.loadProjects();
        await this.loadSignboards();
        await this.loadPhotos();

        this.renderProjects();
        this.renderSignboards();
        this.renderPhotos();
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // モーダルの外側クリックで閉じる
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // タブ切り替え
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    // ===================
    // API通信
    // ===================

    async api(endpoint, options = {}) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            alert('エラーが発生しました: ' + error.message);
            throw error;
        }
    }

    // ===================
    // 案件管理
    // ===================

    async loadProjects() {
        const response = await this.api('/projects');
        this.projects = response.data?.items || [];
    }

    renderProjects() {
        const container = document.getElementById('projects-list');

        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>まだ案件がありません</p>
                    <p style="font-size: 13px; margin-top: 8px;">「新しい案件を作成」ボタンから追加してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.projects.map(project => `
            <div class="card">
                <h3>${this.escapeHtml(project.name)}</h3>
                <div class="card-meta">
                    <span>📍 ${this.escapeHtml(project.location)}</span>
                    <span class="badge status-${project.status}">${this.getStatusLabel(project.status)}</span>
                </div>
                <div class="card-meta">
                    <span>📅 ${this.formatDate(project.startDate)}${project.endDate ? ' 〜 ' + this.formatDate(project.endDate) : ''}</span>
                </div>
                ${project.description ? `<p style="font-size: 14px; color: #666; margin-top: 8px;">${this.escapeHtml(project.description)}</p>` : ''}
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="app.editProject('${project.id}')">編集</button>
                    <button class="btn btn-danger" onclick="app.deleteProject('${project.id}')">削除</button>
                </div>
            </div>
        `).join('');
    }

    showCreateProjectModal() {
        document.getElementById('project-modal-title').textContent = '新しい案件を作成';
        document.getElementById('project-form').reset();
        this.currentProject = null;
        this.openModal('project-modal');
    }

    async editProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;

        this.currentProject = project;
        document.getElementById('project-modal-title').textContent = '案件を編集';

        const form = document.getElementById('project-form');
        form.name.value = project.name;
        form.location.value = project.location;
        form.description.value = project.description || '';
        form.startDate.value = project.startDate.split('T')[0];
        form.endDate.value = project.endDate ? project.endDate.split('T')[0] : '';
        form.status.value = project.status;

        this.openModal('project-modal');
    }

    async saveProject() {
        const form = document.getElementById('project-form');
        const formData = new FormData(form);

        const data = {
            name: formData.get('name'),
            location: formData.get('location'),
            description: formData.get('description') || undefined,
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || undefined,
            status: formData.get('status'),
        };

        try {
            if (this.currentProject) {
                // 更新
                await this.api(`/projects/${this.currentProject.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            } else {
                // 新規作成
                await this.api('/projects', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            }

            this.closeModal('project-modal');
            await this.loadProjects();
            this.renderProjects();
            alert('案件を保存しました');
        } catch (error) {
            // エラーハンドリングはapi()で行う
        }
    }

    async deleteProject(id) {
        if (!confirm('この案件を削除しますか？関連する看板と写真も削除されます。')) {
            return;
        }

        try {
            await this.api(`/projects/${id}`, {
                method: 'DELETE',
            });

            await this.loadProjects();
            this.renderProjects();
            alert('案件を削除しました');
        } catch (error) {
            // エラーハンドリングはapi()で行う
        }
    }

    // ===================
    // 工事看板管理
    // ===================

    async loadSignboards() {
        const response = await this.api('/signboards');
        this.signboards = response.data || [];
    }

    renderSignboards() {
        const container = document.getElementById('signboards-list');

        if (this.signboards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚧</div>
                    <p>まだ工事看板がありません</p>
                    <p style="font-size: 13px; margin-top: 8px;">「新しい看板を作成」ボタンから追加してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.signboards.map(signboard => {
            const project = this.projects.find(p => p.id === signboard.projectId);
            return `
                <div class="card">
                    <h3>${this.escapeHtml(signboard.title)}</h3>
                    <div class="card-meta">
                        <span>🏗️ ${project ? this.escapeHtml(project.name) : '不明な案件'}</span>
                    </div>
                    <div style="background: #fff8e1; border: 3px solid #f57c00; border-radius: 8px; padding: 16px; margin-top: 12px;">
                        <h2 style="font-size: 16px; color: #e65100; margin-bottom: 8px; border-bottom: 2px solid #f57c00; padding-bottom: 4px;">
                            【${this.escapeHtml(signboard.content.projectName || signboard.title)}】
                        </h2>
                        <div style="font-size: 13px; line-height: 1.6;">
                            ${signboard.content.constructionPeriod ? `<div><strong>工事期間:</strong> ${this.escapeHtml(signboard.content.constructionPeriod)}</div>` : ''}
                            ${signboard.content.contractor ? `<div><strong>施工会社:</strong> ${this.escapeHtml(signboard.content.contractor)}</div>` : ''}
                            ${signboard.content.supervisor ? `<div><strong>監督者:</strong> ${this.escapeHtml(signboard.content.supervisor)}</div>` : ''}
                            ${signboard.content.contact ? `<div><strong>連絡先:</strong> ${this.escapeHtml(signboard.content.contact)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async showCreateSignboardModal() {
        await this.loadProjects();

        const select = document.getElementById('signboard-project-select');
        select.innerHTML = this.projects.map(p =>
            `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`
        ).join('');

        document.getElementById('signboard-form').reset();
        this.openModal('signboard-modal');
    }

    async saveSignboard() {
        const form = document.getElementById('signboard-form');
        const formData = new FormData(form);

        const data = {
            projectId: formData.get('projectId'),
            title: formData.get('title'),
            content: {
                projectName: formData.get('projectName') || formData.get('title'),
                constructionPeriod: formData.get('constructionPeriod') || '',
                contractor: formData.get('contractor') || '',
                supervisor: formData.get('supervisor') || '',
                contact: formData.get('contact') || '',
            },
            template: 'standard',
        };

        try {
            await this.api('/signboards', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            this.closeModal('signboard-modal');
            await this.loadSignboards();
            this.renderSignboards();
            alert('工事看板を保存しました');
        } catch (error) {
            // エラーハンドリングはapi()で行う
        }
    }

    // ===================
    // 写真管理
    // ===================

    async loadPhotos() {
        const response = await this.api('/photos');
        this.photos = response.data?.items || [];
    }

    renderPhotos() {
        const container = document.getElementById('photos-list');

        if (this.photos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📷</div>
                    <p>まだ写真がありません</p>
                    <p style="font-size: 13px; margin-top: 8px;">右下の📸ボタンから撮影してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.photos.map(photo => {
            const project = this.projects.find(p => p.id === photo.projectId);
            return `
                <div class="card">
                    <h3>${photo.caption || '写真'}</h3>
                    <div class="card-meta">
                        <span>🏗️ ${project ? this.escapeHtml(project.name) : '不明な案件'}</span>
                        <span>📅 ${this.formatDate(photo.takenAt)}</span>
                    </div>
                    <div style="aspect-ratio: 16/9; background: #f5f5f5; border-radius: 8px; margin-top: 12px; overflow: hidden;">
                        <img src="/uploads/${photo.filename}" alt="${photo.caption || ''}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <p style="font-size: 13px; color: #666; margin-top: 8px;">
                        ${photo.filename} • ${photo.metadata.width}x${photo.metadata.height} • ${this.formatFileSize(photo.metadata.size)}
                    </p>
                </div>
            `;
        }).join('');
    }

    // ===================
    // カメラ機能
    // ===================

    async showCameraModal() {
        await this.loadProjects();

        const select = document.getElementById('camera-project-select');
        select.innerHTML = '<option value="">案件を選択...</option>' + this.projects.map(p =>
            `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`
        ).join('');

        this.openModal('camera-modal');
        await this.startCamera();
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // バックカメラを優先
                audio: false
            });

            this.cameraStream = stream;
            const video = document.getElementById('camera-video');
            video.srcObject = stream;
        } catch (error) {
            console.error('カメラアクセスエラー:', error);
            alert('カメラにアクセスできませんでした。ブラウザの設定を確認してください。');
        }
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
    }

    async capturePhoto() {
        const projectId = document.getElementById('camera-project-select').value;
        if (!projectId) {
            alert('案件を選択してください');
            return;
        }

        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const caption = document.getElementById('camera-caption').value;

        // キャンバスにビデオフレームを描画
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Blobに変換
        canvas.toBlob(async (blob) => {
            await this.uploadPhoto(blob, projectId, caption);
        }, 'image/jpeg', 0.9);
    }

    async uploadPhoto(blob, projectId, caption) {
        const formData = new FormData();
        formData.append('photo', blob, `photo-${Date.now()}.jpg`);
        formData.append('projectId', projectId);
        if (caption) {
            formData.append('caption', caption);
        }

        try {
            const response = await fetch(API_BASE + '/photos/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('アップロードに失敗しました');
            }

            await response.json();

            this.closeCameraModal();
            await this.loadPhotos();
            this.renderPhotos();

            // 写真タブに切り替え
            this.switchTab('photos');

            alert('写真をアップロードしました');
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert('写真のアップロードに失敗しました');
        }
    }

    closeCameraModal() {
        this.stopCamera();
        this.closeModal('camera-modal');
        document.getElementById('camera-caption').value = '';
    }

    // ===================
    // モーダル制御
    // ===================

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');

        if (modalId === 'camera-modal') {
            this.stopCamera();
        }
    }

    // ===================
    // ユーティリティ
    // ===================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    getStatusLabel(status) {
        const labels = {
            planned: '計画中',
            in_progress: '進行中',
            completed: '完了',
            cancelled: '中止',
        };
        return labels[status] || status;
    }
}

// アプリケーション初期化
const app = new App();

console.log('🌸 工事看板写真システム起動');
