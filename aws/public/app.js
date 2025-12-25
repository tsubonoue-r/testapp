/**
 * 工事看板写真システム - クライアントアプリケーション
 */

const API_BASE = 'https://bj4xtgc6e7.execute-api.ap-northeast-1.amazonaws.com/prod/api';

class App {
    constructor() {
        this.projects = [];
        this.signboards = [];
        this.photos = [];
        this.currentProject = null;
        this.cameraStream = null;
        this.currentEditingSignboard = null;
        this.drawingCanvas = null;
        this.drawingCtx = null;
        this.isDrawing = false;
        this.drawTool = 'pen';
        this.penSize = 3;
        this.penColor = '#000000';
        this.lastX = 0;
        this.lastY = 0;

        // 写真注釈機能用
        this.currentEditingPhoto = null;
        this.annotationCanvas = null;
        this.annotationCtx = null;
        this.annotationTool = 'pen';
        this.annotationLineWidth = 3;
        this.annotationColor = '#ff0000';
        this.isAnnotating = false;
        this.annotationStartX = 0;
        this.annotationStartY = 0;
        this.annotationTempImage = null;
        this.annotations = [];

        // 写真一括管理機能用
        this.selectionMode = false;
        this.selectedPhotos = new Set();

        // 案件アーカイブ機能用
        this.showArchivedProjects = false;

        // 写真表示モード
        this.photoViewMode = 'grid'; // 'grid' or 'list'

        // ファイルアップロード用（Phase 7-1）
        this.uploadQueue = [];
        this.uploadMetadata = {
            projectId: null,
            signboardId: null,
            processType: '',
            location: '',
            workType: '',
            caption: ''
        };

        // ダークモード（Phase 7-6）
        this.darkMode = localStorage.getItem('darkMode') === 'true';

        // プロジェクトテンプレート（Phase 7-2）
        this.projectTemplates = this.loadTemplates();

        this.init();
    }

    async init() {
        console.log('🚀 アプリ初期化開始');

        // ダークモードを適用
        this.applyDarkMode();

        try {
            // イベントリスナー設定
            this.setupEventListeners();
            console.log('✅ イベントリスナー設定完了');

            // 初期データ読み込み
            await this.loadProjects();
            console.log('✅ 案件データ読み込み完了');

            await this.loadSignboards();
            console.log('✅ 看板データ読み込み完了');

            await this.loadPhotos();
            console.log('✅ 写真データ読み込み完了');

            this.renderDashboard();
            this.renderProjects();
            this.renderSignboards();
            this.renderPhotos();

            console.log('✅ アプリ初期化完了');
        } catch (error) {
            console.error('❌ アプリ初期化エラー:', error);
            // エラーが発生してもアプリは使えるようにする
            this.projects = [];
            this.signboards = [];
            this.photos = [];
            this.renderDashboard();
            this.renderProjects();
            this.renderSignboards();
            this.renderPhotos();
        }
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
            console.error('❌ API Error:', error);
            console.error('   Endpoint:', endpoint);
            console.error('   API_BASE:', API_BASE);
            // 初期化時のエラーは再スローせず、空の応答を返す
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.error('   ネットワークエラー: サーバーに接続できません');
                return { success: false, data: null };
            }
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

        // アーカイブフィルタリング
        const filteredProjects = this.projects.filter(project => {
            if (this.showArchivedProjects) {
                return true; // 全て表示
            } else {
                return !project.archived; // アーカイブ済みを除外
            }
        });

        if (filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>${this.showArchivedProjects ? 'アーカイブ済みの案件がありません' : 'まだ案件がありません'}</p>
                    <p style="font-size: 13px; margin-top: 8px;">「新しい案件を作成」ボタンから追加してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredProjects.map(project => `
            <div class="card" style="${project.archived ? 'opacity: 0.7; border-left: 4px solid #999;' : ''}">
                <h3>${this.escapeHtml(project.name)} ${project.archived ? '📦' : ''}</h3>
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
                    <button class="btn ${project.archived ? 'btn-primary' : 'btn-secondary'}" onclick="app.archiveProject('${project.id}', ${!project.archived})">
                        ${project.archived ? '📤 復元' : '📦 アーカイブ'}
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteProject('${project.id}')">削除</button>
                </div>
            </div>
        `).join('');
    }

