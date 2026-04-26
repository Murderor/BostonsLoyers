// js/pages/lawyer-reports.js
(function() {
   
    let selectedFiles = {
        arrival: null,
        result: null,
        lawyer: null
    };
   
    const LawyerReports = {
        currentTab: 'create',
        currentUserRole: 0,
        currentWeekOffset: 0,
        isLoadingRating: false,

        async compressImage(file, maxSizeMB = 1) {  // уменьшил до 1MB
            return new Promise((resolve) => {
                if (!file || !file.type.startsWith('image/')) {
                    resolve(file);
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let { width, height } = img;
                        const maxDim = 1920;
                        if (width > maxDim || height > maxDim) {
                            const ratio = maxDim / Math.max(width, height);
                            width = Math.round(width * ratio);
                            height = Math.round(height * ratio);
                        }
                        canvas.width = width;
                        canvas.height = height;
                        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                        let quality = 0.92;
                        const tryCompress = () => {
                            canvas.toBlob((blob) => {
                                if (blob.size / (1024 * 1024) <= maxSizeMB || quality <= 0.5) {
                                    const compressedFile = new File([blob], file.name || `compressed-${Date.now()}.jpg`, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now()
                                    });
                                    resolve(compressedFile);
                                } else {
                                    quality -= 0.08;
                                    tryCompress();
                                }
                            }, 'image/jpeg', quality);
                        };
                        tryCompress();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        },

        async render() {
            const container = document.getElementById('page-content');
            if (!container) return;
            this.currentUserRole = window.Auth?.currentUser?.role_level || 0;
            container.innerHTML = `
                <div class="page-container">
                    <h1 class="page-title">📋 Отчеты адвоката</h1>
                    <p class="page-description">Ведите учет вызовов и формируйте отчеты о работе</p>
                    <div class="reports-tabs">
                        <button class="tab-btn ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">✏️ Создать отчет</button>
                        <button class="tab-btn ${this.currentTab === 'my' ? 'active' : ''}" data-tab="my">📄 Мои отчеты</button>
                        <button class="tab-btn ${this.currentTab === 'rating' ? 'active' : ''}" data-tab="rating">🏆 Рейтинг недели</button>
                        ${this.currentUserRole >= 6 ? `<button class="tab-btn ${this.currentTab === 'all' ? 'active' : ''}" data-tab="all">🌐 Все отчеты</button>` : ''}
                    </div>
                    <div id="reports-content"></div>
                </div>
            `;
            this.addStyles();
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentTab = btn.dataset.tab;
                    this.render();
                });
            });
            await this.loadTabContent();
        },

        async loadTabContent() {
            const contentContainer = document.getElementById('reports-content');
            if (!contentContainer) return;
            switch(this.currentTab) {
                case 'create':
                    this.renderCreateReportForm(contentContainer);
                    break;
                case 'my':
                    await this.renderMyReports(contentContainer);
                    break;
                case 'rating':
                    await this.renderRating(contentContainer);
                    break;
                case 'all':
                    await this.renderAllReports(contentContainer);
                    break;
            }
        },

        renderCreateReportForm(container) {
            container.innerHTML = `
                <div class="report-form-container">
                    <h3>📝 Создать отчет адвоката</h3>
                    <div class="form-group">
                        <label for="articles">Статьи закона *</label>
                        <textarea id="articles" rows="4" placeholder="Пример: ст. 17.1"></textarea>
                        <small>Перечислите все статьи, по которым проходило задержание</small>
                    </div>
                    <div class="form-group">
                        <label for="call-result">Результат вызова *</label>
                        <select id="call-result">
                            <option value="">Выберите результат</option>
                            <option value="Отпустили">✅ Отпустили</option>
                            <option value="Посадили">🔒 Посадили</option>
                        </select>
                    </div>
                    <div class="form-group photo-field">
                        <label>📸 Фото 1: Факт приезда на вызов *</label>
                        <div class="photo-upload-area" data-type="arrival">
                            <input type="file" accept="image/*" class="photo-input" data-type="arrival" style="display: none;">
                            <div class="upload-placeholder">
                                <span class="upload-icon">📷</span>
                                <span>Нажмите для выбора фото или вставьте из буфера (Ctrl+V)</span>
                                <small>JPG, PNG до 5MB (будет сжато до 1MB)</small>
                            </div>
                            <div class="photo-preview" style="display: none;">
                                <img src="" alt="Preview">
                                <button class="remove-photo">✖</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group photo-field">
                        <label>📸 Фото 2: Результат вызова *</label>
                        <div class="photo-upload-area" data-type="result">
                            <input type="file" accept="image/*" class="photo-input" data-type="result" style="display: none;">
                            <div class="upload-placeholder">
                                <span class="upload-icon">📷</span>
                                <span>Нажмите для выбора фото или вставьте из буфера (Ctrl+V)</span>
                                <small>Если отпустили - фото на свободе</small>
                            </div>
                            <div class="photo-preview" style="display: none;">
                                <img src="" alt="Preview">
                                <button class="remove-photo">✖</button>
                            </div>
                        </div>
                        <div class="hint-text" id="result-hint"></div>
                    </div>
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="had-lawyer">
                            <span>👨‍⚖️ Был ли на вызове юрист?</span>
                        </label>
                    </div>
                    <div id="lawyer-photo-container" style="display: none;">
                        <div class="form-group photo-field">
                            <label>📸 Фото 3: Доказательство присутствия юриста *</label>
                            <div class="photo-upload-area" data-type="lawyer">
                                <input type="file" accept="image/*" class="photo-input" data-type="lawyer" style="display: none;">
                                <div class="upload-placeholder">
                                    <span class="upload-icon">📷</span>
                                    <span>Нажмите для выбора фото или вставьте из буфера (Ctrl+V)</span>
                                    <small>Скриншот с юристом</small>
                                </div>
                                <div class="photo-preview" style="display: none;">
                                    <img src="" alt="Preview">
                                    <button class="remove-photo">✖</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button id="submit-report-btn" class="btn btn-primary">📤 Отправить отчет</button>
                </div>
            `;
            this.initPhotoUploads();
            this.initCheckboxToggle();
            this.initResultHint();
            this.initSubmitHandler();
        },

        initPhotoUploads() {
            const uploadAreas = document.querySelectorAll('.photo-upload-area');
            uploadAreas.forEach(area => {
                const type = area.dataset.type;
                const fileInput = area.querySelector('.photo-input');
                const placeholder = area.querySelector('.upload-placeholder');
                const preview = area.querySelector('.photo-preview');
                const previewImg = preview.querySelector('img');
                const removeBtn = preview.querySelector('.remove-photo');
                const processFile = async (file) => {
                    if (file.size > 5 * 1024 * 1024) {
                        this.showNotification('Файл слишком большой. Максимум 5MB', 'error');
                        return;
                    }
                    if (!file.type.startsWith('image/')) {
                        this.showNotification('Можно загружать только изображения', 'error');
                        return;
                    }
                    this.showNotification('Сжатие изображения...', 'info');
                    try {
                        const compressedFile = await this.compressImage(file, 1);
                        selectedFiles[type] = compressedFile;
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewImg.src = e.target.result;
                            placeholder.style.display = 'none';
                            preview.style.display = 'flex';
                        };
                        reader.readAsDataURL(compressedFile);
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(compressedFile);
                        fileInput.files = dataTransfer.files;
                        this.showNotification(`Фото сжато (${(compressedFile.size / 1024 / 1024).toFixed(1)} МБ)`, 'success');
                    } catch (err) {
                        console.error(err);
                        this.showNotification('Ошибка сжатия изображения', 'error');
                    }
                };
                area.addEventListener('click', (e) => {
                    if (e.target.closest('.remove-photo')) return;
                    fileInput.click();
                });
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) processFile(file);
                });
                area.addEventListener('paste', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let item of items) {
                        if (item.type.indexOf('image') !== -1) {
                            const blob = item.getAsFile();
                            if (blob) {
                                const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
                                await processFile(file);
                            }
                            break;
                        }
                    }
                });
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectedFiles[type] = null;
                        fileInput.value = '';
                        placeholder.style.display = 'flex';
                        preview.style.display = 'none';
                        previewImg.src = '';
                    });
                }
            });
        },

        initCheckboxToggle() {
            const checkbox = document.getElementById('had-lawyer');
            const container = document.getElementById('lawyer-photo-container');
            if (checkbox && container) {
                checkbox.addEventListener('change', (e) => {
                    container.style.display = e.target.checked ? 'block' : 'none';
                    if (!e.target.checked) selectedFiles.lawyer = null;
                });
            }
        },

        initResultHint() {
            const resultSelect = document.getElementById('call-result');
            const hintDiv = document.getElementById('result-hint');
            if (resultSelect && hintDiv) {
                resultSelect.addEventListener('change', (e) => {
                    const value = e.target.value;
                    if (value === 'Отпустили') {
                        hintDiv.innerHTML = '💡 Подсказка: Фото на свободе с задержанным';
                        hintDiv.style.color = '#4caf50';
                    } else if (value === 'Посадили') {
                        hintDiv.innerHTML = '💡 Подсказка: Можно использовать фото факта приезда';
                        hintDiv.style.color = '#ff9800';
                    } else {
                        hintDiv.innerHTML = '';
                    }
                });
            }
        },

        initSubmitHandler() {
            const submitBtn = document.getElementById('submit-report-btn');
            if (!submitBtn) return;
            submitBtn.addEventListener('click', async () => {
                const articles = document.getElementById('articles')?.value.trim();
                const callResult = document.getElementById('call-result')?.value;
                const hadLawyer = document.getElementById('had-lawyer')?.checked;
                if (!articles) return this.showNotification('Заполните статьи закона', 'error');
                if (!callResult) return this.showNotification('Выберите результат вызова', 'error');
                if (!selectedFiles.arrival) return this.showNotification('Загрузите фото факта приезда', 'error');
                if (!selectedFiles.result) return this.showNotification('Загрузите фото результата', 'error');
                if (hadLawyer && !selectedFiles.lawyer) return this.showNotification('Загрузите фото юриста', 'error');
                submitBtn.disabled = true;
                let originalText = submitBtn.textContent;
                submitBtn.textContent = 'Отправка... (попытка 1/3)';
                let retryCount = 0;
                const attemptSend = async () => {
                    try {
                        let token = sessionStorage.getItem('auth_token') || window.Auth?.token;
                        if (!token) throw new Error('Не найден токен авторизации');
                        const userData = window.Auth?.currentUser || {};
                        const formData = new FormData();
                        formData.append('articles', articles);
                        formData.append('callResult', callResult);
                        formData.append('hadJurist', hadLawyer ? 'true' : 'false');
                        formData.append('lawyerName', userData.character_name || 'Тест');
                        formData.append('lawyerStaticId', userData.static_id || '123');
                        formData.append('arrivalPhoto', selectedFiles.arrival);
                        formData.append('resultPhoto', selectedFiles.result);
                        if (hadLawyer && selectedFiles.lawyer) formData.append('lawyerPhoto', selectedFiles.lawyer);
                        const result = await window.API.sendLawyerReportWithFiles(token, formData);
                        if (result.success) {
                            this.showNotification('Отчет успешно отправлен!', 'success');
                            this.clearForm();
                            setTimeout(() => { this.currentTab = 'my'; this.render(); }, 1500);
                            return true;
                        } else {
                            throw new Error(result.error || 'Ошибка при отправке');
                        }
                    } catch (error) {
                        if (retryCount < 2 && 
                            (error.message.includes('Failed to fetch') || 
                             error.message.includes('ERR_CONNECTION_RESET') ||
                             error.name === 'AbortError')) {
                            retryCount++;
                            submitBtn.textContent = `Отправка... (попытка ${retryCount+1}/3)`;
                            await new Promise(r => setTimeout(r, 2000 * retryCount));
                            return await attemptSend();
                        }
                        throw error;
                    }
                };
                try {
                    await attemptSend();
                } catch (error) {
                    console.error('Submit error:', error);
                    let errorMsg = 'Ошибка: ';
                    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_RESET')) {
                        errorMsg += 'Нестабильное соединение. Проверьте интернет или VPN. Попробуйте позже.';
                    } else if (error.name === 'AbortError') {
                        errorMsg += 'Превышено время ожидания. Файлы слишком большие или медленный интернет.';
                    } else {
                        errorMsg += error.message;
                    }
                    this.showNotification(errorMsg, 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        },

        clearForm() {
            document.getElementById('articles').value = '';
            document.getElementById('call-result').value = '';
            document.getElementById('had-lawyer').checked = false;
            selectedFiles = { arrival: null, result: null, lawyer: null };
            document.querySelectorAll('.photo-upload-area').forEach(area => {
                const input = area.querySelector('.photo-input');
                const placeholder = area.querySelector('.upload-placeholder');
                const preview = area.querySelector('.photo-preview');
                if (input) input.value = '';
                if (placeholder) placeholder.style.display = 'flex';
                if (preview) preview.style.display = 'none';
            });
            document.getElementById('lawyer-photo-container').style.display = 'none';
        },

        async renderMyReports(container) {
            container.innerHTML = '<div class="loader">Загрузка отчетов...</div>';
            try {
                let token = sessionStorage.getItem('auth_token') || window.Auth?.token;
                if (!token) {
                    container.innerHTML = '<div class="error">Ошибка авторизации. <button onclick="window.Auth.showAuthModal()" class="btn btn-primary">Войти</button></div>';
                    return;
                }
                const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success && result.reports) {
                    const reports = result.reports;
                    const total = reports.length;
                    const released = reports.filter(r => r.call_result === 'Отпустили').length;
                    const jailed = reports.filter(r => r.call_result === 'Посадили').length;
                    const withJurist = reports.filter(r => r.had_jurist).length;
                    container.innerHTML = `
                        <div class="my-reports-container">
                            <div class="stats-container-modern">
                                <div class="stat-card-modern"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-value">${total}</div><div class="stat-label">Всего отчетов</div></div></div>
                                <div class="stat-card-modern stat-released"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-value" style="color:#4caf50">${released}</div><div class="stat-label">Отпустили</div></div></div>
                                <div class="stat-card-modern stat-jailed"><div class="stat-icon">🔒</div><div class="stat-info"><div class="stat-value" style="color:#f44336">${jailed}</div><div class="stat-label">Посадили</div></div></div>
                                <div class="stat-card-modern stat-jurist"><div class="stat-icon">👨‍⚖️</div><div class="stat-info"><div class="stat-value" style="color:#ff9800">${withJurist}</div><div class="stat-label">С юристом</div></div></div>
                            </div>
                            <div class="reports-list-modern">
                                <div class="reports-header-modern"><h4>📋 История отчетов</h4><span class="reports-count">${reports.length} записей</span></div>
                                ${reports.length === 0 ? '<div class="empty-state-modern">📭 У вас пока нет отчетов</div>' : reports.map(report => `
                                    <div class="report-card-modern">
                                        <div class="report-card-header">
                                            <div class="report-date-badge">
                                                <span class="date-day">${new Date(report.created_at).getDate()}</span>
                                                <span class="date-month">${new Date(report.created_at).toLocaleString('ru-RU', { month: 'short' })}</span>
                                            </div>
                                            <div class="report-result-badge ${report.call_result === 'Отпустили' ? 'badge-released' : 'badge-jailed'}">
                                                ${report.call_result}
                                            </div>
                                        </div>
                                        <div class="report-card-body">
                                            <div class="report-articles-section">
                                                <div class="section-label">📜 Статьи закона</div>
                                                <div class="articles-content">${this.escapeHtml(report.articles)}</div>
                                            </div>
                                            <div class="report-footer">
                                                <div class="report-jurist-info">
                                                    <span class="jurist-icon">${report.had_jurist ? '👨‍⚖️' : '👤'}</span>
                                                    <span>${report.had_jurist ? 'Был юрист' : 'Без юриста'}</span>
                                                </div>
                                                <div class="report-time">🕐 ${new Date(report.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    container.innerHTML = `<div class="error">❌ Ошибка: ${result.error || 'Неизвестно'}</div>`;
                }
            } catch (error) {
                container.innerHTML = `<div class="error">❌ Ошибка загрузки: ${error.message}</div>`;
            }
        },

        async renderRating(container) {
            if (this.isLoadingRating) return;
            this.isLoadingRating = true;
            container.innerHTML = '<div class="loader">Загрузка рейтинга...</div>';
            try {
                let token = sessionStorage.getItem('auth_token') || window.Auth?.token;
                if (!token) throw new Error('Нет токена');
                const response = await fetch(`https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports?rating=true&offset=${this.currentWeekOffset}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (!result.success || !result.rating) {
                    container.innerHTML = `<div class="error">Ошибка: ${result.error || 'Нет данных'}</div>`;
                    return;
                }
                const rating = result.rating;
                const weekStart = new Date(result.week_start).toLocaleDateString('ru-RU');
                const weekEnd = new Date(result.week_end).toLocaleDateString('ru-RU');
                container.innerHTML = `
                    <div class="rating-container-modern">
                        <div class="rating-header-modern">
                            <div class="rating-title-section">
                                <div class="rating-icon">🏆</div>
                                <div><h2>Рейтинг адвокатов</h2><p class="rating-subtitle">Недельная статистика</p></div>
                            </div>
                            <div class="week-navigation">
                                <button class="week-nav-btn prev-week" id="prev-week-btn">← Предыдущая неделя</button>
                                <div class="week-info">
                                    <span class="week-date">${weekStart} - ${weekEnd}</span>
                                    <span class="week-badge ${this.currentWeekOffset === 0 ? 'current-week' : 'other-week'}">
                                        ${this.currentWeekOffset === 0 ? 'Текущая неделя' : `${Math.abs(this.currentWeekOffset)} ${this.getWeekDeclension(Math.abs(this.currentWeekOffset))} назад`}
                                    </span>
                                </div>
                                <button class="week-nav-btn next-week" id="next-week-btn" ${this.currentWeekOffset === 0 ? 'disabled' : ''}>Следующая неделя →</button>
                            </div>
                        </div>
                        <div class="rating-rules-modern">
                            <div class="rule-item"><span class="rule-icon">✅</span><span>Освободил</span><span class="rule-points">+1</span></div>
                            <div class="rule-item"><span class="rule-icon">🔒</span><span>Посадил</span><span class="rule-points">+0.5</span></div>
                            <div class="rule-item"><span class="rule-icon">👨‍⚖️</span><span>С юристом</span><span class="rule-points">+0.5</span></div>
                        </div>
                        ${rating.length === 0 ? `<div class="empty-state-modern">Нет данных за период</div>` : `
                            <div class="rating-list-modern">
                                <div class="top-three">
                                    ${rating.slice(0,3).map((lawyer,i) => `
                                        <div class="top-card ${i===0?'first':i===1?'second':'third'}">
                                            <div class="top-rank">${i===0?'🥇':i===1?'🥈':'🥉'}</div>
                                            <div class="top-avatar">
                                                ${lawyer.avatar_url ? `<img src="${lawyer.avatar_url}" alt="avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="top-avatar-placeholder" style="display:none">👤</div>` : `<div class="top-avatar-placeholder">👤</div>`}
                                            </div>
                                            <div class="top-name">${this.escapeHtml(lawyer.lawyer_name)}</div>
                                            <div class="top-score">${lawyer.score.toFixed(1)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                ${rating.length > 3 ? `
                                    <div class="rating-table-modern">
                                        <div class="table-header">
                                            <div class="col-rank">#</div><div class="col-lawyer">Адвокат</div><div class="col-id">Static ID</div>
                                            <div class="col-calls">Вызовы</div><div class="col-released">Освободил</div><div class="col-jailed">Посадил</div>
                                            <div class="col-jurist">С юристом</div><div class="col-score">Баллы</div>
                                        </div>
                                        ${rating.slice(3).map((lawyer,idx) => `
                                            <div class="table-row">
                                                <div class="col-rank">${idx+4}</div>
                                                <div class="col-lawyer"><strong>${this.escapeHtml(lawyer.lawyer_name)}</strong></div>
                                                <div class="col-id">${this.escapeHtml(lawyer.lawyer_static_id)}</div>
                                                <div class="col-calls">${lawyer.total_calls}</div>
                                                <div class="col-released">${lawyer.released_count}</div>
                                                <div class="col-jailed">${lawyer.jailed_count}</div>
                                                <div class="col-jurist">${lawyer.with_jurist_count}</div>
                                                <div class="col-score">${lawyer.score.toFixed(1)}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `}
                    </div>
                `;
                const prevBtn = document.getElementById('prev-week-btn');
                const nextBtn = document.getElementById('next-week-btn');
                if (prevBtn) prevBtn.addEventListener('click', async () => { this.currentWeekOffset++; await this.renderRating(container); });
                if (nextBtn) nextBtn.addEventListener('click', async () => { if (this.currentWeekOffset > 0) { this.currentWeekOffset--; await this.renderRating(container); } });
            } catch (error) {
                console.error(error);
                container.innerHTML = `<div class="error">Ошибка загрузки рейтинга: ${error.message}</div>`;
            } finally {
                this.isLoadingRating = false;
            }
        },

        getWeekDeclension(number) {
            if (number === 1) return 'неделю';
            if (number >= 2 && number <= 4) return 'недели';
            return 'недель';
        },

        async renderAllReports(container) {
            container.innerHTML = '<div class="loader">Загрузка всех отчетов...</div>';
            try {
                let token = sessionStorage.getItem('auth_token') || window.Auth?.token;
                if (!token) {
                    container.innerHTML = '<div class="error">Ошибка авторизации</div>';
                    return;
                }
                const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports?all=true', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success && result.reports) {
                    const reports = result.reports;
                    container.innerHTML = `
                        <div class="all-reports-container">
                            <div class="reports-header"><h3>📊 Все отчеты адвокатов</h3><p class="reports-count">Всего: ${reports.length}</p></div>
                            <div class="admin-filters">
                                <input type="text" id="filter-lawyer" placeholder="🔍 По имени" class="filter-input">
                                <input type="text" id="filter-static-id" placeholder="🆔 По Static ID" class="filter-input">
                                <input type="date" id="filter-date" class="filter-input">
                                <button id="reset-filters" class="btn-secondary">Сбросить</button>
                            </div>
                            <div id="reports-list-container" class="reports-list">
                                ${reports.map(report => `
                                    <div class="report-card" data-name="${this.escapeHtml(report.lawyer_name).toLowerCase()}" data-static-id="${this.escapeHtml(report.lawyer_static_id).toLowerCase()}" data-date="${new Date(report.created_at).toISOString().split('T')[0]}">
                                        <div class="report-header">
                                            <div class="report-lawyer-name">${this.escapeHtml(report.lawyer_name)}</div>
                                            <span class="report-result ${report.call_result === 'Отпустили' ? 'result-released' : 'result-jailed'}">${report.call_result}</span>
                                        </div>
                                        <div class="report-articles"><strong>Статьи:</strong> ${this.escapeHtml(report.articles)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    // простые фильтры (без полной реализации, можно оставить как есть)
                }
            } catch (error) {
                container.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
            }
        },

        addStyles() {
            if (document.getElementById('lawyer-reports-styles')) return;
            const styles = document.createElement('style');
            styles.id = 'lawyer-reports-styles';
            styles.textContent = `
                /* Общие стили */
                .reports-tabs { display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 1px solid var(--color-gray-light); padding-bottom: 10px; flex-wrap: wrap; }
                .tab-btn { background: none; border: none; padding: 10px 20px; cursor: pointer; font-size: 16px; color: var(--color-light); border-radius: 8px; transition: all 0.3s ease; }
                .tab-btn.active { background: var(--color-accent); color: var(--color-darker); }

                /* Стили рейтинга - ОБНОВЛЕННЫЕ */
                .rating-container-modern { 
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    border-radius: 24px; 
                    padding: 30px; 
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                
                .rating-header-modern { 
                    text-align: center; 
                    margin-bottom: 30px; 
                }
                
                .rating-title-section { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 15px; 
                    margin-bottom: 20px; 
                }
                
                .rating-icon { 
                    font-size: 48px; 
                    animation: bounce 2s ease-in-out infinite; 
                }
                
                @keyframes bounce { 
                    0%, 100% { transform: translateY(0); } 
                    50% { transform: translateY(-10px); } 
                }
                
                .rating-subtitle { 
                    color: #888; 
                    font-size: 14px; 
                    margin-top: 5px; 
                }
                
                .week-navigation { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 20px; 
                    margin-top: 20px; 
                    flex-wrap: wrap; 
                }
                
                .week-nav-btn { 
                    background: rgba(255,255,255,0.1); 
                    border: 1px solid rgba(255,255,255,0.2); 
                    color: #fff; 
                    padding: 8px 20px; 
                    border-radius: 25px; 
                    cursor: pointer; 
                    transition: all 0.3s ease;
                }
                
                .week-nav-btn:hover:not(:disabled) { 
                    background: rgba(255,255,255,0.2); 
                    transform: translateY(-2px);
                }
                
                .week-nav-btn:disabled { 
                    opacity: 0.3; 
                    cursor: not-allowed; 
                }
                
                .week-info { 
                    text-align: center; 
                }
                
                .week-date { 
                    display: block; 
                    font-weight: bold; 
                    font-size: 18px; 
                    color: #ffd700; 
                }
                
                .week-badge { 
                    display: inline-block; 
                    font-size: 12px; 
                    padding: 4px 12px; 
                    border-radius: 20px; 
                    margin-top: 5px; 
                }
                
                .week-badge.current-week { 
                    background: #4caf50; 
                    color: white; 
                }
                
                .week-badge.other-week { 
                    background: #ff9800; 
                    color: white; 
                }
                
                /* Правила начисления баллов */
                .rating-rules-modern { 
                    display: flex; 
                    justify-content: center; 
                    gap: 20px; 
                    margin-bottom: 40px; 
                    flex-wrap: wrap; 
                }
                
                .rule-item { 
                    background: rgba(255,255,255,0.05); 
                    padding: 8px 16px; 
                    border-radius: 30px; 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    font-size: 14px; 
                }
                
                .rule-points { 
                    background: #ffd700; 
                    color: #1a1a2e; 
                    padding: 2px 8px; 
                    border-radius: 20px; 
                    font-weight: bold; 
                    margin-left: 5px; 
                }
                
                /* Топ-3 карточки */
                .top-three { 
                    display: flex; 
                    justify-content: center; 
                    align-items: flex-end; 
                    gap: 30px; 
                    margin-bottom: 50px; 
                    flex-wrap: wrap; 
                }
                
                .top-card { 
                    text-align: center; 
                    padding: 20px; 
                    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); 
                    border-radius: 20px; 
                    min-width: 180px; 
                    backdrop-filter: blur(10px);
                    transition: transform 0.3s ease;
                }
                
                .top-card:hover { 
                    transform: translateY(-5px); 
                }
                
                .top-card.first { 
                    border: 2px solid #ffd700; 
                    box-shadow: 0 0 30px rgba(255,215,0,0.3); 
                    background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05));
                }
                
                .top-card.second { 
                    border: 1px solid #c0c0c0; 
                }
                
                .top-card.third { 
                    border: 1px solid #cd7f32; 
                }
                
                .top-rank { 
                    font-size: 40px; 
                    margin-bottom: 15px; 
                }
                
                /* Аватар - ИСПРАВЛЕННЫЙ размер */
                .top-avatar { 
                    width: 100px; 
                    height: 100px; 
                    margin: 0 auto 15px; 
                    border-radius: 50%; 
                    overflow: hidden; 
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .top-avatar img { 
                    width: 100%; 
                    height: 100%; 
                    object-fit: cover; 
                }
                
                .top-avatar-placeholder { 
                    font-size: 50px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    width: 100%; 
                    height: 100%; 
                }
                
                .top-name { 
                    font-weight: bold; 
                    font-size: 18px; 
                    margin-bottom: 8px; 
                    color: #fff; 
                }
                
                .top-score { 
                    font-size: 28px; 
                    font-weight: bold; 
                    color: #ffd700; 
                }
                
                /* Таблица рейтинга */
                .rating-table-modern { 
                    overflow-x: auto; 
                    background: rgba(255,255,255,0.05); 
                    border-radius: 16px; 
                    padding: 15px; 
                }
                
                .table-header, .table-row { 
                    display: grid; 
                    grid-template-columns: 60px minmax(180px,1fr) 120px 80px 80px 80px 80px 80px; 
                    gap: 8px; 
                    min-width: 800px; 
                    padding: 12px 10px;
                }
                
                .table-header { 
                    background: rgba(0,0,0,0.3); 
                    font-weight: bold; 
                    color: #ffd700; 
                    border-radius: 12px;
                    margin-bottom: 8px;
                }
                
                .table-row { 
                    border-bottom: 1px solid rgba(255,255,255,0.1); 
                    transition: background 0.2s ease;
                }
                
                .table-row:hover { 
                    background: rgba(255,255,255,0.05); 
                }
                
                .col-rank, .col-calls, .col-released, .col-jailed, .col-jurist, .col-score { 
                    text-align: center; 
                }
                
                .col-score { 
                    font-weight: bold; 
                    color: #ffd700; 
                }
                
                /* Фото-зоны */
                .photo-upload-area { 
                    border: 2px dashed #333; 
                    border-radius: 12px; 
                    padding: 20px; 
                    text-align: center; 
                    cursor: pointer; 
                    background: #1a1a2e; 
                    transition: all 0.3s ease;
                }
                
                .photo-upload-area:hover { 
                    border-color: #ffd700; 
                    background: rgba(255,215,0,0.05);
                }
                
                .photo-preview { 
                    position: relative; 
                    display: inline-block; 
                }
                
                .photo-preview img { 
                    max-width: 200px; 
                    max-height: 150px; 
                    border-radius: 8px; 
                    object-fit: cover; 
                }
                
                .remove-photo { 
                    position: absolute; 
                    top: -10px; 
                    right: -10px; 
                    background: #f44336; 
                    color: white; 
                    border: none; 
                    border-radius: 50%; 
                    width: 24px; 
                    height: 24px; 
                    cursor: pointer; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .empty-state-modern {
                    text-align: center;
                    padding: 40px;
                    color: #888;
                    font-size: 16px;
                }
                
                .loader {
                    text-align: center;
                    padding: 40px;
                    color: #ffd700;
                }
                
                .error {
                    text-align: center;
                    padding: 40px;
                    color: #f44336;
                }
            `;
            document.head.appendChild(styles);
        },

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:white;z-index:10000;background:${type==='success'?'#4caf50':type==='error'?'#f44336':'#2196f3'};animation:slideIn 0.3s ease;`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    };

    window.Pages = window.Pages || {};
    window.Pages.LawyerReports = LawyerReports;
})();