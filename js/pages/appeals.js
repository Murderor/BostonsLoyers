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
    },
    
    validateUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

window.Pages.Appeals = {
    currentView: 'create',
    uploadedFiles: {},
    examQuestions: [],
    userAnswers: [],
    examTimer: null,
    examStarted: false,
    examStartTime: null,
    evidenceLinks: [], // Для хранения ссылок на доказательства
    
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
                    <button class="tab-btn ${this.currentView === 'exam-history' ? 'active' : ''}" data-view="exam-history">
                        📚 История экзаменов
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
                .paste-hint {
                    font-size: 0.7rem;
                    color: #888;
                    margin-top: 0.25rem;
                }
                .exam-question {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                }
                .exam-question h4 {
                    color: #ffd700;
                    margin-bottom: 1rem;
                }
                .exam-option {
                    margin: 0.5rem 0;
                    padding: 0.5rem;
                    background: rgba(255,255,255,0.03);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .exam-option:hover {
                    background: rgba(255,215,0,0.1);
                }
                .exam-option.selected {
                    background: rgba(255,215,0,0.2);
                    border-left: 3px solid #ffd700;
                }
                .exam-option input {
                    margin-right: 0.5rem;
                }
                .exam-timer {
                    font-size: 1.2rem;
                    text-align: center;
                    margin: 1rem 0;
                    padding: 0.5rem;
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    font-family: monospace;
                }
                .exam-timer.warning {
                    color: #ff9800;
                }
                .exam-timer.danger {
                    color: #f44336;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .result-card {
                    text-align: center;
                    padding: 2rem;
                }
                .result-card.passed {
                    background: linear-gradient(135deg, rgba(40,167,69,0.2), rgba(40,167,69,0.05));
                }
                .result-card.failed {
                    background: linear-gradient(135deg, rgba(220,53,69,0.2), rgba(220,53,69,0.05));
                }
                .score-circle {
                    width: 150px;
                    height: 150px;
                    margin: 1rem auto;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: bold;
                    position: relative;
                }
                .score-circle.passed {
                    background: radial-gradient(circle, rgba(40,167,69,0.3), rgba(40,167,69,0.1));
                    border: 3px solid #28a745;
                }
                .score-circle.failed {
                    background: radial-gradient(circle, rgba(220,53,69,0.3), rgba(220,53,69,0.1));
                    border: 3px solid #dc3545;
                }
                .evidence-link-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(255,255,255,0.05);
                    padding: 0.5rem;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                }
                .evidence-link-item a {
                    color: #ffd700;
                    text-decoration: none;
                    flex: 1;
                    word-break: break-all;
                }
                .evidence-link-item a:hover {
                    text-decoration: underline;
                }
                .remove-link {
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .add-link-form {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                .add-link-form input {
                    flex: 1;
                    padding: 0.5rem;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.3);
                    color: white;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
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
        } else if (view === 'exam-history') {
            await this.renderExamHistory(contentContainer);
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
                        <option value="written_exam">📚 Письменный экзамен на знание законов</option>
                        <option value="accreditation">⚖️ Запрос на аккредитацию юриста</option>
                        <option value="lawyer_promotion">⬆️ Запрос на повышение до адвоката</option>
                        <option value="senior_promotion">⭐ Запрос на повышение до старшего адвоката</option>
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
                
                <div id="written-exam-fields" style="display: none;">
                    <div class="requirements-box">
                        <h4>📋 Квалификационный экзамен адвоката</h4>
                        <p>Проверка знаний законодательной базы Majestic RP</p>
                        <ul>
                            <li>✅ 20 вопросов по законам и процедурам</li>
                            <li>✅ Время на прохождение: 30 минут</li>
                            <li>✅ Проходной балл: 70% (14 из 20)</li>
                            <li>✅ При успешной сдаче - бонус к рейтингу +2 очка</li>
                            <li>✅ Можно пересдавать раз в неделю для повышения рейтинга</li>
                        </ul>
                    </div>
                    
                    <div id="exam-container" style="display: none;">
                        <div id="exam-questions"></div>
                        <div class="exam-timer" id="exam-timer-display">
                            ⏱️ Осталось времени: <span id="exam-timer">30:00</span>
                        </div>
                        <button type="button" id="submit-exam" class="btn btn-primary">✅ Завершить экзамен</button>
                    </div>
                    
                    <div id="exam-start" style="text-align: center; padding: 2rem;">
                        <p style="margin-bottom: 1rem;">Готовы проверить свои знания?</p>
                        <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #888;">⚠️ Внимание: после начала экзамен нельзя будет прервать</p>
                        <button type="button" id="start-exam" class="btn btn-primary">🚀 Начать экзамен</button>
                    </div>
                    
                    <div id="exam-result" style="display: none;"></div>
                </div>
                
                <div id="accreditation-fields" style="display: none;">
                    <div class="form-group">
                        <label>Скриншот удостоверения *</label>
                        <div id="id-card-dropzone" class="file-input-area" data-field="id-card">
                            <p>📸 Нажмите, перетащите файл или вставьте из буфера (Ctrl+V)</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="id-card-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="id-card-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот наличия ролей в State *</label>
                        <div id="state-roles-dropzone" class="file-input-area" data-field="state-roles">
                            <p>📸 Нажмите, перетащите файл или вставьте из буфера (Ctrl+V)</p>
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
                        <div id="call1-dropzone" class="file-input-area" data-field="call1">
                            <p>📸 Нажмите, перетащите файл или вставьте из буфера (Ctrl+V)</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="call1-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="call1-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот вызова #2 *</label>
                        <div id="call2-dropzone" class="file-input-area" data-field="call2">
                            <p>📸 Нажмите, перетащите файл или вставьте из буфера (Ctrl+V)</p>
                            <p style="font-size: 0.8rem; color: #888;">PNG, JPG до 10MB</p>
                            <input type="file" id="call2-file" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div id="call2-preview" class="file-preview"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Скриншот вызова #3 *</label>
                        <div id="call3-dropzone" class="file-input-area" data-field="call3">
                            <p>📸 Нажмите, перетащите файл или вставьте из буфера (Ctrl+V)</p>
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
                
                <div id="senior-promotion-fields" style="display: none;">
                    <div class="requirements-box">
                        <h4>⭐ Требования для повышения до старшего адвоката:</h4>
                        <ul>
                            <li>✅ Действующая роль "Адвокат" (уровень 4)</li>
                            <li>✅ Стаж работы в должности адвоката не менее 2 недель</li>
                            <li>✅ Положительная репутация и отсутствие дисциплинарных взысканий</li>
                            <li>✅ Активная работа в коллегии и высокие показатели рейтинга</li>
                        </ul>
                        <p style="margin-top: 0.5rem; font-size: 0.85rem;">📌 Заполните форму для рассмотрения вашей кандидатуры старшим составом</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="senior-vision">Опишите, как вы видите себя в роли старшего адвоката *</label>
                        <textarea id="senior-vision" rows="6" placeholder="Расскажите о вашем видении роли старшего адвоката, какие обязанности вы готовы выполнять, какой вклад можете внести в развитие коллегии..."></textarea>
                        <div class="form-hint">Минимум 500 символов. Будьте конкретны и аргументированы</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Ссылки на доказательства проделанной работы (необязательно)</label>
                        <div id="evidence-links-container">
                            <div id="evidence-links-list"></div>
                            <div class="add-link-form">
                                <input type="url" id="new-evidence-link" placeholder="https://discord.com/channels/... или другая ссылка">
                                <button type="button" id="add-evidence-link" class="btn btn-secondary">➕ Добавить</button>
                            </div>
                        </div>
                        <div class="form-hint">Добавьте ссылки на успешные дела, отзывы клиентов, протоколы заседаний или другие доказательства вашей работы</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="interview-ready">
                            <span>✅ Готовы ли вы пройти собеседование у старшего состава адвокатуры?</span>
                        </label>
                        <div class="form-hint">Собеседование будет проведено в Discord голосовом канале</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="senior-comment">Дополнительный комментарий (необязательно)</label>
                        <textarea id="senior-comment" rows="3" placeholder="Любая дополнительная информация, которую хотите сообщить старшему составу..."></textarea>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary" id="appeal-submit-btn">Отправить обращение</button>
            </form>
        `;
        
        this.setupFileUpload('id-card');
        this.setupFileUpload('state-roles');
        this.setupFileUpload('call1');
        this.setupFileUpload('call2');
        this.setupFileUpload('call3');
        
        this.setupEvidenceLinks();
        
        const typeSelect = document.getElementById('appeal-type');
        const oralExamFields = document.getElementById('oral-exam-fields');
        const writtenExamFields = document.getElementById('written-exam-fields');
        const accreditationFields = document.getElementById('accreditation-fields');
        const lawyerPromotionFields = document.getElementById('lawyer-promotion-fields');
        const seniorPromotionFields = document.getElementById('senior-promotion-fields');
        
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                if (oralExamFields) oralExamFields.style.display = 'none';
                if (writtenExamFields) writtenExamFields.style.display = 'none';
                if (accreditationFields) accreditationFields.style.display = 'none';
                if (lawyerPromotionFields) lawyerPromotionFields.style.display = 'none';
                if (seniorPromotionFields) seniorPromotionFields.style.display = 'none';
                
                if (typeSelect.value === 'oral_exam' && oralExamFields) {
                    oralExamFields.style.display = 'block';
                } else if (typeSelect.value === 'written_exam' && writtenExamFields) {
                    writtenExamFields.style.display = 'block';
                    this.setupWrittenExam();
                } else if (typeSelect.value === 'accreditation' && accreditationFields) {
                    accreditationFields.style.display = 'block';
                } else if (typeSelect.value === 'lawyer_promotion' && lawyerPromotionFields) {
                    lawyerPromotionFields.style.display = 'block';
                } else if (typeSelect.value === 'senior_promotion' && seniorPromotionFields) {
                    seniorPromotionFields.style.display = 'block';
                }
            });
        }
        
        const form = document.getElementById('appeal-form');
        if (form) {
            form.removeEventListener('submit', this.handleFormSubmit);
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }
    },
    
    setupEvidenceLinks() {
        this.evidenceLinks = [];
        const linksList = document.getElementById('evidence-links-list');
        const addBtn = document.getElementById('add-evidence-link');
        const newLinkInput = document.getElementById('new-evidence-link');
        
        if (!linksList || !addBtn) return;
        
        const renderLinks = () => {
            linksList.innerHTML = '';
            this.evidenceLinks.forEach((link, index) => {
                const linkDiv = document.createElement('div');
                linkDiv.className = 'evidence-link-item';
                linkDiv.innerHTML = `
                    <a href="${AppealsSecurity.escapeAttribute(link)}" target="_blank" rel="noopener noreferrer">
                        🔗 ${AppealsSecurity.escapeHtml(link.length > 50 ? link.substring(0, 47) + '...' : link)}
                    </a>
                    <button type="button" class="remove-link" data-index="${index}">✖️</button>
                `;
                linksList.appendChild(linkDiv);
            });
            
            document.querySelectorAll('.remove-link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.getAttribute('data-index'));
                    this.evidenceLinks.splice(index, 1);
                    renderLinks();
                });
            });
        };
        
        addBtn.addEventListener('click', () => {
            const newLink = newLinkInput.value.trim();
            if (newLink && AppealsSecurity.validateUrl(newLink)) {
                this.evidenceLinks.push(newLink);
                renderLinks();
                newLinkInput.value = '';
            } else if (newLink) {
                Utils.showNotification('Пожалуйста, введите корректный URL', 'error');
            }
        });
        
        newLinkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addBtn.click();
            }
        });
        
        renderLinks();
    },
    
    setupWrittenExam() {
        const startBtn = document.getElementById('start-exam');
        if (startBtn && !startBtn._listenerAdded) {
            startBtn._listenerAdded = true;
            startBtn.addEventListener('click', () => this.startExam());
        }
        
        const submitBtn = document.getElementById('submit-exam');
        if (submitBtn && !submitBtn._listenerAdded) {
            submitBtn._listenerAdded = true;
            submitBtn.addEventListener('click', () => this.submitWrittenExam());
        }
    },
    
    async startExam() {
        if (this.examStarted) return;
        
        try {
            Utils.showNotification('Загрузка вопросов экзамена...', 'info');
            
            console.log('Fetching exam questions...');
            
            const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/exam-questions', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${window.Auth.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Response data type:', typeof data);
            console.log('Is array:', Array.isArray(data));
            console.log('Data length:', data?.length);
            
            let questionsArray = [];
            if (Array.isArray(data)) {
                questionsArray = data;
            } else if (data && typeof data === 'object') {
                if (data.questions && Array.isArray(data.questions)) {
                    questionsArray = data.questions;
                } else if (data.data && Array.isArray(data.data)) {
                    questionsArray = data.data;
                } else {
                    for (const key in data) {
                        if (Array.isArray(data[key]) && data[key].length > 0) {
                            questionsArray = data[key];
                            break;
                        }
                    }
                }
            }
            
            this.examQuestions = questionsArray;
            
            if (!this.examQuestions || this.examQuestions.length === 0) {
                console.error('No questions found. Data received:', data);
                Utils.showNotification('Вопросы не найдены. Обратитесь к администратору.', 'error');
                return;
            }
            
            console.log(`Loaded ${this.examQuestions.length} questions`);
            console.log('First question sample:', this.examQuestions[0]);
            
            this.userAnswers = new Array(this.examQuestions.length).fill(null);
            this.examStarted = true;
            this.examStartTime = Date.now();
            
            const examStartDiv = document.getElementById('exam-start');
            const examContainer = document.getElementById('exam-container');
            const submitBtn = document.getElementById('appeal-submit-btn');
            
            if (examStartDiv) examStartDiv.style.display = 'none';
            if (examContainer) examContainer.style.display = 'block';
            if (submitBtn) submitBtn.style.display = 'none';
            
            this.renderExamQuestions();
            this.startExamTimer();
            
        } catch (error) {
            console.error('Error loading exam:', error);
            Utils.showNotification(`Ошибка загрузки экзамена: ${error.message}`, 'error');
            
            const examStart = document.getElementById('exam-start');
            if (examStart) {
                examStart.innerHTML = `
                    <p style="margin-bottom: 1rem; color: #ff6b6b;">Ошибка загрузки вопросов: ${AppealsSecurity.escapeHtml(error.message)}</p>
                    <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #888;">Проверьте подключение и попробуйте снова</p>
                    <button type="button" id="start-exam-retry" class="btn btn-primary">🔄 Попробовать снова</button>
                `;
                
                const retryBtn = document.getElementById('start-exam-retry');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.startExam());
                }
            }
        }
    },
    
    renderExamQuestions() {
        const container = document.getElementById('exam-questions');
        if (!container) {
            console.error('Exam questions container not found');
            return;
        }
        
        if (!this.examQuestions || !Array.isArray(this.examQuestions) || this.examQuestions.length === 0) {
            console.error('Exam questions is not a valid array:', this.examQuestions);
            container.innerHTML = '<div class="error-message">Ошибка: вопросы не загружены. Нажмите "Начать экзамен" снова.</div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.examQuestions.forEach((question, index) => {
            let options = [];
            if (Array.isArray(question.options)) {
                options = question.options;
            } else if (typeof question.options === 'string') {
                try {
                    options = JSON.parse(question.options);
                } catch (e) {
                    console.error('Failed to parse options:', e);
                    options = [];
                }
            }
            
            if (options.length === 0) {
                console.error('No options for question:', question);
                return;
            }
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'exam-question';
            questionDiv.innerHTML = `
                <h4>Вопрос ${index + 1}: ${AppealsSecurity.escapeHtml(question.question_text)}</h4>
                <div class="exam-options" data-question-index="${index}">
                    ${options.map((option, optIndex) => `
                        <div class="exam-option ${this.userAnswers[index] === optIndex ? 'selected' : ''}" data-option-index="${optIndex}">
                            <label>
                                <input type="radio" name="q${index}" value="${optIndex}" ${this.userAnswers[index] === optIndex ? 'checked' : ''}>
                                ${AppealsSecurity.escapeHtml(option)}
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(questionDiv);
            
            const optionDivs = questionDiv.querySelectorAll('.exam-option');
            optionDivs.forEach(optionDiv => {
                const radio = optionDiv.querySelector('input');
                if (radio) {
                    radio.addEventListener('change', (e) => {
                        this.userAnswers[index] = parseInt(e.target.value);
                        optionDivs.forEach(opt => opt.classList.remove('selected'));
                        optionDiv.classList.add('selected');
                    });
                }
            });
        });
        
        console.log(`Rendered ${this.examQuestions.length} questions`);
    },
    
    startExamTimer() {
        if (this.examTimer) clearInterval(this.examTimer);
        
        const timerElement = document.getElementById('exam-timer');
        const timerDisplay = document.getElementById('exam-timer-display');
        
        this.examTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.examStartTime) / 1000);
            const remaining = 1800 - elapsed;
            
            if (remaining <= 0) {
                clearInterval(this.examTimer);
                this.submitWrittenExam(true);
                return;
            }
            
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (timerDisplay) {
                if (remaining <= 300) {
                    timerDisplay.classList.add('danger');
                    timerDisplay.classList.remove('warning');
                } else if (remaining <= 600) {
                    timerDisplay.classList.add('warning');
                    timerDisplay.classList.remove('danger');
                }
            }
            
        }, 1000);
    },
    
    async submitWrittenExam(autoSubmit = false) {
        if (autoSubmit) {
            Utils.showNotification('Время вышло! Экзамен автоматически завершен.', 'warning');
        }
        
        clearInterval(this.examTimer);
        
        const hasUnanswered = this.userAnswers.some(answer => answer === null);
        if (hasUnanswered && !autoSubmit) {
            if (!confirm('У вас есть неотвеченные вопросы. Вы уверены, что хотите завершить экзамен?')) {
                this.startExamTimer();
                return;
            }
        }
        
        let correctCount = 0;
        const answers = [];
        
        this.examQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = userAnswer === question.correct_answer;
            if (isCorrect) correctCount++;
            answers.push({
                question_id: question.id,
                user_answer: userAnswer,
                is_correct: isCorrect
            });
        });
        
        const scorePercent = (correctCount / this.examQuestions.length) * 100;
        const passed = scorePercent >= 70;
        const timeSpent = Math.floor((Date.now() - this.examStartTime) / 1000);
        
        const resultContainer = document.getElementById('exam-result');
        const examContainer = document.getElementById('exam-container');
        const submitBtn = document.getElementById('submit-exam');
        
        if (submitBtn) submitBtn.disabled = true;
        
        try {
            Utils.showNotification('Отправка результатов...', 'info');
            
            const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/submit-exam', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.Auth.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score_percent: scorePercent,
                    correct_answers: correctCount,
                    total_questions: this.examQuestions.length,
                    answers: answers,
                    time_spent: timeSpent
                })
            });
            
            const result = await response.json();
            
            if (examContainer) examContainer.style.display = 'none';
            if (resultContainer) {
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = `
                    <div class="result-card ${passed ? 'passed' : 'failed'}">
                        <div class="score-circle ${passed ? 'passed' : 'failed'}">
                            ${Math.round(scorePercent)}%
                        </div>
                        <h2>${passed ? '✅ Экзамен сдан!' : '❌ Экзамен не сдан'}</h2>
                        <p>Правильных ответов: ${correctCount} из ${this.examQuestions.length}</p>
                        <p>Результат: ${scorePercent.toFixed(1)}% (Проходной балл: 70%)</p>
                        <p>Время: ${Math.floor(timeSpent / 60)}м ${timeSpent % 60}с</p>
                        ${result.bonus_applied ? '<p style="color: #ffd700;">✨ Вы получили +2 очка к рейтингу недели!</p>' : ''}
                        ${!passed ? '<p style="margin-top: 1rem;">Вы можете попробовать снова через неделю.</p>' : ''}
                        <button type="button" id="close-exam-result" class="btn btn-primary" style="margin-top: 1rem;">Закрыть</button>
                    </div>
                `;
                
                const closeBtn = document.getElementById('close-exam-result');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        resultContainer.style.display = 'none';
                        document.getElementById('written-exam-fields').style.display = 'none';
                        document.getElementById('appeal-submit-btn').style.display = 'block';
                        this.examStarted = false;
                        
                        if (passed) {
                            Utils.showNotification('Поздравляем! Экзамен успешно сдан!', 'success');
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('Error submitting exam:', error);
            Utils.showNotification('Ошибка при отправке результатов', 'error');
            if (submitBtn) submitBtn.disabled = false;
            this.startExamTimer();
        }
    },
    
    setupPasteListener(dropzoneElement, fieldName) {
        const handlePaste = async (e) => {
            e.preventDefault();
            const items = e.clipboardData.items;
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file && AppealsSecurity.validateFile(file)) {
                        const timestamp = Date.now();
                        const extension = file.type.split('/')[1] || 'png';
                        const renamedFile = new File([file], `paste_${fieldName}_${timestamp}.${extension}`, { type: file.type });
                        
                        const fileInput = document.getElementById(`${fieldName}-file`);
                        const previewContainer = document.getElementById(`${fieldName}-preview`);
                        
                        if (fileInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(renamedFile);
                            fileInput.files = dataTransfer.files;
                        }
                        
                        if (previewContainer) {
                            this.previewFile(renamedFile, previewContainer, fieldName);
                        }
                        
                        Utils.showNotification('Изображение вставлено из буфера обмена', 'success');
                        break;
                    } else {
                        Utils.showNotification('Файл должен быть изображением (JPEG, PNG, GIF, WEBP) до 10MB', 'error');
                    }
                }
            }
        };
        
        dropzoneElement.addEventListener('paste', handlePaste);
        dropzoneElement._pasteHandler = handlePaste;
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
        else if (appealType === 'written_exam') {
            if (!this.examStarted) {
                Utils.showNotification('Сначала начните экзамен', 'warning');
            } else {
                Utils.showNotification('Завершите экзамен через кнопку "Завершить экзамен"', 'warning');
            }
        }
        else if (appealType === 'accreditation') {
            await this.submitAccreditation();
        }
        else if (appealType === 'lawyer_promotion') {
            await this.submitLawyerPromotion();
        }
        else if (appealType === 'senior_promotion') {
            await this.submitSeniorPromotion();
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
        const cleanLink = examMessageLink.trim();
        
        try {
            Utils.showNotification('Отправка обращения...', 'info');
            
            const formData = new FormData();
            formData.append('appealType', 'lawyer_promotion');
            formData.append('comment', sanitizedComment);
            formData.append('examMessageLink', cleanLink);
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
    
    // В функции submitSeniorPromotion в appeals.js, замените существующий код на этот:

async submitSeniorPromotion() {
    console.log('=== Starting submitSeniorPromotion ===');
    
    const seniorVision = document.getElementById('senior-vision')?.value.trim();
    const interviewReady = document.getElementById('interview-ready')?.checked;
    
    console.log('seniorVision length:', seniorVision?.length);
    console.log('interviewReady:', interviewReady);
    
    if (!seniorVision) {
        Utils.showNotification('Опишите ваше видение роли старшего адвоката', 'error');
        return;
    }
    
    if (seniorVision.length < 500) {
        Utils.showNotification('Описание должно содержать минимум 500 символов', 'error');
        return;
    }
    
    if (!interviewReady) {
        Utils.showNotification('Подтвердите готовность пройти собеседование у старшего состава', 'error');
        return;
    }
    
    const comment = document.getElementById('senior-comment')?.value || '';
    const sanitizedComment = AppealsSecurity.sanitizeString(comment, 500);
    const sanitizedVision = AppealsSecurity.sanitizeString(seniorVision, 2000);
    
    const details = {
        vision: sanitizedVision,
        evidence_links: this.evidenceLinks || [],
        interview_ready: interviewReady,
        comment: sanitizedComment,
        current_role: window.Auth.currentUser?.role_level || 4,
        character_name: window.Auth.currentUser?.character_name || ''
    };
    
    console.log('Details to send:', details);
    console.log('Current user:', window.Auth.currentUser);
    console.log('Auth token exists:', !!window.Auth.token);
    
    try {
        Utils.showNotification('Отправка заявки...', 'info');
        
        // Сначала создаем обращение
        console.log('Calling API.createAppeal...');
        const response = await API.createAppeal(window.Auth.token, 'senior_promotion', details);
        
        console.log('Create appeal response:', response);
        
        if (response && response.success && response.appeal_id) {
            console.log('Appeal created with ID:', response.appeal_id);
            
            // Отправляем уведомление в Discord
            try {
                console.log('Preparing Discord notification...');
                const appealData = {
                    id: response.appeal_id,
                    user_id: window.Auth.currentUser?.id,
                    character_name: window.Auth.currentUser?.character_name,
                    static_id: window.Auth.currentUser?.static_id,
                    discord_id: window.Auth.currentUser?.discord_id,
                    appeal_type: 'senior_promotion',
                    details: details,
                    created_at: new Date().toISOString()
                };
                
                console.log('Calling API.sendSeniorPromotionNotification...');
                await API.sendSeniorPromotionNotification(window.Auth.token, response.appeal_id, appealData);
                Utils.showNotification('Заявка отправлена! Уведомление отправлено в Discord.', 'success');
            } catch (notifError) {
                console.error('Error sending Discord notification:', notifError);
                console.error('Error details:', notifError.message, notifError.stack);
                Utils.showNotification('Заявка создана, но не удалось отправить уведомление в Discord. Администратор будет уведомлен.', 'warning');
            }
            
            // Очищаем форму
            const form = document.getElementById('appeal-form');
            if (form) form.reset();
            const seniorPromotionFields = document.getElementById('senior-promotion-fields');
            if (seniorPromotionFields) seniorPromotionFields.style.display = 'none';
            this.evidenceLinks = [];
            
            // Обновляем список ссылок в UI
            const linksList = document.getElementById('evidence-links-list');
            if (linksList) linksList.innerHTML = '';
            
            this.switchToListAfterDelay();
        } else {
            const errorMsg = response?.error || 'Неизвестная ошибка при создании обращения';
            console.error('Create appeal failed:', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error in submitSeniorPromotion:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        Utils.showNotification(error.message || 'Ошибка при отправке заявки', 'error');
    }
},
    
    setupFileUpload(fieldName) {
        const dropzone = document.getElementById(`${fieldName}-dropzone`);
        const fileInput = document.getElementById(`${fieldName}-file`);
        const previewContainer = document.getElementById(`${fieldName}-preview`);
        
        if (!dropzone || !fileInput) return;
        
        const newDropzone = dropzone.cloneNode(true);
        dropzone.parentNode.replaceChild(newDropzone, dropzone);
        
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
                const timestamp = Date.now();
                const extension = file.name.split('.').pop() || file.type.split('/')[1] || 'png';
                const renamedFile = new File([file], `drop_${fieldName}_${timestamp}.${extension}`, { type: file.type });
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(renamedFile);
                finalFileInput.files = dataTransfer.files;
                
                this.previewFile(renamedFile, finalPreview, fieldName);
            } else {
                Utils.showNotification('Поддерживаются только JPEG, PNG, GIF, WEBP файлы до 10MB', 'error');
            }
        });
        
        this.setupPasteListener(finalDropzone, fieldName);
        
        finalDropzone.setAttribute('tabindex', '0');
        finalDropzone.style.outline = 'none';
        
        const pasteHint = document.createElement('div');
        pasteHint.className = 'paste-hint';
        pasteHint.innerHTML = '💡 Для вставки из буфера: кликните на эту область и нажмите Ctrl+V';
        finalDropzone.appendChild(pasteHint);
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
    
    async renderExamHistory(container) {
        container.innerHTML = '<div class="loader">Загрузка истории экзаменов...</div>';
        
        try {
            const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/get-exam-history', {
                headers: { 'Authorization': `Bearer ${window.Auth.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load exam history');
            
            const data = await response.json();
            console.log('Exam history data:', data);
            
            let attempts = [];
            let canTakeExam = true;
            let nextAvailableTime = null;
            
            if (Array.isArray(data)) {
                attempts = data;
            } else if (data && typeof data === 'object') {
                attempts = data.attempts || [];
                canTakeExam = data.can_take_exam !== false;
                nextAvailableTime = data.next_available_time;
            }
            
            let timeUntilNext = '';
            if (nextAvailableTime) {
                const nextDate = new Date(nextAvailableTime);
                const now = new Date();
                const diffMs = nextDate - now;
                const diffMinutes = Math.ceil(diffMs / (1000 * 60));
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                timeUntilNext = `через ${hours}ч ${minutes}мин`;
            }
            
            if (!attempts || attempts.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p>📚 У вас пока нет попыток сдачи экзамена</p>
                        <p style="font-size: 0.9rem; color: #888; margin-top: 0.5rem;">
                            ${!canTakeExam ? `⚠️ Следующая попытка доступна ${timeUntilNext}` : '✅ Экзамен можно сдавать каждые 3 часа'}
                        </p>
                        ${canTakeExam ? `
                            <button onclick="window.Pages.Appeals.loadView('create')" class="btn btn-primary" style="margin-top: 1rem;">
                                📝 Сдать экзамен
                            </button>
                        ` : ''}
                    </div>
                `;
                return;
            }
            
            const historyHtml = `
                <h3>📚 История экзаменов</h3>
                ${!canTakeExam ? `
                    <div class="warning-message" style="background: rgba(255,193,7,0.1); border-left: 3px solid #ffc107; padding: 0.75rem; margin-bottom: 1rem; border-radius: 8px;">
                        ⏰ Экзамен можно сдавать раз в 3 часа. Следующая попытка доступна ${timeUntilNext}
                    </div>
                ` : `
                    <div class="success-message" style="background: rgba(40,167,69,0.1); border-left: 3px solid #28a745; padding: 0.75rem; margin-bottom: 1rem; border-radius: 8px;">
                        ✅ Экзамен доступен для сдачи! Вы можете проходить его каждые 3 часа.
                    </div>
                `}
                <div class="attempts-list">
                    ${attempts.map((attempt, index) => `
                        <div class="appeal-card ${attempt.passed ? 'appeal-status-approved' : 'appeal-status-rejected'}">
                            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 0.5rem;">
                                <div>
                                    <h4>Попытка #${attempts.length - index}</h4>
                                    <p>📅 ${new Date(attempt.completed_at).toLocaleString('ru-RU')}</p>
                                    <p>📊 Результат: ${attempt.correct_answers}/${attempt.total_questions} (${attempt.score_percent}%)</p>
                                    <p>⏱️ Время: ${Math.floor(attempt.time_spent / 60)}м ${attempt.time_spent % 60}с</p>
                                </div>
                                <div>
                                    <span class="status-badge ${attempt.passed ? 'status-approved' : 'status-rejected'}">
                                        ${attempt.passed ? '✅ Сдан' : '❌ Не сдан'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${canTakeExam ? `
                    <div style="text-align: center; margin-top: 1.5rem;">
                        <button onclick="window.Pages.Appeals.loadView('create')" class="btn btn-primary">
                            📝 Сдать экзамен снова
                        </button>
                    </div>
                ` : ''}
            `;
            
            container.innerHTML = historyHtml;
            
        } catch (error) {
            console.error('Error loading exam history:', error);
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem;">
                    <p style="color: #dc3545;">Ошибка загрузки истории экзаменов: ${error.message}</p>
                    <button onclick="window.Pages.Appeals.renderExamHistory(container)" class="btn btn-primary" style="margin-top: 1rem;">
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
        else if (appeal.appeal_type === 'written_exam') appealTypeName = '📚 Письменный экзамен';
        else if (appeal.appeal_type === 'accreditation') appealTypeName = '⚖️ Запрос на аккредитацию юриста';
        else if (appeal.appeal_type === 'lawyer_promotion') appealTypeName = '⬆️ Запрос на повышение до адвоката';
        else if (appeal.appeal_type === 'senior_promotion') appealTypeName = '⭐ Запрос на повышение до старшего адвоката';
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
            link.href = appeal.details.exam_message_link;
            link.target = '_blank';
            link.style.color = '#ffd700';
            link.style.textDecoration = 'none';
            link.style.wordBreak = 'break-all';
            link.textContent = '🔗 Ссылка на результат экзамена';
            
            linkDiv.appendChild(link);
            card.appendChild(linkDiv);
        }
        
        if (appeal.details && appeal.details.vision) {
            const visionDiv = document.createElement('div');
            visionDiv.style.marginTop = '0.75rem';
            visionDiv.style.padding = '0.75rem';
            visionDiv.style.background = 'rgba(0,0,0,0.2)';
            visionDiv.style.borderRadius = '8px';
            visionDiv.innerHTML = `<strong>📝 Видение роли старшего адвоката:</strong><p style="margin-top: 0.25rem;">${AppealsSecurity.escapeHtml(appeal.details.vision)}</p>`;
            card.appendChild(visionDiv);
        }
        
        if (appeal.details && appeal.details.evidence_links && appeal.details.evidence_links.length > 0) {
            const evidenceDiv = document.createElement('div');
            evidenceDiv.style.marginTop = '0.75rem';
            evidenceDiv.style.padding = '0.75rem';
            evidenceDiv.style.background = 'rgba(0,0,0,0.2)';
            evidenceDiv.style.borderRadius = '8px';
            evidenceDiv.innerHTML = `<strong>🔗 Доказательства работы:</strong><ul style="margin-top: 0.5rem; margin-left: 1rem;">`;
            appeal.details.evidence_links.forEach(link => {
                evidenceDiv.innerHTML += `<li><a href="${AppealsSecurity.escapeAttribute(link)}" target="_blank" style="color: #ffd700;">${AppealsSecurity.escapeHtml(link)}</a></li>`;
            });
            evidenceDiv.innerHTML += `</ul>`;
            card.appendChild(evidenceDiv);
        }
        
        if (appeal.details && appeal.details.interview_ready) {
            const readyDiv = document.createElement('div');
            readyDiv.style.marginTop = '0.5rem';
            readyDiv.innerHTML = `<span style="color: #28a745;">✅ Готов к собеседованию</span>`;
            card.appendChild(readyDiv);
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