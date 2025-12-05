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
        this.currentEditingSignboard = null;
        this.drawingCanvas = null;
        this.drawingCtx = null;
        this.isDrawing = false;
        this.drawTool = 'pen';
        this.penSize = 3;
        this.penColor = '#000000';
        this.lastX = 0;
        this.lastY = 0;
        this.init();
    }

    async init() {
        console.log('🚀 アプリ初期化開始');

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
        const filterSelect = document.getElementById('photo-project-filter');
        const projectId = filterSelect.value || null;

        await this.loadPhotos(projectId);
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
            await this.uploadPhoto(blob, projectId, caption);
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
}

// アプリケーション初期化（グローバルスコープに配置）
window.app = new App();

console.log('🌸 工事看板写真システム起動');