    showCreateProjectModal() {
        document.getElementById('project-modal-title').textContent = '新しい案件を作成';
        document.getElementById('project-form').reset();
        this.currentProject = null;
        this.updateTemplateSelect();
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

    // アーカイブ済み表示切り替え
    toggleArchivedProjects() {
        this.showArchivedProjects = document.getElementById('show-archived-projects').checked;
        this.renderProjects();
    }

    // 案件アーカイブ/アンアーカイブ
    async archiveProject(id, archived) {
        try {
            await this.api(`/projects/${id}/archive`, {
                method: 'PATCH',
                body: JSON.stringify({ archived }),
            });

            await this.loadProjects();
            this.renderProjects();
            alert(archived ? '案件をアーカイブしました' : '案件を復元しました');
        } catch (error) {
            // エラーハンドリングはapi()で行う
        }
    }

    // 写真表示モード切り替え
    changeViewMode() {
        this.photoViewMode = document.getElementById('photo-view-mode').value;
        this.renderPhotos();
    }

    // 案件エクスポート
    exportProjects(format) {
        if (this.projects.length === 0) {
            alert('エクスポートする案件がありません');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `projects_${timestamp}.${format}`;

        if (format === 'json') {
            const json = JSON.stringify(this.projects, null, 2);
            this.downloadFile(json, filename, 'application/json');
        } else if (format === 'csv') {
            const headers = ['ID', '案件名', '場所', '開始日', '終了日', '状態', '説明', 'アーカイブ'];
            const rows = this.projects.map(p => [
                p.id,
                p.name,
                p.location,
                p.startDate,
                p.endDate || '',
                p.status,
                p.description || '',
                p.archived ? 'はい' : 'いいえ'
            ]);
            const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            this.downloadFile(csv, filename, 'text/csv');
        }

        alert(`${format.toUpperCase()}ファイルをダウンロードしました`);
    }

    // 写真エクスポート
    exportPhotos(format) {
        if (this.photos.length === 0) {
            alert('エクスポートする写真がありません');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `photos_${timestamp}.${format}`;

        if (format === 'json') {
            const json = JSON.stringify(this.photos, null, 2);
            this.downloadFile(json, filename, 'application/json');
        } else if (format === 'csv') {
            const headers = ['ID', 'キャプション', '案件ID', 'ファイル名', '撮影日時', '工程', '撮影箇所', '工種'];
            const rows = this.photos.map(p => [
                p.id,
                p.caption || '',
                p.projectId,
                p.filename,
                p.takenAt,
                p.category?.process || '',
                p.category?.location || '',
                p.category?.workType || ''
            ]);
            const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            this.downloadFile(csv, filename, 'text/csv');
        }

        alert(`${format.toUpperCase()}ファイルをダウンロードしました`);
    }

    // ファイルダウンロードヘルパー
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===================
    // ダッシュボード
    // ===================

    renderDashboard() {
        // サマリー統計
        document.getElementById('stat-projects').textContent = this.projects.length;
        document.getElementById('stat-photos').textContent = this.photos.length;
        document.getElementById('stat-signboards').textContent = this.signboards.length;

        // 案件別写真数
        const projectPhotoCount = {};
        this.photos.forEach(photo => {
            projectPhotoCount[photo.projectId] = (projectPhotoCount[photo.projectId] || 0) + 1;
        });

        const projectStatsHtml = this.projects
            .map(project => {
                const count = projectPhotoCount[project.id] || 0;
                const percentage = this.photos.length > 0 ? (count / this.photos.length * 100).toFixed(1) : 0;
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-weight: 600;">${this.escapeHtml(project.name)}</span>
                            <span style="color: #667eea; font-weight: 600;">${count}枚 (${percentage}%)</span>
                        </div>
                        <div style="background: #f5f5f5; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            })
            .join('') || '<p style="color: #999;">データがありません</p>';
        document.getElementById('project-stats').innerHTML = projectStatsHtml;

        // 工程区分別集計
        const processCount = {};
        this.photos.forEach(photo => {
            const process = photo.category?.process || '未分類';
            processCount[process] = (processCount[process] || 0) + 1;
        });

        const processLabels = {
            foundation: '基礎',
            structure: '躯体',
            finishing: '仕上げ',
            completion: '完成',
            inspection: '検査',
            other: 'その他',
            '未分類': '未分類'
        };

        const processStatsHtml = Object.entries(processCount)
            .sort((a, b) => b[1] - a[1])
            .map(([process, count]) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>${processLabels[process] || process}</span>
                    <span style="font-weight: 600; color: #667eea;">${count}枚</span>
                </div>
            `)
            .join('') || '<p style="color: #999;">データがありません</p>';
        document.getElementById('category-process-stats').innerHTML = processStatsHtml;

        // 工種別集計
        const workTypeCount = {};
        this.photos.forEach(photo => {
            const workType = photo.category?.workType || '未分類';
            workTypeCount[workType] = (workTypeCount[workType] || 0) + 1;
        });

        const workTypeLabels = {
            architecture: '建築',
            electrical: '電気',
            plumbing: '設備',
            civil: '土木',
            landscape: '外構',
            other: 'その他',
            '未分類': '未分類'
        };

        const workTypeStatsHtml = Object.entries(workTypeCount)
            .sort((a, b) => b[1] - a[1])
            .map(([workType, count]) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>${workTypeLabels[workType] || workType}</span>
                    <span style="font-weight: 600; color: #667eea;">${count}枚</span>
                </div>
            `)
            .join('') || '<p style="color: #999;">データがありません</p>';
        document.getElementById('category-worktype-stats').innerHTML = workTypeStatsHtml;

        // 最近の活動
        const recentPhotos = [...this.photos]
            .sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt))
            .slice(0, 5);

        const recentActivityHtml = recentPhotos
            .map(photo => {
                const project = this.projects.find(p => p.id === photo.projectId);
                return `
                    <div style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eee;">
                        <img src="/uploads/${photo.filename}" alt="${photo.caption || ''}"
                             style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${photo.caption || '写真'}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                ${project ? this.escapeHtml(project.name) : '不明な案件'} • ${this.formatDate(photo.takenAt)}
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('') || '<p style="color: #999;">データがありません</p>';
        document.getElementById('recent-activity').innerHTML = recentActivityHtml;
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
                    <div class="card-actions">
                        <button class="btn btn-secondary" onclick="app.showEditSignboardModal('${signboard.id}')">🖊️ 編集</button>
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

    async loadPhotos(projectId = null) {
        const endpoint = projectId ? `/photos?projectId=${projectId}` : '/photos';
        const response = await this.api(endpoint);
        this.photos = response.data?.items || [];
    }

    renderPhotos() {
        const container = document.getElementById('photos-list');

        // フィルタードロップダウンを更新
        this.updatePhotoProjectFilter();

        if (this.photos.length === 0) {
            const filterSelect = document.getElementById('photo-project-filter');
            const selectedProjectId = filterSelect?.value;
            const emptyMessage = selectedProjectId
                ? 'この案件の写真がありません'
                : 'まだ写真がありません';

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📷</div>
                    <p>${emptyMessage}</p>
                    <p style="font-size: 13px; margin-top: 8px;">右下の📸ボタンから撮影してください</p>
                </div>
            `;
            return;
        }

        if (this.photoViewMode === 'list') {
            // リスト表示
            container.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                            ${this.selectionMode ? '<th style="padding: 12px; text-align: left; width: 40px;"></th>' : ''}
                            <th style="padding: 12px; text-align: left; width: 80px;">サムネイル</th>
                            <th style="padding: 12px; text-align: left;">キャプション</th>
                            <th style="padding: 12px; text-align: left;">案件</th>
                            <th style="padding: 12px; text-align: left;">カテゴリー</th>
                            <th style="padding: 12px; text-align: left;">撮影日時</th>
                            ${!this.selectionMode ? '<th style="padding: 12px; text-align: left; width: 120px;">操作</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.photos.map(photo => {
                            const project = this.projects.find(p => p.id === photo.projectId);
                            const categoryBadges = this.renderCategoryBadges(photo.category);
                            const isSelected = this.selectedPhotos.has(photo.id);

                            return `
                                <tr style="border-bottom: 1px solid #eee;">
                                    ${this.selectionMode ? `
                                        <td style="padding: 12px;">
                                            <input type="checkbox"
                                                   ${isSelected ? 'checked' : ''}
                                                   onchange="app.togglePhotoSelection('${photo.id}')"
                                                   style="width: 20px; height: 20px; cursor: pointer;">
                                        </td>
                                    ` : ''}
                                    <td style="padding: 12px;">
                                        <img src="/uploads/${photo.filename}" alt="${photo.caption || ''}"
                                             style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">
                                    </td>
                                    <td style="padding: 12px; font-weight: 600;">${photo.caption || '写真'}</td>
                                    <td style="padding: 12px;">${project ? this.escapeHtml(project.name) : '不明な案件'}</td>
                                    <td style="padding: 12px;">${categoryBadges || '-'}</td>
                                    <td style="padding: 12px;">${this.formatDate(photo.takenAt)}</td>
                                    ${!this.selectionMode ? `
                                        <td style="padding: 12px;">
                                            <button class="btn btn-primary" onclick="app.editPhoto('${photo.id}')" style="padding: 6px 12px; font-size: 12px;">✏️ 編集</button>
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            // グリッド表示
            container.innerHTML = this.photos.map(photo => {
                const project = this.projects.find(p => p.id === photo.projectId);
                const categoryBadges = this.renderCategoryBadges(photo.category);
                const isSelected = this.selectedPhotos.has(photo.id);
                const checkboxHtml = this.selectionMode ? `
                    <div style="position: absolute; top: 8px; left: 8px; z-index: 10;">
                        <input type="checkbox"
                               ${isSelected ? 'checked' : ''}
                               onchange="app.togglePhotoSelection('${photo.id}')"
                               style="width: 24px; height: 24px; cursor: pointer;">
                    </div>
                ` : '';

                return `
                    <div class="card" style="position: relative;">
                        ${checkboxHtml}
                        <h3>${photo.caption || '写真'}</h3>
                        <div class="card-meta">
                            <span>🏗️ ${project ? this.escapeHtml(project.name) : '不明な案件'}</span>
                            <span>📅 ${this.formatDate(photo.takenAt)}</span>
                        </div>
                        ${categoryBadges ? `<div style="margin-top: 8px;">${categoryBadges}</div>` : ''}
                        <div style="aspect-ratio: 16/9; background: #f5f5f5; border-radius: 8px; margin-top: 12px; overflow: hidden;">
                            <img src="/uploads/${photo.filename}" alt="${photo.caption || ''}" style="width: 100%; height: 100%; object-fit: cover;" id="photo-img-${photo.id}">
                        </div>
                        <p style="font-size: 13px; color: #666; margin-top: 8px;">
                            ${photo.filename} • ${photo.metadata.width}x${photo.metadata.height} • ${this.formatFileSize(photo.metadata.size)}
                        </p>
                        <div class="card-actions" style="${this.selectionMode ? 'display: none;' : ''}">
                            <button class="btn btn-primary" onclick="app.editPhoto('${photo.id}')">✏️ 注釈を追加</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    updatePhotoProjectFilter() {
        const filterSelect = document.getElementById('photo-project-filter');
        if (!filterSelect) return;

        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">すべての案件</option>' + this.projects.map(p =>
            `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`
        ).join('');

        // 前の選択を保持
        if (currentValue) {
            filterSelect.value = currentValue;
        }
    }

    async filterPhotosByProject() {
        await this.filterPhotos();
    }

    async filterPhotos() {
        // 検索クエリ
        const searchQuery = document.getElementById('photo-search-query')?.value.toLowerCase() || '';

        // 案件フィルター
        const projectId = document.getElementById('photo-project-filter')?.value || null;

        // カテゴリーフィルター
        const categoryProcess = document.getElementById('photo-category-process-filter')?.value || '';
        const categoryLocation = document.getElementById('photo-category-location-filter')?.value || '';
        const categoryWorkType = document.getElementById('photo-category-worktype-filter')?.value || '';

        // まず案件でフィルター（APIレベル）
        await this.loadPhotos(projectId);

        // その後クライアント側でフィルター
        if (searchQuery || categoryProcess || categoryLocation || categoryWorkType) {
            this.photos = this.photos.filter(photo => {
                // 全文検索フィルター
                if (searchQuery) {
                    const searchTargets = [
                        photo.caption || '',
                        photo.category?.process || '',
                        photo.category?.location || '',
                        photo.category?.workType || '',
                        photo.filename || ''
                    ].join(' ').toLowerCase();

                    if (!searchTargets.includes(searchQuery)) {
                        return false;
                    }
                }

                // カテゴリーフィルター
                if (categoryProcess || categoryLocation || categoryWorkType) {
                    if (!photo.category) return false;

                    // 工程区分フィルター
                    if (categoryProcess && photo.category.process !== categoryProcess) {
                        return false;
                    }

                    // 撮影箇所フィルター（部分一致）
                    if (categoryLocation && (!photo.category.location || !photo.category.location.includes(categoryLocation))) {
                        return false;
                    }

                    // 工種フィルター
                    if (categoryWorkType && photo.category.workType !== categoryWorkType) {
                        return false;
                    }
                }

                return true;
            });
        }

        // ソートを適用してから表示
        this.sortPhotos();
    }

    // 写真一覧ソート機能
    sortPhotos() {
        const sortBy = document.getElementById('photo-sort-by')?.value || 'date-desc';

        switch(sortBy) {
            case 'date-desc':
                // 撮影日時（新しい順）
                this.photos.sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
                break;

            case 'date-asc':
                // 撮影日時（古い順）
                this.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
                break;

            case 'category':
                // カテゴリー順（工程 → 撮影箇所 → 工種）
                this.photos.sort((a, b) => {
                    // 工程区分で比較
                    const processA = a.category?.process || '';
                    const processB = b.category?.process || '';
                    if (processA !== processB) {
                        return processA.localeCompare(processB);
                    }

                    // 撮影箇所で比較
                    const locationA = a.category?.location || '';
                    const locationB = b.category?.location || '';
                    if (locationA !== locationB) {
                        return locationA.localeCompare(locationB);
                    }

                    // 工種で比較
                    const workTypeA = a.category?.workType || '';
                    const workTypeB = b.category?.workType || '';
                    return workTypeA.localeCompare(workTypeB);
                });
                break;

            case 'filename-asc':
                // ファイル名（昇順）
                this.photos.sort((a, b) => {
                    const filenameA = a.filename || '';
                    const filenameB = b.filename || '';
                    return filenameA.localeCompare(filenameB);
                });
                break;

            case 'filename-desc':
                // ファイル名（降順）
                this.photos.sort((a, b) => {
                    const filenameA = a.filename || '';
                    const filenameB = b.filename || '';
                    return filenameB.localeCompare(filenameA);
                });
                break;
        }

        this.renderPhotos();
    }

    // ===================
    // カメラ機能
    // ===================

    async showCameraModal() {
        await this.loadProjects();
        await this.loadSignboards();

        const projectSelect = document.getElementById('camera-project-select');
        projectSelect.innerHTML = '<option value="">案件を選択...</option>' + this.projects.map(p =>
            `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`
        ).join('');

        const signboardSelect = document.getElementById('camera-signboard-select');
        signboardSelect.innerHTML = '<option value="">看板なし</option>' + this.signboards.map(s =>
            `<option value="${s.id}">${this.escapeHtml(s.title)}</option>`
        ).join('');

        // 看板選択時のイベントリスナー
        signboardSelect.onchange = () => this.updateCameraSignboardOverlay();

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
        const signboardId = document.getElementById('camera-signboard-select').value;

        // カテゴリー情報を取得
        const categoryProcess = document.getElementById('camera-category-process').value;
        const categoryLocation = document.getElementById('camera-category-location').value;
        const categoryWorkType = document.getElementById('camera-category-worktype').value;

        const category = {};
        if (categoryProcess) category.process = categoryProcess;
        if (categoryLocation) category.location = categoryLocation;
        if (categoryWorkType) category.workType = categoryWorkType;

        // キャンバスにビデオフレームを描画
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // 看板オーバーレイを合成
        if (signboardId) {
            await this.drawSignboardOnCanvas(ctx, canvas, signboardId);
        }

        // Blobに変換
        canvas.toBlob(async (blob) => {
            await this.uploadPhoto(blob, projectId, caption, signboardId, category);
        }, 'image/jpeg', 0.9);
    }

    async drawSignboardOnCanvas(ctx, canvas, signboardId) {
        const signboard = this.signboards.find(s => s.id === signboardId);
        if (!signboard) return;

        // オーバーレイの位置とサイズ
        const padding = 20;
        const overlayWidth = canvas.width - padding * 2;
        const overlayHeight = 150;
        const overlayX = padding;
        const overlayY = canvas.height - overlayHeight - padding;

        // 背景描画
        ctx.fillStyle = 'rgba(255, 248, 225, 0.95)';
        ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

        // 枠線描画
        ctx.strokeStyle = '#f57c00';
        ctx.lineWidth = 3;
        ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

        // テキスト描画
        ctx.fillStyle = '#e65100';
        ctx.font = 'bold 24px sans-serif';
        const titleText = `【${signboard.content.projectName || signboard.title}】`;
        ctx.fillText(titleText, overlayX + 12, overlayY + 35);

        // 区切り線
        ctx.strokeStyle = '#f57c00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(overlayX + 12, overlayY + 45);
        ctx.lineTo(overlayX + overlayWidth - 12, overlayY + 45);
        ctx.stroke();

        // 詳細情報
        ctx.fillStyle = '#000';
        ctx.font = '16px sans-serif';
        let textY = overlayY + 68;
        const lineHeight = 22;

        if (signboard.content.constructionPeriod) {
            ctx.fillText(`工事期間: ${signboard.content.constructionPeriod}`, overlayX + 12, textY);
            textY += lineHeight;
        }
        if (signboard.content.contractor) {
            ctx.fillText(`施工会社: ${signboard.content.contractor}`, overlayX + 12, textY);
            textY += lineHeight;
        }
        if (signboard.content.supervisor) {
            ctx.fillText(`監督者: ${signboard.content.supervisor}`, overlayX + 12, textY);
        }
    }

    async uploadPhoto(blob, projectId, caption, signboardId, category) {
        const formData = new FormData();
        formData.append('photo', blob, `photo-${Date.now()}.jpg`);
        formData.append('projectId', projectId);
        if (caption) {
            formData.append('caption', caption);
        }
        if (signboardId) {
            formData.append('signboardId', signboardId);
        }
        if (category && Object.keys(category).length > 0) {
            formData.append('category', JSON.stringify(category));
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

    // ===================
    // カテゴリー表示
    // ===================

    renderCategoryBadges(category) {
        if (!category) return '';

        const badges = [];

        if (category.process) {
            const processLabels = {
                foundation: '基礎',
                structure: '躯体',
                finishing: '仕上げ',
                completion: '完成',
                inspection: '検査',
                other: 'その他',
            };
            badges.push(`<span class="badge" style="background: #e3f2fd; color: #1976d2;">📋 ${processLabels[category.process] || category.process}</span>`);
        }

        if (category.location) {
            badges.push(`<span class="badge" style="background: #f3e5f5; color: #7b1fa2;">📍 ${this.escapeHtml(category.location)}</span>`);
        }

        if (category.workType) {
            const workTypeLabels = {
                architecture: '建築',
                electrical: '電気',
                plumbing: '設備',
                civil: '土木',
                landscape: '外構',
                other: 'その他',
            };
            badges.push(`<span class="badge" style="background: #fff3e0; color: #f57c00;">🔧 ${workTypeLabels[category.workType] || category.workType}</span>`);
        }

        return badges.join(' ');
    }

    // ===================
    // 看板編集機能（黒板モード）
    // ===================

    showEditSignboardModal(signboardId) {
        const signboard = this.signboards.find(s => s.id === signboardId);
        if (!signboard) {
            alert('看板が見つかりません');
            return;
        }

        this.currentEditingSignboard = signboard;
        this.openModal('edit-signboard-modal');

        // Canvas初期化
        setTimeout(() => {
            this.initDrawingCanvas(signboard);
        }, 100);
    }

    initDrawingCanvas(signboard) {
        this.drawingCanvas = document.getElementById('edit-canvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');

        // Canvas サイズ設定
        const container = this.drawingCanvas.parentElement;
        this.drawingCanvas.width = container.clientWidth;
        this.drawingCanvas.height = 400;

        // 看板の背景を描画
        this.drawSignboardBackground(signboard);

        // イベントリスナー設定
        this.drawingCanvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.drawingCanvas.addEventListener('mousemove', this.draw.bind(this));
        this.drawingCanvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.drawingCanvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // タッチイベント対応
        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingCanvas.dispatchEvent(mouseEvent);
        });

        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingCanvas.dispatchEvent(mouseEvent);
        });

        this.drawingCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.drawingCanvas.dispatchEvent(mouseEvent);
        });
    }

    drawSignboardBackground(signboard) {
        const ctx = this.drawingCtx;
        const canvas = this.drawingCanvas;

        // 背景色
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // テキスト描画
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`【${signboard.content.projectName || signboard.title}】`, 20, 40);

        ctx.font = '14px sans-serif';
        let y = 70;
        if (signboard.content.constructionPeriod) {
            ctx.fillText(`工事期間: ${signboard.content.constructionPeriod}`, 20, y);
            y += 25;
        }
        if (signboard.content.contractor) {
            ctx.fillText(`施工会社: ${signboard.content.contractor}`, 20, y);
            y += 25;
        }
        if (signboard.content.supervisor) {
            ctx.fillText(`監督者: ${signboard.content.supervisor}`, 20, y);
            y += 25;
        }
        if (signboard.content.contact) {
            ctx.fillText(`連絡先: ${signboard.content.contact}`, 20, y);
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ctx = this.drawingCtx;
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = this.drawTool === 'eraser' ? '#fff8e1' : this.penColor;
        ctx.lineWidth = this.drawTool === 'eraser' ? this.penSize * 3 : this.penSize;
        ctx.lineCap = 'round';
        ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    setDrawTool(tool) {
        this.drawTool = tool;
        document.getElementById('tool-pen').classList.toggle('btn-primary', tool === 'pen');
        document.getElementById('tool-pen').classList.toggle('btn-secondary', tool !== 'pen');
        document.getElementById('tool-eraser').classList.toggle('btn-primary', tool === 'eraser');
        document.getElementById('tool-eraser').classList.toggle('btn-secondary', tool !== 'eraser');
    }

    setPenSize(size) {
        this.penSize = parseInt(size);
    }

    setPenColor(color) {
        this.penColor = color;
    }

    clearCanvas() {
        if (confirm('看板を初期状態に戻しますか？')) {
            this.drawSignboardBackground(this.currentEditingSignboard);
        }
    }

    async saveEditedSignboard() {
        // Canvas を画像として保存（将来的にはサーバーに送信）
        const imageData = this.drawingCanvas.toDataURL('image/png');

        // 現時点では編集内容をローカルストレージに保存
        const editedData = {
            signboardId: this.currentEditingSignboard.id,
            imageData: imageData,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(`signboard_edit_${this.currentEditingSignboard.id}`, JSON.stringify(editedData));

        alert('看板の編集内容を保存しました');
        this.closeEditSignboardModal();
    }

    closeEditSignboardModal() {
        this.closeModal('edit-signboard-modal');
        this.currentEditingSignboard = null;
    }

    // ===================
    // カメラオーバーレイ機能
    // ===================

    async updateCameraSignboardOverlay() {
        const signboardId = document.getElementById('camera-signboard-select').value;
        const videoContainer = document.querySelector('.camera-container');

        // 既存のオーバーレイを削除
        const existingOverlay = videoContainer.querySelector('.signboard-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        if (!signboardId) return;

        const signboard = this.signboards.find(s => s.id === signboardId);
        if (!signboard) return;

        // オーバーレイHTML作成
        const overlay = document.createElement('div');
        overlay.className = 'signboard-overlay';
        overlay.innerHTML = `
            <h3>【${this.escapeHtml(signboard.content.projectName || signboard.title)}】</h3>
            <div class="content">
                ${signboard.content.constructionPeriod ? `<div>工事期間: ${this.escapeHtml(signboard.content.constructionPeriod)}</div>` : ''}
                ${signboard.content.contractor ? `<div>施工会社: ${this.escapeHtml(signboard.content.contractor)}</div>` : ''}
                ${signboard.content.supervisor ? `<div>監督者: ${this.escapeHtml(signboard.content.supervisor)}</div>` : ''}
                ${signboard.content.contact ? `<div>連絡先: ${this.escapeHtml(signboard.content.contact)}</div>` : ''}
            </div>
        `;

        videoContainer.appendChild(overlay);
    }

    // ===================
    // 写真注釈機能
    // ===================

    async editPhoto(photoId) {
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) {
            console.error('写真が見つかりません:', photoId);
            return;
        }

        this.currentEditingPhoto = photo;
        this.annotations = [];

        // モーダルを開く
        this.openModal('edit-photo-modal');

        // 画像読み込み完了後にCanvasを初期化
        const img = document.getElementById(`photo-img-${photoId}`);
        if (img.complete) {
            this.initAnnotationCanvas(img);
        } else {
            img.onload = () => this.initAnnotationCanvas(img);
        }
    }

    initAnnotationCanvas(sourceImage) {
        this.annotationCanvas = document.getElementById('annotation-canvas');
        this.annotationCtx = this.annotationCanvas.getContext('2d');

        const container = this.annotationCanvas.parentElement;

        // Canvasサイズを設定
        const maxWidth = container.clientWidth;
        const aspectRatio = sourceImage.naturalHeight / sourceImage.naturalWidth;
        this.annotationCanvas.width = maxWidth;
        this.annotationCanvas.height = maxWidth * aspectRatio;

        // 元画像を描画
        this.annotationCtx.drawImage(
            sourceImage,
            0, 0,
            this.annotationCanvas.width,
            this.annotationCanvas.height
        );

        // 既存の注釈があれば復元
        this.restoreAnnotations();

        // イベントリスナーを設定
        this.setupAnnotationEvents();

        // デフォルトツールを選択状態にする
        this.setAnnotationTool('pen');
    }

    setupAnnotationEvents() {
        // マウスイベント
        this.annotationCanvas.onmousedown = (e) => this.startAnnotating(e);
        this.annotationCanvas.onmousemove = (e) => this.annotate(e);
        this.annotationCanvas.onmouseup = () => this.stopAnnotating();
        this.annotationCanvas.onmouseleave = () => this.stopAnnotating();

        // タッチイベント
        this.annotationCanvas.ontouchstart = (e) => {
            e.preventDefault();
            this.startAnnotating(e.touches[0]);
        };
        this.annotationCanvas.ontouchmove = (e) => {
            e.preventDefault();
            this.annotate(e.touches[0]);
        };
        this.annotationCanvas.ontouchend = () => this.stopAnnotating();
    }

    setAnnotationTool(tool) {
        this.annotationTool = tool;

        // ツールボタンのハイライト更新
        ['pen', 'arrow', 'rectangle', 'circle', 'text', 'eraser'].forEach(t => {
            const btn = document.getElementById(`annotation-tool-${t}`);
            if (btn) {
                if (t === tool) {
                    btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    btn.style.color = 'white';
                } else {
                    btn.style.background = '';
                    btn.style.color = '';
                }
            }
        });
    }

    setAnnotationLineWidth(width) {
        this.annotationLineWidth = parseInt(width);
    }

    setAnnotationColor(color) {
        this.annotationColor = color;
    }

    getCanvasPosition(e) {
        const rect = this.annotationCanvas.getBoundingClientRect();
        const scaleX = this.annotationCanvas.width / rect.width;
        const scaleY = this.annotationCanvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startAnnotating(e) {
        this.isAnnotating = true;
        const pos = this.getCanvasPosition(e);
        this.annotationStartX = pos.x;
        this.annotationStartY = pos.y;

        // テキストツールの場合は入力ダイアログを表示
        if (this.annotationTool === 'text') {
            this.stopAnnotating();
            const text = prompt('追加するテキストを入力してください:');
            if (text) {
                this.addText(text, this.annotationStartX, this.annotationStartY);
            }
            return;
        }

        // 図形・矢印ツールの場合は現在の画像を保存
        if (['arrow', 'rectangle', 'circle'].includes(this.annotationTool)) {
            this.annotationTempImage = this.annotationCtx.getImageData(
                0, 0,
                this.annotationCanvas.width,
                this.annotationCanvas.height
            );
        }

        // ペン・消しゴムツールの場合は描画開始
        if (this.annotationTool === 'pen' || this.annotationTool === 'eraser') {
            this.annotationCtx.beginPath();
            this.annotationCtx.moveTo(pos.x, pos.y);
        }
    }

    annotate(e) {
        if (!this.isAnnotating) return;

        const pos = this.getCanvasPosition(e);

        if (this.annotationTool === 'pen') {
            // ペンで描画
            this.annotationCtx.strokeStyle = this.annotationColor;
            this.annotationCtx.lineWidth = this.annotationLineWidth;
            this.annotationCtx.lineCap = 'round';
            this.annotationCtx.lineJoin = 'round';
            this.annotationCtx.lineTo(pos.x, pos.y);
            this.annotationCtx.stroke();

        } else if (this.annotationTool === 'eraser') {
            // 消しゴム
            this.annotationCtx.globalCompositeOperation = 'destination-out';
            this.annotationCtx.lineWidth = this.annotationLineWidth * 3;
            this.annotationCtx.lineCap = 'round';
            this.annotationCtx.lineTo(pos.x, pos.y);
            this.annotationCtx.stroke();
            this.annotationCtx.globalCompositeOperation = 'source-over';

        } else if (['arrow', 'rectangle', 'circle'].includes(this.annotationTool)) {
            // 図形・矢印のプレビュー
            if (this.annotationTempImage) {
                // 一時保存した画像を復元
                this.annotationCtx.putImageData(this.annotationTempImage, 0, 0);

                // 現在位置まで図形を描画
                this.annotationCtx.strokeStyle = this.annotationColor;
                this.annotationCtx.fillStyle = this.annotationColor;
                this.annotationCtx.lineWidth = this.annotationLineWidth;

                if (this.annotationTool === 'arrow') {
                    this.drawArrow(
                        this.annotationStartX,
                        this.annotationStartY,
                        pos.x,
                        pos.y
                    );
                } else if (this.annotationTool === 'rectangle') {
                    this.annotationCtx.strokeRect(
                        this.annotationStartX,
                        this.annotationStartY,
                        pos.x - this.annotationStartX,
                        pos.y - this.annotationStartY
                    );
                } else if (this.annotationTool === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(pos.x - this.annotationStartX, 2) +
                        Math.pow(pos.y - this.annotationStartY, 2)
                    );
                    this.annotationCtx.beginPath();
                    this.annotationCtx.arc(
                        this.annotationStartX,
                        this.annotationStartY,
                        radius,
                        0,
                        Math.PI * 2
                    );
                    this.annotationCtx.stroke();
                }
            }
        }
    }

    stopAnnotating() {
        if (this.isAnnotating && this.annotationTool === 'pen') {
            // ペンの描画を保存
            this.annotations.push({
                type: 'pen',
                color: this.annotationColor,
                lineWidth: this.annotationLineWidth
            });
        }
        this.isAnnotating = false;
        this.annotationTempImage = null;
    }

    drawArrow(fromX, fromY, toX, toY) {
        const headLength = 20; // 矢印の頭の長さ
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // 線を描画
        this.annotationCtx.beginPath();
        this.annotationCtx.moveTo(fromX, fromY);
        this.annotationCtx.lineTo(toX, toY);
        this.annotationCtx.stroke();

        // 矢印の頭を描画
        this.annotationCtx.beginPath();
        this.annotationCtx.moveTo(toX, toY);
        this.annotationCtx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.annotationCtx.moveTo(toX, toY);
        this.annotationCtx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.annotationCtx.stroke();
    }

    addText(text, x, y) {
        const ctx = this.annotationCtx;
        ctx.fillStyle = this.annotationColor;
        ctx.font = `bold ${this.annotationLineWidth * 8}px sans-serif`;
        ctx.fillText(text, x, y);

        this.annotations.push({
            type: 'text',
            text: text,
            x: x,
            y: y,
            color: this.annotationColor,
            size: this.annotationLineWidth * 8
        });
    }

    addStamp(stampType) {
        if (!this.annotationCanvas) {
            alert('先に写真を選択してください');
            return;
        }

        const ctx = this.annotationCtx;
        const x = this.annotationCanvas.width / 2;
        const y = this.annotationCanvas.height / 2;
        const size = 80;

        // スタンプの背景色と文字色
        let bgColor, textColor, text;
        if (stampType === 'OK') {
            bgColor = '#e8f5e9';
            textColor = '#388e3c';
            text = '✅ OK';
        } else if (stampType === 'NG') {
            bgColor = '#ffebee';
            textColor = '#d32f2f';
            text = '❌ NG';
        } else if (stampType === '要確認') {
            bgColor = '#fff3e0';
            textColor = '#f57c00';
            text = '⚠️ 要確認';
        }

        // 背景を描画
        ctx.fillStyle = bgColor;
        ctx.fillRect(x - size, y - size / 2, size * 2, size);

        // 枠線を描画
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - size, y - size / 2, size * 2, size);

        // テキストを描画
        ctx.fillStyle = textColor;
        ctx.font = `bold ${size / 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);

        // テキスト配置をリセット
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        this.annotations.push({
            type: 'stamp',
            stampType: stampType,
            x: x,
            y: y,
            size: size
        });
    }

    clearAnnotationCanvas() {
        if (!this.annotationCanvas || !this.currentEditingPhoto) return;

        const confirmed = confirm('すべての注釈を消去しますか？');
        if (!confirmed) return;

        this.annotations = [];

        // 元画像を再描画
        const img = document.getElementById(`photo-img-${this.currentEditingPhoto.id}`);
        this.annotationCtx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
        this.annotationCtx.drawImage(
            img,
            0, 0,
            this.annotationCanvas.width,
            this.annotationCanvas.height
        );
    }

    restoreAnnotations() {
        // 将来的に保存された注釈データを復元する場合に使用
        // 現在は何もしない
    }

    async saveAnnotatedPhoto() {
        if (!this.annotationCanvas || !this.currentEditingPhoto) return;

        // Canvasを画像に変換
        this.annotationCanvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('photo', blob, `annotated-${Date.now()}.jpg`);
            formData.append('projectId', this.currentEditingPhoto.projectId);
            formData.append('caption', `${this.currentEditingPhoto.caption || '写真'} (注釈付き)`);

            // カテゴリー情報を引き継ぐ
            if (this.currentEditingPhoto.category) {
                formData.append('category', JSON.stringify(this.currentEditingPhoto.category));
            }

            try {
                const response = await fetch(API_BASE + '/photos/upload', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    alert('注釈付き写真を保存しました');
                    await this.loadPhotos();
                    this.renderPhotos();
                    this.closeEditPhotoModal();
                } else {
                    alert('保存に失敗しました: ' + (result.error?.message || '不明なエラー'));
                }
            } catch (error) {
                console.error('写真アップロードエラー:', error);
                alert('アップロードに失敗しました');
            }
        }, 'image/jpeg', 0.95);
    }

    closeEditPhotoModal() {
        this.closeModal('edit-photo-modal');
        this.currentEditingPhoto = null;
        this.annotations = [];
        this.annotationCanvas = null;
        this.annotationCtx = null;
    }

    // ===================
    // PDF出力機能
    // ===================

    async exportPhotosToPDF() {
        if (this.photos.length === 0) {
            alert('出力する写真がありません');
            return;
        }

        try {
            // jsPDFの初期化
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210; // A4幅（mm）
            const pageHeight = 297; // A4高さ（mm）
            const margin = 15;
            const photosPerPage = 4;
            const cols = 2;
            const rows = 2;

            // 利用可能な幅と高さ
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2);

            // 各写真の配置サイズ
            const photoAreaWidth = availableWidth / cols;
            const photoAreaHeight = availableHeight / rows;

            // 写真サイズ（余白を考慮）
            const photoWidth = photoAreaWidth - 10;
            const photoHeight = (photoAreaHeight - 25); // テキスト用のスペースを確保

            let isFirstPage = true;

            // 写真を4枚ずつ処理
            for (let i = 0; i < this.photos.length; i += photosPerPage) {
                if (!isFirstPage) {
                    doc.addPage();
                }
                isFirstPage = false;

                // ページ内の写真を処理（最大4枚）
                const photosInPage = this.photos.slice(i, i + photosPerPage);

                for (let j = 0; j < photosInPage.length; j++) {
                    const photo = photosInPage[j];
                    const col = j % cols;
                    const row = Math.floor(j / cols);

                    // 配置位置を計算
                    const x = margin + (col * photoAreaWidth) + 5;
                    const y = margin + (row * photoAreaHeight) + 5;

                    try {
                        // 画像をロード
                        const imgData = await this.loadImageAsDataURL(`/uploads/${photo.filename}`);

                        // 画像を追加（アスペクト比を維持）
                        const imgWidth = photoWidth;
                        const imgHeight = photoHeight - 5; // 少し余白を残す
                        doc.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

                        // キャプションを追加
                        const textY = y + imgHeight + 8;
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        const caption = photo.caption || '写真';
                        doc.text(this.truncateText(caption, 25), x, textY);

                        // カテゴリー情報を追加
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        let infoText = '';

                        if (photo.category) {
                            const categoryLabels = {
                                foundation: '基礎',
                                structure: '躯体',
                                finishing: '仕上げ',
                                completion: '完成',
                                inspection: '検査',
                                other: 'その他'
                            };
                            const workTypeLabels = {
                                architecture: '建築',
                                electrical: '電気',
                                plumbing: '設備',
                                civil: '土木',
                                landscape: '外構',
                                other: 'その他'
                            };

                            const parts = [];
                            if (photo.category.process) {
                                parts.push(categoryLabels[photo.category.process] || photo.category.process);
                            }
                            if (photo.category.location) {
                                parts.push(photo.category.location);
                            }
                            if (photo.category.workType) {
                                parts.push(workTypeLabels[photo.category.workType] || photo.category.workType);
                            }
                            infoText = parts.join(' / ');
                        }

                        if (infoText) {
                            doc.text(this.truncateText(infoText, 30), x, textY + 4);
                        }

                        // 撮影日時を追加
                        doc.setFontSize(7);
                        const dateText = this.formatDate(photo.takenAt);
                        doc.text(dateText, x, textY + 8);

                    } catch (error) {
                        console.error('画像の読み込みエラー:', photo.filename, error);
                        // エラー時は枠だけ表示
                        doc.rect(x, y, photoWidth, photoHeight - 5);
                        doc.setFontSize(8);
                        doc.text('画像読み込みエラー', x + 5, y + 15);
                    }
                }
            }

            // PDFを保存
            const projectId = document.getElementById('photo-project-filter')?.value;
            const project = projectId ? this.projects.find(p => p.id === projectId) : null;
            const filename = project
                ? `工事写真_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`
                : `工事写真_${new Date().toISOString().split('T')[0]}.pdf`;

            doc.save(filename);
            alert(`PDFを出力しました: ${filename}`);

        } catch (error) {
            console.error('PDF出力エラー:', error);
            alert('PDF出力に失敗しました: ' + error.message);
        }
    }

    // 画像をDataURLとして読み込む
    async loadImageAsDataURL(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    // テキストを切り詰める
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // ===================
    // PDF設定モーダル機能
    // ===================

    showPDFSettingsModal() {
        this.openModal('pdf-settings-modal');
    }

    closePDFSettingsModal() {
        this.closeModal('pdf-settings-modal');
    }

    async generatePDFWithSettings() {
        try {
            // モーダルから設定を取得
            const layout = parseInt(document.getElementById('pdf-layout').value);
            const companyName = document.getElementById('pdf-company-name').value.trim();
            const projectName = document.getElementById('pdf-project-name').value.trim();
            const showDate = document.getElementById('pdf-show-date').checked;
            const showPageNumber = document.getElementById('pdf-show-page-number').checked;

            // 写真がない場合は警告
            if (this.photos.length === 0) {
                alert('出力する写真がありません');
                return;
            }

            // PDFドキュメントを作成（A4サイズ）
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = 210; // A4幅(mm)
            const pageHeight = 297; // A4高さ(mm)
            const margin = 10;
            const headerHeight = companyName || projectName ? 20 : 0;
            const footerHeight = showDate || showPageNumber ? 10 : 0;

            // 利用可能な領域
            const availableWidth = pageWidth - margin * 2;
            const availableHeight = pageHeight - margin * 2 - headerHeight - footerHeight;

            // レイアウト計算
            let cols, rows;
            switch (layout) {
                case 1:
                    cols = 1; rows = 1;
                    break;
                case 2:
                    cols = 1; rows = 2;
                    break;
                case 4:
                    cols = 2; rows = 2;
                    break;
                case 6:
                    cols = 2; rows = 3;
                    break;
                default:
                    cols = 2; rows = 2;
            }

            const cellWidth = availableWidth / cols;
            const cellHeight = availableHeight / rows;
            const imageMargin = 2;

            let pageCount = 0;
            let currentPhotoIndex = 0;

            while (currentPhotoIndex < this.photos.length) {
                if (pageCount > 0) {
                    pdf.addPage();
                }
                pageCount++;

                // ヘッダーを描画
                if (headerHeight > 0) {
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    let yPos = margin + 7;

                    if (companyName) {
                        pdf.text(companyName, pageWidth / 2, yPos, { align: 'center' });
                        yPos += 6;
                    }

                    if (projectName) {
                        pdf.setFontSize(12);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(projectName, pageWidth / 2, yPos, { align: 'center' });
                    }

                    // ヘッダー下に線を引く
                    pdf.setLineWidth(0.5);
                    pdf.line(margin, margin + headerHeight - 2, pageWidth - margin, margin + headerHeight - 2);
                }

                // 写真を配置
                for (let row = 0; row < rows && currentPhotoIndex < this.photos.length; row++) {
                    for (let col = 0; col < cols && currentPhotoIndex < this.photos.length; col++) {
                        const photo = this.photos[currentPhotoIndex];

                        const x = margin + col * cellWidth;
                        const y = margin + headerHeight + row * cellHeight;

                        // 画像を読み込んでPDFに追加
                        try {
                            const imgData = await this.loadImageAsDataURL(photo.thumbnailUrl);

                            // 画像のアスペクト比を維持しながらセル内に収める
                            const maxImgWidth = cellWidth - imageMargin * 2;
                            const maxImgHeight = cellHeight - imageMargin * 2 - 15; // キャプション分を確保

                            // 仮のサイズで画像を配置（アスペクト比維持）
                            let imgWidth = maxImgWidth;
                            let imgHeight = maxImgHeight;

                            // 中央揃えで配置
                            const imgX = x + imageMargin;
                            const imgY = y + imageMargin;

                            pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);

                            // キャプションを追加
                            pdf.setFontSize(8);
                            pdf.setFont('helvetica', 'normal');
                            const caption = this.truncateText(photo.caption || 'キャプションなし', 30);
                            pdf.text(caption, x + cellWidth / 2, y + cellHeight - 5, { align: 'center' });

                            // カテゴリー情報を追加
                            const project = this.projects.find(p => p.id === photo.projectId);
                            const signboard = this.signboards.find(s => s.id === photo.signboardId);
                            const categoryText = `${project?.name || '不明'} - ${signboard?.processType || '不明'}`;
                            const categoryTruncated = this.truncateText(categoryText, 30);
                            pdf.setFontSize(6);
                            pdf.text(categoryTruncated, x + cellWidth / 2, y + cellHeight - 2, { align: 'center' });

                        } catch (error) {
                            console.error('画像の読み込みに失敗:', error);
                            // エラー時はプレースホルダーを表示
                            pdf.setFontSize(10);
                            pdf.text('画像読み込みエラー', x + cellWidth / 2, y + cellHeight / 2, { align: 'center' });
                        }

                        currentPhotoIndex++;
                    }
                }

                // フッターを描画
                if (footerHeight > 0) {
                    const footerY = pageHeight - margin - 5;
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'normal');

                    if (showDate) {
                        const dateStr = new Date().toLocaleDateString('ja-JP');
                        pdf.text(dateStr, margin, footerY);
                    }

                    if (showPageNumber) {
                        const totalPages = Math.ceil(this.photos.length / layout);
                        pdf.text(`${pageCount} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
                    }
                }
            }

            // PDFを保存
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `photos_${timestamp}.pdf`;
            pdf.save(filename);

            // モーダルを閉じる
            this.closePDFSettingsModal();

            alert(`PDFを出力しました: ${filename}`);
        } catch (error) {
            console.error('PDF出力エラー:', error);
            alert('PDF出力に失敗しました: ' + error.message);
        }
    }

    // ===================
    // 写真一括管理機能
    // ===================

    toggleSelectionMode() {
        this.selectionMode = !this.selectionMode;
        this.selectedPhotos.clear();

        // UIを更新
        const toolbar = document.getElementById('selection-toolbar');
        const modeBtn = document.getElementById('selection-mode-btn');

        if (this.selectionMode) {
            toolbar.style.display = 'block';
            modeBtn.textContent = '✕ 選択解除';
            modeBtn.classList.remove('btn-secondary');
            modeBtn.classList.add('btn-danger');
        } else {
            toolbar.style.display = 'none';
            modeBtn.textContent = '✓ 選択モード';
            modeBtn.classList.remove('btn-danger');
            modeBtn.classList.add('btn-secondary');
        }

        this.updateSelectionCount();
        this.renderPhotos();
    }

    togglePhotoSelection(photoId) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }
        this.updateSelectionCount();
    }

    selectAllPhotos() {
        this.photos.forEach(photo => {
            this.selectedPhotos.add(photo.id);
        });
        this.updateSelectionCount();
        this.renderPhotos();
    }

    updateSelectionCount() {
        const countElement = document.getElementById('selection-count');
        const compareBtn = document.getElementById('compare-btn');

        if (countElement) {
            countElement.textContent = `${this.selectedPhotos.size}枚選択中`;
        }

        // 2枚選択時のみ比較ボタンを表示
        if (compareBtn) {
            compareBtn.style.display = this.selectedPhotos.size === 2 ? 'inline-block' : 'none';
        }
    }

    async bulkDeletePhotos() {
        if (this.selectedPhotos.size === 0) {
            alert('削除する写真を選択してください');
            return;
        }

        const confirmed = confirm(`選択した${this.selectedPhotos.size}枚の写真を削除しますか？\nこの操作は元に戻せません。`);
        if (!confirmed) return;

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const photoId of this.selectedPhotos) {
                try {
                    const response = await this.api(`/photos/${photoId}`, {
                        method: 'DELETE',
                    });

                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error('削除エラー:', photoId, error);
                    errorCount++;
                }
            }

            alert(`${successCount}枚の写真を削除しました${errorCount > 0 ? `\n${errorCount}枚の削除に失敗しました` : ''}`);

            // 選択をクリアして再読み込み
            this.selectedPhotos.clear();
            await this.loadPhotos();
            this.renderPhotos();
            this.updateSelectionCount();

        } catch (error) {
            console.error('一括削除エラー:', error);
            alert('一括削除に失敗しました');
        }
    }

    async bulkMovePhotos() {
        if (this.selectedPhotos.size === 0) {
            alert('移動する写真を選択してください');
            return;
        }

        // 案件選択ダイアログを表示
        const projectOptions = this.projects.map(p =>
            `${p.id}:${this.escapeHtml(p.name)}`
        ).join('\n');

        const selectedProject = prompt(`移動先の案件を選択してください（${this.selectedPhotos.size}枚）\n\n利用可能な案件:\n${this.projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\n番号を入力してください:`);

        if (!selectedProject) return;

        const projectIndex = parseInt(selectedProject) - 1;
        if (projectIndex < 0 || projectIndex >= this.projects.length) {
            alert('無効な番号です');
            return;
        }

        const targetProject = this.projects[projectIndex];

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const photoId of this.selectedPhotos) {
                try {
                    const response = await this.api(`/photos/${photoId}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            projectId: targetProject.id,
                        }),
                    });

                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error('移動エラー:', photoId, error);
                    errorCount++;
                }
            }

            alert(`${successCount}枚の写真を「${targetProject.name}」に移動しました${errorCount > 0 ? `\n${errorCount}枚の移動に失敗しました` : ''}`);

            // 選択をクリアして再読み込み
            this.selectedPhotos.clear();
            await this.loadPhotos();
            this.renderPhotos();
            this.updateSelectionCount();

        } catch (error) {
            console.error('一括移動エラー:', error);
            alert('一括移動に失敗しました');
        }
    }

    // ===================
    // Before/After比較機能
    // ===================

    compareSelectedPhotos() {
        if (this.selectedPhotos.size !== 2) {
            alert('比較するには2枚の写真を選択してください');
            return;
        }

        const selectedIds = Array.from(this.selectedPhotos);
        const photo1 = this.photos.find(p => p.id === selectedIds[0]);
        const photo2 = this.photos.find(p => p.id === selectedIds[1]);

        if (!photo1 || !photo2) {
            alert('写真の読み込みに失敗しました');
            return;
        }

        // 撮影日時で自動的にBefore/Afterを判定
        const [beforePhoto, afterPhoto] = photo1.takenAt < photo2.takenAt
            ? [photo1, photo2]
            : [photo2, photo1];

        // 比較モーダルを開く
        this.openComparisonModal(beforePhoto, afterPhoto);
    }

    openComparisonModal(beforePhoto, afterPhoto) {
        const beforeImg = document.getElementById('comparison-before');
        const afterImg = document.getElementById('comparison-after');
        const beforeInfo = document.getElementById('comparison-before-info');
        const afterInfo = document.getElementById('comparison-after-info');
        const slider = document.getElementById('comparison-slider');

        // 画像を設定
        beforeImg.src = `/uploads/${beforePhoto.filename}`;
        afterImg.src = `/uploads/${afterPhoto.filename}`;

        // 情報を設定
        beforeInfo.textContent = `${beforePhoto.caption || '写真'} - ${this.formatDate(beforePhoto.takenAt)}`;
        afterInfo.textContent = `${afterPhoto.caption || '写真'} - ${this.formatDate(afterPhoto.takenAt)}`;

        // スライダーをリセット
        slider.value = 50;
        afterImg.style.opacity = 0.5;

        // モーダルを開く
        this.openModal('comparison-modal');
    }

    updateComparisonOpacity(value) {
        const afterImg = document.getElementById('comparison-after');
        // 値が0-100なので、0-1に変換
        afterImg.style.opacity = value / 100;
    }

    closeComparisonModal() {
        this.closeModal('comparison-modal');
    }

    // ===================
    // Phase 7-1: ファイルアップロード機能
    // ===================

    showFileUploadModal() {
        // プロジェクトセレクトを更新
        const projectSelect = document.getElementById('upload-project-select');
        projectSelect.innerHTML = '<option value="">案件を選択...</option>';
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });

        // アップロードキューをクリア
        this.uploadQueue = [];
        this.renderUploadPreview();

        this.openModal('file-upload-modal');
    }

    closeFileUploadModal() {
        this.uploadQueue = [];
        this.closeModal('file-upload-modal');
    }

    handleFileInput(event) {
        const files = Array.from(event.target.files);
        this.addFilesToQueue(files);
    }

    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const files = Array.from(event.dataTransfer.files);
        // 画像ファイルのみフィルター
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        this.addFilesToQueue(imageFiles);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    }

