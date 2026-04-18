// js/pages/appeals.js
window.Pages = window.Pages || {};

// ========================
// Безопасные функции для страницы обращений
// ========================
const AppealsSecurity = {
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#x2F;');
    },
    
    escapeAttribute(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/=/g, '&#61;');
    },
    
    validateDiscordLink(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return (parsed.hostname === 'discord.com' || 
                    parsed.hostname === 'canary.discord.com' ||
                    parsed.hostname === 'ptb.discord.com') &&
                   parsed.pathname.startsWith('/channels/');
        } catch {
            return false;
        }
    },
    
    sanitizeString(str, maxLength = 1000) {
        if (!str || typeof str !== 'string') return '';
        const trimmed = str.trim().slice(0, maxLength);
        return this.escapeHtml(trimmed);
    },
    
    validateFile(file, maxSize = 10 * 1024 * 1024) {
        if (!file) return false;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }
};

window.Pages.Appeals = {
    currentView: 'create',
    uploadedFiles: {},
    
    async render() {
        if (!window.Auth || !window.Auth.currentUser || !window.Auth.currentUser.id) {
            Utils.showNotification('Необходимо войти в систему', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        if (!window.Auth.currentUser.discord_id) {
            const container = document.getElementById('page-content');
            if (!container) return;
            
            container.innerHTML = `
                <div class="card">
                    <h2>⚠️ Требуется привязка Discord</h2>
                    <p>Для подачи обращений необходимо привязать ваш Discord аккаунт к профилю.</p>
                    <button onclick="window.Pages.Profile.render()" class="btn btn-primary" style="margin-top: 15px;">
                        Перейти к привязке Discord
                    </button>
                </div>
            `;
            return;
        }
        
        const container = document.getElementById('page-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="card">
                <div class="appeals-tabs" style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <button class="tab-btn ${this.currentView === 'create' ? 'active' : ''}" data-view="create">
                        📝 Новое обращение
                    </button>
                    <button class="tab-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list">
                        📋 Мои обращения
                    </button>
                </div>
                <div id="appeals-content"></div>
            </div>
        `;
        
        if (!document.getElementById('appeals-styles')) {
            const style = document.createElement('style');
            style.id = 'appeals-styles';
            style.textContent = `
                .tab-btn {
                    background: transparent;
                    color: #e0e0e0;
                    padding: 10px 20px;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .tab-btn:hover {
                    color: #ffd700;
                    transform: none;
                }
                .tab-btn.active {
                    color: #ffd700;
                    border-bottom-color: #ffd700;
                }
                .appeal-card {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border-left: 4px solid;
                }
                .appeal-status-pending { border-left-color: #ffc107; }
                .appeal-status-approved { border-left-color: #28a745; }
                .appeal-status-rejected { border-left-color: #dc3545; }
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .status-pending { background: #ffc107; color: #000; }
                .status-approved { background: #28a745; color: #fff; }
                .status-rejected { background: #dc3545; color: #fff; }
                .form-hint {
                    font-size: 0.8rem;
                    color: #888;
                    margin-top: 0.25rem;
                }
                .requirements-box {
                    background: rgba(255,215,0,0.1);
                    border-left: 3px solid #ffd700;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border-radius: 8px;
                }
                .requirements-box h4 {
                    color: #ffd700;
                    margin-bottom: 0.5rem;
                }
                .requirements-box ul {
                    margin: 0;
                    padding-left: 1.5rem;
                }
                .requirements-box li {
                    margin: 0.25rem 0;
                    color: #e0e0e0;
                }
                .file-input-area {
                    border: 2px dashed rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: rgba(255,255,255,0.03);
                }
                .file-input-area:hover {
                    border-color: #ffd700;
                    background: rgba(255,215,0,0.05);
                }
                .file-input-area.dragover {
                    border-color: #ffd700;
                    background: rgba(255,215,0,0.1);
                }
                .file-preview {
                    margin-top: 1rem;
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .file-preview-item {
                    position: relative;
                    width: 150px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 8px;
                    padding: 0.5rem;
                }
                .file-preview-item img {
                    width: 100%;
                    height: 100px;
                    object-fit: cover;
                    border-radius: 4px;
                }
                .file-preview-item .file-name {
                    font-size: 0.7rem;
                    margin-top: 0.25rem;
                    word-break: break-all;
                }
                .file-preview-item .remove-file {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    font-size: 12px;
                    line-height: 1;
                }
                .screenshot-counter {
                    font-size: 0.8rem;
                    color: #ffd700;
                    margin-top: 0.5rem;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleTabClick);
            btn.addEventListener('click', this.handleTabClick.bind(this));
        });
        
        await this.loadView(this.currentView);
    },
    
    handleTabClick(e) {
        const btn = e.currentTarget;
        const view = btn.getAttribute('data-view');
        this.currentView = view;
        this.loadView(view);
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    
    async loadView(view) {
        const contentContainer = document.getElementById('appeals-content');
        if (!contentContainer) return;
        
        if (view === 'create') {
            this.renderCreateForm(contentContainer);
        } else if (view === 'list') {
            await this.renderAppealsList(contentContainer);
        }
    },
    
    renderCreateForm(container) {
        container.innerHTML = `
            <form id="appeal-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="appeal-type">Тип обращения *</label>
                    <select id="appeal-type" required>
                        <option value="">Выберите тип обращения</option>
                        <option value="oral_exam">📝 Запрос на проведение устного экзамена</option>
                        <option value="accreditation">⚖️ Запрос на аккредитацию юриста</option>
                        <option value="lawyer_promotion">⬆️ Запрос на повышение до адвоката</option>
                    </select>
                </div>
                
                <div id="oral-exam-fields" style="display: none;">
                    <div class="form-group">
                        <label for="exam-date">Предполагаемая дата (необязательно)</label>
                        <input type="date" id="exam-date">
                        <div class="form-hint">Вы можете указать удобную для вас дату</div>
                    </div>
                    <div class="form-group">
                        <label for="exam-time">Предполагаемое время (необязательно)</label>
                        <input type="time" id="exam-time">
                        <div class="form-hint">Укажите примерное время, если это важно</div>
                    </div>
                    <div class="form-group">
                        <label for="additional-info">Дополнительная информация (необязательно)</label>
                        <textarea id="additional-info" rows="4" placeholder="Укажите любую дополнительную информацию, которая может быть важна..."></textarea>
                    </div>
                </div>
                
                <div id="accreditation-fields" style="display: none;">
                    <div class="form-group">
                        <label>Скриншот удостоверения *</label>
                        <div id="id-card-dropzone" class="file-input-area">
                            <p>📸 Нажмите или перетащите файл</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="id-card-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="id-card-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот наличия ролей в State *</label>
                        <div id="state-roles-dropzone" class="file-input-area">
                            <p>📸 Нажмите или перетащите файл</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="state-roles-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="state-roles-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="accreditation-comment">Комментарий (необязательно)</label>
                        <textarea id="accreditation-comment" rows="3" placeholder="Дополнительная информация по запросу..."></textarea>
                    </div>
                </div>
                
                <div id="lawyer-promotion-fields" style="display: none;">
                    <div class="requirements-box">
                        <h4>📋 Требования для повышения до адвоката:</h4>
                        <ul>
                            <li>✅ Присутствие на 3х вызовах в качестве юриста</li>
                            <li>✅ Успешная сдача теоретического экзамена</li>
                        </ul>
                        <p style="margin-top: 0.5rem; font-size: 0.85rem;">📌 Прикрепите скриншоты с вызовов и ссылку на сообщение о прохождении экзамена</p>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот вызова #1 *</label>
                        <div id="call1-dropzone" class="file-input-area">
                            <p>📸 Нажмите или перетащите файл</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="call1-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="call1-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот вызова #2 *</label>
                        <div id="call2-dropzone" class="file-input-area">
                            <p>📸 Нажмите или перетащите файл</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="call2-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="call2-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот вызова #3 *</label>
                        <div id="call3-dropzone" class="file-input-area">
                            <p>📸 Нажмите или перетащите файл</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="call3-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="call3-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="exam-message-link">Ссылка на сообщение о прохождении устного экзамена *</label>
                        <input type="url" id="exam-message-link" placeholder="https://discord.com/channels/...">
                        <div class="form-hint">Вставьте ссылку на сообщение в Discord, где зафиксирован результат экзамена</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="promotion-comment">Дополнительный комментарий (необязательно)</label>
                        <textarea id="promotion-comment" rows="3" placeholder="Любая дополнительная информация..."></textarea>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary">Отправить обращение</button>
            </form>
        `;
        
        this.setupFileUpload('id-card');
        this.setupFileUpload('state-roles');
        this.setupFileUpload('call1');
        this.setupFileUpload('call2');
        this.setupFileUpload('call3');
        
        const typeSelect = document.getElementById('appeal-type');
        const oralExamFields = document.getElementById('oral-exam-fields');
        const accreditationFields = document.getElementById('accreditation-fields');
        const lawyerPromotionFields = document.getElementById('lawyer-promotion-fields');
        
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                if (oralExamFields) oralExamFields.style.display = 'none';
                if (accreditationFields) accreditationFields.style.display = 'none';
                if (lawyerPromotionFields) lawyerPromotionFields.style.display = 'none';
                
                if (typeSelect.value === 'oral_exam' && oralExamFields) {
                    oralExamFields.style.display = 'block';
                } else if (typeSelect.value === 'accreditation' && accreditationFields) {
                    accreditationFields.style.display = 'block';
                } else if (typeSelect.value === 'lawyer_promotion' && lawyerPromotionFields) {
                    lawyerPromotionFields.style.display = 'block';
                }
            });
        }
        
        const form = document.getElementById('appeal-form');
        if (form) {
            form.removeEventListener('submit', this.handleFormSubmit);
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }
    },
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const typeSelect = document.getElementById('appeal-type');
        const appealType = typeSelect ? typeSelect.value : '';
        
        if (!appealType) {
            Utils.showNotification('Выберите тип обращения', 'error');
            return;
        }
        
        if (appealType === 'oral_exam') {
            await this.submitOralExam();
        }
        else if (appealType === 'accreditation') {
            await this.submitAccreditation();
        }
        else if (appealType === 'lawyer_promotion') {
            await this.submitLawyerPromotion();
        }
    },
    
    async submitOralExam() {
        const details = {};
        const examDate = document.getElementById('exam-date')?.value;
        const examTime = document.getElementById('exam-time')?.value;
        const additionalInfo = document.getElementById('additional-info')?.value;
        
        if (examDate && examDate.trim()) details.exam_date = AppealsSecurity.sanitizeString(examDate);
        if (examTime && examTime.trim()) details.exam_time = AppealsSecurity.sanitizeString(examTime);
        if (additionalInfo && additionalInfo.trim()) details.additional_info = AppealsSecurity.sanitizeString(additionalInfo);
        
        try {
            Utils.showNotification('Отправка обращения...', 'info');
            const response = await API.createAppeal(window.Auth.token, 'oral_exam', details);
            
            if (response && response.success) {
                Utils.showNotification('Обращение успешно отправлено!', 'success');
                const form = document.getElementById('appeal-form');
                if (form) form.reset();
                const oralExamFields = document.getElementById('oral-exam-fields');
                if (oralExamFields) oralExamFields.style.display = 'none';
                this.switchToListAfterDelay();
            } else {
                throw new Error(response?.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            Utils.showNotification(error.message || 'Ошибка при отправке обращения', 'error');
        }
    },
    
    async submitAccreditation() {
        const idCardFile = document.getElementById('id-card-file')?.files[0];
        const stateRolesFile = document.getElementById('state-roles-file')?.files[0];
        
        if (!idCardFile) {
            Utils.showNotification('Прикрепите скриншот удостоверения', 'error');
            return;
        }
        
        if (!stateRolesFile) {
            Utils.showNotification('Прикрепите скриншот ролей в State', 'error');
            return;
        }
        
        if (!AppealsSecurity.validateFile(idCardFile)) {
            Utils.showNotification('Файл удостоверения должен быть изображением до 10MB', 'error');
            return;
        }
        
        if (!AppealsSecurity.validateFile(stateRolesFile)) {
            Utils.showNotification('Файл ролей должен быть изображением до 10MB', 'error');
            return;
        }
        
        const comment = document.getElementById('accreditation-comment')?.value || '';
        const sanitizedComment = AppealsSecurity.sanitizeString(comment, 500);
        
        try {
            Utils.showNotification('Отправка обращения...', 'info');
            
            const formData = new FormData();
            formData.append('appealType', 'accreditation');
            formData.append('comment', sanitizedComment);
            formData.append('idCard', idCardFile);
            formData.append('stateRoles', stateRolesFile);
            
            const response = await API.createAppealWithFiles(window.Auth.token, formData);
            
            if (response && response.success) {
                Utils.showNotification('Обращение успешно отправлено!', 'success');
                const form = document.getElementById('appeal-form');
                if (form) form.reset();
                const accreditationFields = document.getElementById('accreditation-fields');
                if (accreditationFields) accreditationFields.style.display = 'none';
                document.getElementById('id-card-preview').innerHTML = '';
                document.getElementById('state-roles-preview').innerHTML = '';
                this.switchToListAfterDelay();
            } else {
                throw new Error(response?.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            Utils.showNotification(error.message || 'Ошибка при отправке обращения', 'error');
        }
    },
    
    async submitLawyerPromotion() {
        const call1File = document.getElementById('call1-file')?.files[0];
        const call2File = document.getElementById('call2-file')?.files[0];
        const call3File = document.getElementById('call3-file')?.files[0];
        const examMessageLink = document.getElementById('exam-message-link')?.value;
        
        if (!call1File) {
            Utils.showNotification('Прикрепите скриншот вызова #1', 'error');
            return;
        }
        if (!call2File) {
            Utils.showNotification('Прикрепите скриншот вызова #2', 'error');
            return;
        }
        if (!call3File) {
            Utils.showNotification('Прикрепите скриншот вызова #3', 'error');
            return;
        }
        
        if (!AppealsSecurity.validateFile(call1File) ||
            !AppealsSecurity.validateFile(call2File) ||
            !AppealsSecurity.validateFile(call3File)) {
            Utils.showNotification('Файлы должны быть изображениями до 10MB', 'error');
            return;
        }
        
        if (!examMessageLink) {
            Utils.showNotification('Введите ссылку на сообщение о прохождении экзамена', 'error');
            return;
        }
        
        if (!AppealsSecurity.validateDiscordLink(examMessageLink)) {
            Utils.showNotification('Введите корректную ссылку на сообщение Discord', 'error');
            return;
        }
        
        const comment = document.getElementById('promotion-comment')?.value || '';
        const sanitizedComment = AppealsSecurity.sanitizeString(comment, 500);
        const sanitizedLink = AppealsSecurity.sanitizeString(examMessageLink, 500);
        
        try {
            Utils.showNotification('Отправка обращения...', 'info');
            
            const formData = new FormData();
            formData.append('appealType', 'lawyer_promotion');
            formData.append('comment', sanitizedComment);
            formData.append('examMessageLink', sanitizedLink);
            formData.append('call1', call1File);
            formData.append('call2', call2File);
            formData.append('call3', call3File);
            
            const response = await API.createAppealWithFiles(window.Auth.token, formData);
            
            if (response && response.success) {
                Utils.showNotification('Обращение успешно отправлено!', 'success');
                const form = document.getElementById('appeal-form');
                if (form) form.reset();
                const lawyerPromotionFields = document.getElementById('lawyer-promotion-fields');
                if (lawyerPromotionFields) lawyerPromotionFields.style.display = 'none';
                this.switchToListAfterDelay();
            } else {
                throw new Error(response?.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            Utils.showNotification(error.message || 'Ошибка при отправке обращения', 'error');
        }
    },
    
    setupFileUpload(fieldName) {
        const dropzone = document.getElementById(`${fieldName}-dropzone`);
        const fileInput = document.getElementById(`${fieldName}-file`);
        const previewContainer = document.getElementById(`${fieldName}-preview`);
        
        if (!dropzone || !fileInput) return;
        
        const newDropzone = dropzone.cloneNode(true);
        dropzone.parentNode.replaceChild(newDropzone, dropzone);
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        
        const finalDropzone = document.getElementById(`${fieldName}-dropzone`);
        const finalFileInput = document.getElementById(`${fieldName}-file`);
        const finalPreview = document.getElementById(`${fieldName}-preview`);
        
        if (!finalDropzone || !finalFileInput) return;
        
        finalDropzone.addEventListener('click', () => {
            finalFileInput.click();
        });
        
        finalFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.previewFile(e.target.files[0], finalPreview, fieldName);
            }
        });
        
        finalDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            finalDropzone.classList.add('dragover');
        });
        
        finalDropzone.addEventListener('dragleave', () => {
            finalDropzone.classList.remove('dragover');
        });
        
        finalDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            finalDropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && AppealsSecurity.validateFile(file)) {
                finalFileInput.files = e.dataTransfer.files;
                this.previewFile(file, finalPreview, fieldName);
            } else {
                Utils.showNotification('Поддерживаются только JPEG, PNG, GIF, WEBP файлы до 10MB', 'error');
            }
        });
    },
    
    previewFile(file, container, fieldName) {
        if (!AppealsSecurity.validateFile(file)) {
            Utils.showNotification('Файл должен быть изображением (JPEG, PNG, GIF, WEBP) до 10MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const safeFileName = AppealsSecurity.escapeHtml(file.name.substring(0, 30));
            
            container.innerHTML = `
                <div class="file-preview-item">
                    <button type="button" class="remove-file" data-field="${AppealsSecurity.escapeAttribute(fieldName)}">×</button>
                    <img src="${e.target.result}" alt="Preview">
                    <div class="file-name">${safeFileName}</div>
                </div>
            `;
            
            const removeBtn = container.querySelector('.remove-file');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    container.innerHTML = '';
                    const fileInput = document.getElementById(`${fieldName}-file`);
                    if (fileInput) fileInput.value = '';
                });
            }
        };
        reader.readAsDataURL(file);
    },
    
    async renderAppealsList(container) {
        container.innerHTML = '<div class="loader">Загрузка обращений...</div>';
        
        try {
            const appeals = await API.getAppeals(window.Auth.token);
            
            if (!appeals || appeals.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p>У вас пока нет обращений</p>
                        <button onclick="window.Pages.Appeals.loadView('create')" class="btn btn-primary" style="margin-top: 1rem;">
                            Создать обращение
                        </button>
                    </div>
                `;
                return;
            }
            
            const appealsList = document.createElement('div');
            appealsList.className = 'appeals-list';
            
            appeals.forEach(appeal => {
                const appealCard = this.createAppealCard(appeal);
                appealsList.appendChild(appealCard);
            });
            
            container.innerHTML = '';
            container.appendChild(appealsList);
            
        } catch (error) {
            const safeError = AppealsSecurity.escapeHtml(error.message || 'Неизвестная ошибка');
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem;">
                    <p style="color: #dc3545;">Ошибка загрузки обращений: ${safeError}</p>
                    <button onclick="window.Pages.Appeals.loadView('list')" class="btn btn-primary" style="margin-top: 1rem;">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    },
    
    createAppealCard(appeal) {
        const card = document.createElement('div');
        card.className = `appeal-card appeal-status-${AppealsSecurity.escapeHtml(appeal.status || 'pending')}`;
        
        let statusText = '';
        let statusClass = '';
        
        switch(appeal.status) {
            case 'pending':
                statusText = 'На рассмотрении';
                statusClass = 'status-pending';
                break;
            case 'approved':
                statusText = 'Одобрено';
                statusClass = 'status-approved';
                break;
            case 'rejected':
                statusText = 'Отклонено';
                statusClass = 'status-rejected';
                break;
            default:
                statusText = AppealsSecurity.escapeHtml(appeal.status || 'pending');
                statusClass = 'status-pending';
        }
        
        const appealDate = new Date(appeal.created_at).toLocaleString('ru-RU');
        
        let appealTypeName = '';
        if (appeal.appeal_type === 'oral_exam') appealTypeName = '📝 Запрос на устный экзамен';
        else if (appeal.appeal_type === 'accreditation') appealTypeName = '⚖️ Запрос на аккредитацию юриста';
        else if (appeal.appeal_type === 'lawyer_promotion') appealTypeName = '⬆️ Запрос на повышение до адвоката';
        else appealTypeName = AppealsSecurity.escapeHtml(appeal.appeal_type || 'unknown');
        
        const safeAppealTypeName = AppealsSecurity.escapeHtml(appealTypeName);
        const safeAppealDate = AppealsSecurity.escapeHtml(appealDate);
        const safeStatusText = AppealsSecurity.escapeHtml(statusText);
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h3 style="margin-bottom: 0.5rem;">${safeAppealTypeName}</h3>
                    <p style="font-size: 0.85rem; color: #aaa;">Создано: ${safeAppealDate}</p>
                    <p style="font-size: 0.85rem; color: #aaa;">Номер обращения: #${appeal.id}</p>
                </div>
                <div>
                    <span class="status-badge ${statusClass}">${safeStatusText}</span>
                </div>
            </div>
        `;
        
        if (appeal.details && appeal.details.exam_message_link) {
            const linkDiv = document.createElement('div');
            linkDiv.style.marginTop = '0.75rem';
            linkDiv.style.paddingTop = '0.75rem';
            linkDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            
            const link = document.createElement('a');
            link.href = AppealsSecurity.escapeHtml(appeal.details.exam_message_link);
            link.target = '_blank';
            link.style.color = '#ffd700';
            link.textContent = 'Ссылка на результат экзамена';
            
            linkDiv.innerHTML = '🔗 ';
            linkDiv.appendChild(link);
            card.appendChild(linkDiv);
        }
        
        const comment = appeal.details?.comment || appeal.details?.additional_info;
        if (comment) {
            const commentDiv = document.createElement('div');
            commentDiv.style.marginTop = '0.75rem';
            commentDiv.style.padding = '0.75rem';
            commentDiv.style.background = 'rgba(0,0,0,0.2)';
            commentDiv.style.borderRadius = '8px';
            commentDiv.innerHTML = `💬 ${AppealsSecurity.escapeHtml(comment)}`;
            card.appendChild(commentDiv);
        }
        
        if (appeal.admin_comment) {
            const adminDiv = document.createElement('div');
            adminDiv.style.marginTop = '0.75rem';
            adminDiv.style.padding = '0.75rem';
            adminDiv.style.background = 'rgba(0,0,0,0.3)';
            adminDiv.style.borderRadius = '8px';
            adminDiv.innerHTML = `<strong>📌 Комментарий администрации:</strong><p style="margin-top: 0.25rem;">${AppealsSecurity.escapeHtml(appeal.admin_comment)}</p>`;
            card.appendChild(adminDiv);
        }
        
        return card;
    },
    
    switchToListAfterDelay() {
        setTimeout(() => {
            this.currentView = 'list';
            this.loadView('list');
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.getAttribute('data-view') === 'list') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }, 2000);
    }
};