    addFilesToQueue(files) {
        files.forEach(file => {
            // プレビュー用のDataURLを生成
            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadQueue.push({
                    file: file,
                    preview: e.target.result,
                    caption: '',
                    processType: '',
                    location: '',
                    workType: ''
                });
                this.renderUploadPreview();
            };
            reader.readAsDataURL(file);
        });
    }

    renderUploadPreview() {
        const container = document.getElementById('upload-preview-container');
        const count = document.getElementById('upload-count');

        count.textContent = `${this.uploadQueue.length}枚`;

        if (this.uploadQueue.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>ファイルをドラッグ&ドロップまたは選択してください</p></div>';
            return;
        }

        container.innerHTML = this.uploadQueue.map((item, index) => `
            <div class="upload-preview-card">
                <img src="${item.preview}" alt="Preview">
                <div class="upload-preview-info">
                    <input type="text" placeholder="キャプション" value="${item.caption}"
                           oninput="app.updateUploadItem(${index}, 'caption', this.value)">
                    <button class="btn btn-danger" onclick="app.removeFromQueue(${index})" style="padding: 4px 8px; font-size: 12px;">削除</button>
                </div>
            </div>
        `).join('');
    }

    updateUploadItem(index, field, value) {
        if (this.uploadQueue[index]) {
            this.uploadQueue[index][field] = value;
        }
    }

    removeFromQueue(index) {
        this.uploadQueue.splice(index, 1);
        this.renderUploadPreview();
    }

    async uploadFiles() {
        const projectId = document.getElementById('upload-project-select').value;
        const processType = document.getElementById('upload-process-type').value;
        const location = document.getElementById('upload-location').value;
        const workType = document.getElementById('upload-work-type').value;

        if (!projectId) {
            alert('案件を選択してください');
            return;
        }

        if (this.uploadQueue.length === 0) {
            alert('アップロードするファイルがありません');
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;

            for (const item of this.uploadQueue) {
                try {
                    const formData = new FormData();
                    formData.append('photo', item.file);
                    formData.append('projectId', projectId);
                    formData.append('caption', item.caption || item.file.name);

                    // カテゴリー情報を追加
                    if (processType) formData.append('processType', processType);
                    if (location) formData.append('location', location);
                    if (workType) formData.append('workType', workType);

                    const response = await fetch(`${API_BASE}/photos/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    failCount++;
                }
            }

            alert(`アップロード完了\n成功: ${successCount}枚\n失敗: ${failCount}枚`);

            // 写真一覧を更新
            await this.loadPhotos();
            this.renderPhotos();

            // モーダルを閉じる
            this.closeFileUploadModal();
        } catch (error) {
            console.error('Upload error:', error);
            alert('アップロードに失敗しました: ' + error.message);
        }
    }

    // ===================
    // Phase 7-6: ダークモード
    // ===================

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyDarkMode();
    }

    applyDarkMode() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // トグルボタンのアイコンを更新
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.darkMode ? '☀️' : '🌙';
        }
    }

    // ===================
    // Phase 7-2: プロジェクトテンプレート
    // ===================

    loadTemplates() {
        const templates = localStorage.getItem('projectTemplates');
        return templates ? JSON.parse(templates) : [];
    }

    saveTemplates() {
        localStorage.setItem('projectTemplates', JSON.stringify(this.projectTemplates));
    }

    saveAsTemplate() {
        const form = document.getElementById('project-form');
        const formData = new FormData(form);

        const templateName = prompt('テンプレート名を入力してください:');
        if (!templateName) return;

        const template = {
            id: Date.now().toString(),
            name: templateName,
            description: formData.get('description') || '',
            location: formData.get('location') || '',
            status: formData.get('status') || 'planned',
            createdAt: new Date().toISOString()
        };

        this.projectTemplates.push(template);
        this.saveTemplates();

        alert(`テンプレート「${templateName}」を保存しました`);
        this.updateTemplateSelect();
    }

    loadTemplate(templateId) {
        const template = this.projectTemplates.find(t => t.id === templateId);
        if (!template) return;

        const form = document.getElementById('project-form');
        form.querySelector('[name="description"]').value = template.description;
        form.querySelector('[name="location"]').value = template.location;
        form.querySelector('[name="status"]').value = template.status;

        alert(`テンプレート「${template.name}」を読み込みました`);
    }

    deleteTemplate(templateId) {
        if (!confirm('このテンプレートを削除しますか？')) return;

        this.projectTemplates = this.projectTemplates.filter(t => t.id !== templateId);
        this.saveTemplates();
        this.updateTemplateSelect();
        alert('テンプレートを削除しました');
    }

    updateTemplateSelect() {
        const select = document.getElementById('template-select');
        if (!select) return;

        select.innerHTML = '<option value="">テンプレートを選択...</option>';
        this.projectTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }

    showTemplateManager() {
        this.openModal('template-manager-modal');
        this.renderTemplates();
    }

    closeTemplateManager() {
        this.closeModal('template-manager-modal');
    }

    renderTemplates() {
        const container = document.getElementById('templates-list');

        if (this.projectTemplates.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>保存されたテンプレートはありません</p></div>';
            return;
        }

        container.innerHTML = this.projectTemplates.map(template => `
            <div class="card">
                <h3>${this.escapeHtml(template.name)}</h3>
                <div class="card-meta">
                    <span>📍 ${this.escapeHtml(template.location)}</span>
                    <span>📅 ${this.formatDate(template.createdAt)}</span>
                </div>
                ${template.description ? `<p>${this.escapeHtml(template.description)}</p>` : ''}
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="app.deleteTemplate('${template.id}')">🗑️ 削除</button>
                </div>
            </div>
        `).join('');
    }
}

// アプリケーション初期化（グローバルスコープに配置）
window.app = new App();

console.log('🌸 工事看板写真システム起動');
