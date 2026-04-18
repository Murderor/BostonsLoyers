// js/pages/lawyer-reports.js
(function() {
    
    // Переменные для хранения файлов
    let selectedFiles = {
        arrival: null,      // Факт приезда (обязательно)
        result: null,       // Результат (обязательно)
        lawyer: null        // Юрист (только если чекбокс отмечен)
    };
    
    const LawyerReports = {
        currentTab: 'create',
        currentPage: 1,
        itemsPerPage: 10,
        currentUserRole: 0,
        currentWeekOffset: 0, // 0 = текущая неделя, -1 = прошлая, 1 = следующая
        
        async render() {
            
            const container = document.getElementById('page-content');
            if (!container) {
                console.error('Page content container not found');
                return;
            }
            
            // Получаем роль текущего пользователя
            this.currentUserRole = window.Auth?.currentUser?.role_level || 0;
            
            container.innerHTML = `
                <div class="page-container">
                    <h1 class="page-title">📋 Отчеты адвоката</h1>
                    <p class="page-description">Ведите учет вызовов и формируйте отчеты о работе</p>
                    
                    <div class="reports-tabs">
                        <button class="tab-btn ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">
                            ✏️ Создать отчет
                        </button>
                        <button class="tab-btn ${this.currentTab === 'my' ? 'active' : ''}" data-tab="my">
                            📄 Мои отчеты
                        </button>
                        <button class="tab-btn ${this.currentTab === 'rating' ? 'active' : ''}" data-tab="rating">
                            🏆 Рейтинг недели
                        </button>
                        ${this.currentUserRole >= 6 ? `
                        <button class="tab-btn ${this.currentTab === 'all' ? 'active' : ''}" data-tab="all">
                            🌐 Все отчеты
                        </button>
                        ` : ''}
                    </div>
                    
                    <div id="reports-content"></div>
                </div>
            `;
            
            // Добавляем стили
            this.addStyles();
            
            // Добавляем обработчики для табов
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = btn.dataset.tab;
                    this.currentTab = tab;
                    this.render();
                });
            });
            
            // Загружаем содержимое вкладки
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
                                <small>JPG, PNG до 5MB</small>
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
                                <small>Если отпустили - фото на свободе, если посадили - можно дублировать первое</small>
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
                                    <small>Скриншот с юристом на вызове</small>
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
            
            // Инициализация обработчиков
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
                
                // Клик для выбора файла
                area.addEventListener('click', (e) => {
                    if (e.target === removeBtn || removeBtn?.contains(e.target)) return;
                    fileInput.click();
                });
                
                // Обработка вставки из буфера обмена
                area.addEventListener('paste', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    
                    let imageBlob = null;
                    
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                            imageBlob = items[i].getAsFile();
                            break;
                        }
                    }
                    
                    if (imageBlob) {
                        // Создаем файл из blob
                        const file = new File([imageBlob], `pasted-image-${Date.now()}.png`, { type: imageBlob.type });
                        
                        if (file.size > 5 * 1024 * 1024) {
                            this.showNotification('Файл слишком большой. Максимум 5MB', 'error');
                            return;
                        }
                        
                        selectedFiles[type] = file;
                        
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewImg.src = e.target.result;
                            placeholder.style.display = 'none';
                            preview.style.display = 'flex';
                        };
                        reader.readAsDataURL(file);
                        
                        // Обновляем fileInput для совместимости
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        this.showNotification('Изображение вставлено из буфера обмена', 'success');
                    } else {
                        this.showNotification('Не удалось найти изображение в буфере обмена', 'error');
                    }
                });
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    if (file.size > 5 * 1024 * 1024) {
                        this.showNotification('Файл слишком большой. Максимум 5MB', 'error');
                        return;
                    }
                    
                    if (!file.type.startsWith('image/')) {
                        this.showNotification('Можно загружать только изображения', 'error');
                        return;
                    }
                    
                    selectedFiles[type] = file;
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        placeholder.style.display = 'none';
                        preview.style.display = 'flex';
                    };
                    reader.readAsDataURL(file);
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
        
        initCheckboxToggle() {
            const checkbox = document.getElementById('had-lawyer');
            const container = document.getElementById('lawyer-photo-container');
            
            if (checkbox && container) {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                        if (selectedFiles.lawyer) {
                            selectedFiles.lawyer = null;
                            const lawyerArea = document.querySelector('.photo-upload-area[data-type="lawyer"]');
                            if (lawyerArea) {
                                const fileInput = lawyerArea.querySelector('.photo-input');
                                const placeholder = lawyerArea.querySelector('.upload-placeholder');
                                const preview = lawyerArea.querySelector('.photo-preview');
                                if (fileInput) fileInput.value = '';
                                if (placeholder) placeholder.style.display = 'flex';
                                if (preview) preview.style.display = 'none';
                            }
                        }
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
                
                if (!articles) {
                    this.showNotification('Заполните статьи закона', 'error');
                    return;
                }
                
                if (!callResult) {
                    this.showNotification('Выберите результат вызова', 'error');
                    return;
                }
                
                if (!selectedFiles.arrival) {
                    this.showNotification('Загрузите фото факта приезда', 'error');
                    return;
                }
                
                if (!selectedFiles.result) {
                    this.showNotification('Загрузите фото результата', 'error');
                    return;
                }
                
                if (hadLawyer && !selectedFiles.lawyer) {
                    this.showNotification('Вы отметили "Был юрист", но не загрузили доказательство', 'error');
                    return;
                }
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Отправка...';
                
                try {
                    let token = sessionStorage.getItem('auth_token');
                    if (!token && window.Auth && window.Auth.token) {
                        token = window.Auth.token;
                    }
                    
                    if (!token) {
                        throw new Error('Не найден токен авторизации');
                    }
                    
                    const userData = window.Auth?.currentUser || {};
                    
                    const formData = new FormData();
                    formData.append('articles', articles);
                    formData.append('callResult', callResult);
                    formData.append('hadJurist', hadLawyer ? 'true' : 'false');
                    formData.append('lawyerName', userData.character_name || 'Тест');
                    formData.append('lawyerStaticId', userData.static_id || '123');
                    formData.append('arrivalPhoto', selectedFiles.arrival);
                    formData.append('resultPhoto', selectedFiles.result);
                    if (hadLawyer && selectedFiles.lawyer) {
                        formData.append('lawyerPhoto', selectedFiles.lawyer);
                    }
                    
                    const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/send-lawyer-report', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData,
                        mode: 'cors',
                        credentials: 'omit'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showNotification('Отчет успешно отправлен!', 'success');
                        this.clearForm();
                        setTimeout(() => {
                            this.currentTab = 'my';
                            this.render();
                        }, 1500);
                    } else {
                        this.showNotification(result.error || 'Ошибка при отправке', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    this.showNotification('Ошибка при отправке отчета: ' + error.message, 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '📤 Отправить отчет';
                }
            });
        },
        
        clearForm() {
            const articlesInput = document.getElementById('articles');
            const resultSelect = document.getElementById('call-result');
            const hadLawyerCheckbox = document.getElementById('had-lawyer');
            
            if (articlesInput) articlesInput.value = '';
            if (resultSelect) resultSelect.value = '';
            if (hadLawyerCheckbox) hadLawyerCheckbox.checked = false;
            
            selectedFiles = {
                arrival: null,
                result: null,
                lawyer: null
            };
            
            document.querySelectorAll('.photo-upload-area').forEach(area => {
                const fileInput = area.querySelector('.photo-input');
                const placeholder = area.querySelector('.upload-placeholder');
                const preview = area.querySelector('.photo-preview');
                const previewImg = preview?.querySelector('img');
                
                if (fileInput) fileInput.value = '';
                if (placeholder) placeholder.style.display = 'flex';
                if (preview) preview.style.display = 'none';
                if (previewImg) previewImg.src = '';
            });
            
            const lawyerContainer = document.getElementById('lawyer-photo-container');
            if (lawyerContainer) lawyerContainer.style.display = 'none';
        },
        
        async renderMyReports(container) {
            container.innerHTML = '<div class="loader">Загрузка отчетов...</div>';
            
            try {
                let token = sessionStorage.getItem('auth_token');
                if (!token && window.Auth && window.Auth.token) {
                    token = window.Auth.token;
                }
                
                if (!token) {
                    container.innerHTML = '<div class="error">Ошибка авторизации. <button onclick="window.Auth.showAuthModal()" class="btn btn-primary">Войти</button></div>';
                    return;
                }
                
                const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
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
                                <div class="stat-card-modern">
                                    <div class="stat-icon">📊</div>
                                    <div class="stat-info">
                                        <div class="stat-value">${total}</div>
                                        <div class="stat-label">Всего отчетов</div>
                                    </div>
                                </div>
                                <div class="stat-card-modern stat-released">
                                    <div class="stat-icon">✅</div>
                                    <div class="stat-info">
                                        <div class="stat-value" style="color: #4caf50">${released}</div>
                                        <div class="stat-label">Отпустили</div>
                                    </div>
                                </div>
                                <div class="stat-card-modern stat-jailed">
                                    <div class="stat-icon">🔒</div>
                                    <div class="stat-info">
                                        <div class="stat-value" style="color: #f44336">${jailed}</div>
                                        <div class="stat-label">Посадили</div>
                                    </div>
                                </div>
                                <div class="stat-card-modern stat-jurist">
                                    <div class="stat-icon">👨‍⚖️</div>
                                    <div class="stat-info">
                                        <div class="stat-value" style="color: #ff9800">${withJurist}</div>
                                        <div class="stat-label">С юристом</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="reports-list-modern">
                                <div class="reports-header-modern">
                                    <h4>📋 История отчетов</h4>
                                    <span class="reports-count">${reports.length} записей</span>
                                </div>
                                
                                ${reports.length === 0 ? 
                                    '<div class="empty-state-modern">📭 У вас пока нет отчетов</div>' : 
                                    reports.map(report => `
                                        <div class="report-card-modern">
                                            <div class="report-card-header">
                                                <div class="report-date-badge">
                                                    <span class="date-day">${new Date(report.created_at).getDate()}</span>
                                                    <span class="date-month">${new Date(report.created_at).toLocaleString('ru-RU', { month: 'short' })}</span>
                                                </div>
                                                <div class="report-result-badge ${report.call_result === 'Отпустили' ? 'badge-released' : 'badge-jailed'}">
                                                    ${report.call_result === 'Отпустили' ? '✅ Отпустили' : '🔒 Посадили'}
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
                                                        <span>${report.had_jurist ? 'Был юрист на вызове' : 'Юрист отсутствовал'}</span>
                                                    </div>
                                                    <div class="report-time">
                                                        🕐 ${new Date(report.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    `;
                } else {
                    container.innerHTML = `<div class="error">❌ Ошибка загрузки отчетов: ${result.error || 'Неизвестная ошибка'}</div>`;
                }
            } catch (error) {
                console.error('Error loading reports:', error);
                container.innerHTML = `<div class="error">❌ Ошибка загрузки отчетов: ${error.message}</div>`;
            }
        },
        
        async renderRating(container) {
            container.innerHTML = '<div class="loader">Загрузка рейтинга...</div>';
            
            try {
                let token = sessionStorage.getItem('auth_token');
                if (!token && window.Auth && window.Auth.token) {
                    token = window.Auth.token;
                }
                
                if (!token) {
                    container.innerHTML = '<div class="error">Ошибка авторизации</div>';
                    return;
                }
                
                // Получаем рейтинг за выбранную неделю
                const response = await fetch(`https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports?rating=true&offset=${this.currentWeekOffset}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success && result.rating) {
                    const rating = result.rating;
                    const weekStart = new Date(result.week_start).toLocaleDateString('ru-RU');
                    const weekEnd = new Date(result.week_end).toLocaleDateString('ru-RU');
                    
                    // Определяем, есть ли доступные недели для навигации
                    const hasPrevWeek = true; // Всегда можно посмотреть прошлую неделю
                    const hasNextWeek = this.currentWeekOffset < 0; // Можно вернуться к текущей или будущим только если мы в прошлом
                    
                    container.innerHTML = `
                        <div class="rating-container-modern">
                            <div class="rating-header-modern">
                                <div class="rating-title-section">
                                    <div class="rating-icon">🏆</div>
                                    <div>
                                        <h2>Рейтинг адвокатов</h2>
                                        <p class="rating-subtitle">Недельная статистика и достижения</p>
                                    </div>
                                </div>
                                
                                <div class="week-navigation">
                                    <button class="week-nav-btn prev-week" id="prev-week-btn">
                                        ← Предыдущая неделя
                                    </button>
                                    <div class="week-info">
                                        <span class="week-date">${weekStart} - ${weekEnd}</span>
                                        <span class="week-badge ${this.currentWeekOffset === 0 ? 'current-week' : 'other-week'}">
                                            ${this.currentWeekOffset === 0 ? 'Текущая неделя' : this.currentWeekOffset === -1 ? 'Прошлая неделя' : `${Math.abs(this.currentWeekOffset)} недели назад`}
                                        </span>
                                    </div>
                                    <button class="week-nav-btn next-week" id="next-week-btn">
                                        Следующая неделя →
                                    </button>
                                </div>
                            </div>
                            
                            <div class="rating-rules-modern">
                                <div class="rule-item">
                                    <span class="rule-icon">✅</span>
                                    <span>Освободил человека</span>
                                    <span class="rule-points">+1 балл</span>
                                </div>
                                <div class="rule-item">
                                    <span class="rule-icon">🔒</span>
                                    <span>Посадил человека</span>
                                    <span class="rule-points">+0.5 балла</span>
                                </div>
                                <div class="rule-item">
                                    <span class="rule-icon">👨‍⚖️</span>
                                    <span>На вызове был юрист</span>
                                    <span class="rule-points">+0.5 балла</span>
                                </div>
                            </div>
                            
                            ${rating.length === 0 ? `
                                <div class="empty-state-modern">
                                    <div class="empty-icon">📊</div>
                                    <h3>Нет данных за этот период</h3>
                                    <p>За выбранную неделю нет отчетов адвокатов</p>
                                </div>
                            ` : `
                                <div class="rating-list-modern">
                                    <!-- Топ-3 -->
                                    <div class="top-three">
                                        ${rating.slice(0, 3).map((lawyer, index) => `
                                            <div class="top-card ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                                                <div class="top-rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                                                <div class="top-avatar">
                                                    ${lawyer.avatar_url ? 
                                                        `<img src="${lawyer.avatar_url}" alt="${this.escapeHtml(lawyer.lawyer_name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23d4af37\' stroke-width=\'1\'%3E%3Cpath d=\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\'/%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'/%3E%3C/svg%3E'">` : 
                                                        `<div class="top-avatar-placeholder">${index === 0 ? '👑' : index === 1 ? '⭐' : '🌟'}</div>`
                                                    }
                                                </div>
                                                <div class="top-name">${this.escapeHtml(lawyer.lawyer_name)}</div>
                                                <div class="top-id">${this.escapeHtml(lawyer.lawyer_static_id)}</div>
                                                <div class="top-score">${lawyer.score.toFixed(1)}</div>
                                                <div class="top-stats">
                                                    <span>📞 ${lawyer.total_calls}</span>
                                                    <span>✅ ${lawyer.released_count}</span>
                                                    <span>🔒 ${lawyer.jailed_count}</span>
                                                    <span>👨‍⚖️ ${lawyer.with_jurist_count}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    
                                    <!-- Остальные участники -->
                                    ${rating.length > 3 ? `
                                        <div class="rating-table-modern">
                                            <div class="table-header">
                                                <div class="col-rank">#</div>
                                                <div class="col-lawyer">Адвокат</div>
                                                <div class="col-id">Static ID</div>
                                                <div class="col-calls">Вызовы</div>
                                                <div class="col-released">Освободил</div>
                                                <div class="col-jailed">Посадил</div>
                                                <div class="col-jurist">С юристом</div>
                                                <div class="col-score">Баллы</div>
                                            </div>
                                            ${rating.slice(3).map((lawyer, index) => `
                                                <div class="table-row">
                                                    <div class="col-rank">${index + 4}</div>
                                                    <div class="col-lawyer">
                                                        <div class="lawyer-avatar-small">
                                                            ${lawyer.avatar_url ? 
                                                                `<img src="${lawyer.avatar_url}" alt="${this.escapeHtml(lawyer.lawyer_name)}" onerror="this.style.display='none'">` : 
                                                                '<span>👤</span>'
                                                            }
                                                        </div>
                                                        <strong>${this.escapeHtml(lawyer.lawyer_name)}</strong>
                                                    </div>
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
                    
                    // Добавляем обработчики для кнопок навигации
                    const prevBtn = document.getElementById('prev-week-btn');
                    const nextBtn = document.getElementById('next-week-btn');
                    
                    if (prevBtn) {
                        prevBtn.addEventListener('click', () => {
                            this.currentWeekOffset--;
                            this.renderRating(container);
                        });
                    }
                    
                    if (nextBtn) {
                        nextBtn.addEventListener('click', () => {
                            this.currentWeekOffset++;
                            this.renderRating(container);
                        });
                    }
                    
                    // Стилизуем кнопки в зависимости от доступности
                    if (prevBtn) {
                        prevBtn.style.opacity = '1';
                        prevBtn.style.cursor = 'pointer';
                        prevBtn.disabled = false;
                    }
                    
                    if (nextBtn) {
                        // Блокируем кнопку "Следующая", если мы на текущей неделе
                        if (this.currentWeekOffset === 0) {
                            nextBtn.style.opacity = '0.5';
                            nextBtn.style.cursor = 'not-allowed';
                            nextBtn.disabled = true;
                        } else {
                            nextBtn.style.opacity = '1';
                            nextBtn.style.cursor = 'pointer';
                            nextBtn.disabled = false;
                        }
                    }
                } else {
                    container.innerHTML = `<div class="error">Ошибка загрузки рейтинга: ${result.error || 'Неизвестная ошибка'}</div>`;
                }
            } catch (error) {
                console.error('Error loading rating:', error);
                container.innerHTML = `<div class="error">Ошибка загрузки рейтинга: ${error.message}</div>`;
            }
        },
        
        async renderAllReports(container) {
            container.innerHTML = '<div class="loader">Загрузка отчетов...</div>';
            
            try {
                let token = sessionStorage.getItem('auth_token');
                if (!token && window.Auth && window.Auth.token) {
                    token = window.Auth.token;
                }
                
                if (!token) {
                    container.innerHTML = '<div class="error">Ошибка авторизации</div>';
                    return;
                }
                
                const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/lawyer-reports?all=true', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success && result.reports) {
                    const reports = result.reports;
                    
                    container.innerHTML = `
                        <div class="all-reports-container">
                            <div class="reports-header">
                                <h3>📊 Все отчеты адвокатов</h3>
                                <p class="reports-count">Всего отчетов: ${reports.length}</p>
                            </div>
                            
                            <div class="admin-filters">
                                <div class="filter-group">
                                    <input type="text" id="filter-lawyer" placeholder="🔍 Поиск по имени адвоката..." class="filter-input">
                                </div>
                                <div class="filter-group">
                                    <input type="text" id="filter-static-id" placeholder="🆔 Поиск по Static ID..." class="filter-input">
                                </div>
                                <div class="filter-group">
                                    <input type="date" id="filter-date" class="filter-input">
                                </div>
                                <button id="reset-filters" class="btn-secondary">🔄 Сбросить фильтры</button>
                            </div>
                            
                            <div id="reports-list-container" class="reports-list">
                                ${reports.length === 0 ? 
                                    '<div class="empty-state">📭 Нет отчетов</div>' : 
                                    reports.map(report => `
                                        <div class="report-card" 
                                             data-name="${this.escapeHtml(report.lawyer_name).toLowerCase()}"
                                             data-static-id="${this.escapeHtml(report.lawyer_static_id).toLowerCase()}"
                                             data-date="${new Date(report.created_at).toISOString().split('T')[0]}">
                                            <div class="report-header">
                                                <div class="report-lawyer-info">
                                                    <div class="lawyer-avatar-small">
                                                        ${report.avatar_url ? 
                                                            `<img src="${report.avatar_url}" alt="${this.escapeHtml(report.lawyer_name)}" onerror="this.style.display='none'">` : 
                                                            '<span>👨‍💼</span>'
                                                        }
                                                    </div>
                                                    <div class="report-lawyer-details">
                                                        <span class="report-lawyer-name">${this.escapeHtml(report.lawyer_name)}</span>
                                                        <span class="report-lawyer-id">Static ID: ${this.escapeHtml(report.lawyer_static_id)}</span>
                                                    </div>
                                                </div>
                                                <div class="report-meta">
                                                    <span class="report-date">📅 ${new Date(report.created_at).toLocaleString('ru-RU')}</span>
                                                    <span class="report-result ${report.call_result === 'Отпустили' ? 'result-released' : 'result-jailed'}">
                                                        ${report.call_result === 'Отпустили' ? '✅ Отпустили' : '🔒 Посадили'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="report-body">
                                                <div class="report-articles">
                                                    <strong>📜 Статьи закона:</strong>
                                                    <p>${this.escapeHtml(report.articles)}</p>
                                                </div>
                                                <div class="report-meta-info">
                                                    <span class="meta-badge ${report.had_jurist ? 'jurist-yes' : 'jurist-no'}">
                                                        ${report.had_jurist ? '👨‍⚖️ С юристом' : '👤 Без юриста'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    `;
                    
                    // Добавляем обработчики фильтров
                    const filterLawyer = document.getElementById('filter-lawyer');
                    const filterStaticId = document.getElementById('filter-static-id');
                    const filterDate = document.getElementById('filter-date');
                    const resetBtn = document.getElementById('reset-filters');
                    
                    const filterReportsFn = () => {
                        const lawyerFilter = filterLawyer?.value.toLowerCase() || '';
                        const staticIdFilter = filterStaticId?.value.toLowerCase() || '';
                        const dateFilter = filterDate?.value || '';
                        
                        const reportCards = document.querySelectorAll('#reports-list-container .report-card');
                        let visibleCount = 0;
                        
                        reportCards.forEach(card => {
                            let show = true;
                            const lawyerName = card.getAttribute('data-name') || '';
                            const staticId = card.getAttribute('data-static-id') || '';
                            const reportDate = card.getAttribute('data-date') || '';
                            
                            // Фильтр по имени адвоката
                            if (lawyerFilter && !lawyerName.includes(lawyerFilter)) {
                                show = false;
                            }
                            
                            // Фильтр по Static ID
                            if (show && staticIdFilter && !staticId.includes(staticIdFilter)) {
                                show = false;
                            }
                            
                            // Фильтр по дате
                            if (show && dateFilter && reportDate !== dateFilter) {
                                show = false;
                            }
                            
                            card.style.display = show ? 'block' : 'none';
                            if (show) visibleCount++;
                        });
                        
                        // Обновляем счетчик видимых отчетов
                        const countElement = document.querySelector('.reports-count');
                        if (countElement) {
                            const totalReports = reportCards.length;
                            if (lawyerFilter || staticIdFilter || dateFilter) {
                                countElement.innerHTML = `Показано: ${visibleCount} из ${totalReports} отчетов`;
                            } else {
                                countElement.innerHTML = `Всего отчетов: ${totalReports}`;
                            }
                        }
                    };
                    
                    if (filterLawyer) {
                        filterLawyer.addEventListener('input', filterReportsFn);
                    }
                    
                    if (filterStaticId) {
                        filterStaticId.addEventListener('input', filterReportsFn);
                    }
                    
                    if (filterDate) {
                        filterDate.addEventListener('change', filterReportsFn);
                    }
                    
                    if (resetBtn) {
                        resetBtn.addEventListener('click', () => {
                            if (filterLawyer) filterLawyer.value = '';
                            if (filterStaticId) filterStaticId.value = '';
                            if (filterDate) filterDate.value = '';
                            filterReportsFn();
                        });
                    }
                } else {
                    container.innerHTML = `<div class="error">❌ Ошибка загрузки отчетов: ${result.error || 'Неизвестная ошибка'}</div>`;
                }
            } catch (error) {
                console.error('Error loading reports:', error);
                container.innerHTML = `<div class="error">❌ Ошибка загрузки отчетов: ${error.message}</div>`;
            }
        },
        
        filterReports() {
            const filterLawyer = document.getElementById('filter-lawyer')?.value.toLowerCase() || '';
            const filterDate = document.getElementById('filter-date')?.value;
            
            const reportCards = document.querySelectorAll('#reports-list-container .report-card');
            
            reportCards.forEach(card => {
                let show = true;
                const lawyerName = card.querySelector('.report-lawyer')?.textContent.toLowerCase() || '';
                const dateText = card.querySelector('.report-date')?.textContent || '';
                
                if (filterLawyer && !lawyerName.includes(filterLawyer)) {
                    show = false;
                }
                
                if (filterDate && !dateText.includes(filterDate)) {
                    show = false;
                }
                
                card.style.display = show ? 'block' : 'none';
            });
        },
        
        addStyles() {
            if (document.getElementById('lawyer-reports-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'lawyer-reports-styles';
            styles.textContent = `
                .reports-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 30px;
                    border-bottom: 1px solid var(--color-gray-light);
                    padding-bottom: 10px;
                    flex-wrap: wrap;
                }
                
                .tab-btn {
                    background: none;
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 16px;
                    color: var(--color-light);
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }
                
                .tab-btn:hover {
                    background: var(--color-gray);
                }
                
                .tab-btn.active {
                    background: var(--color-accent);
                    color: var(--color-darker);
                }
                
                /* Современный дизайн рейтинга */
                .rating-container-modern {
                    background: linear-gradient(135deg, var(--color-gray) 0%, var(--color-darker) 100%);
                    border-radius: 20px;
                    padding: 30px;
                    margin-bottom: 30px;
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
                    margin-bottom: 25px;
                }
                
                .rating-icon {
                    font-size: 48px;
                    animation: bounce 2s ease-in-out infinite;
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                .rating-title-section h2 {
                    font-size: 32px;
                    background: linear-gradient(135deg, var(--color-accent), #ffd700);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin: 0;
                }
                
                .rating-subtitle {
                    color: var(--color-gray-light);
                    margin: 5px 0 0;
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
                    background: var(--color-gray);
                    border: 1px solid var(--color-accent);
                    color: var(--color-light);
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }
                
                .week-nav-btn:hover:not(:disabled) {
                    background: var(--color-accent);
                    color: var(--color-darker);
                    transform: translateY(-2px);
                }
                
                .week-nav-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .week-info {
                    text-align: center;
                }
                
                .week-date {
                    display: block;
                    font-size: 18px;
                    font-weight: bold;
                    color: var(--color-accent);
                    margin-bottom: 5px;
                }
                
                .week-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .week-badge.current-week {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4caf50;
                }
                
                .week-badge.other-week {
                    background: rgba(255, 152, 0, 0.2);
                    color: #ff9800;
                }
                
                .rating-rules-modern {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    flex-wrap: wrap;
                    margin-bottom: 40px;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 15px;
                }
                
                .rule-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 16px;
                    background: var(--color-gray);
                    border-radius: 30px;
                }
                
                .rule-icon {
                    font-size: 20px;
                }
                
                .rule-points {
                    font-weight: bold;
                    color: var(--color-accent);
                }
                
                .top-three {
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    gap: 30px;
                    margin-bottom: 40px;
                    flex-wrap: wrap;
                }
                
                .top-card {
                    text-align: center;
                    padding: 25px 20px;
                    background: linear-gradient(135deg, var(--color-darker), var(--color-gray));
                    border-radius: 20px;
                    min-width: 200px;
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .top-card:hover {
                    transform: translateY(-10px);
                }
                
                .top-card.first {
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    border: 2px solid var(--color-accent);
                    box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
                }
                
                .top-card.second {
                    background: linear-gradient(135deg, #1a1a2e, #1e1e2e);
                    border: 2px solid #c0c0c0;
                }
                
                .top-card.third {
                    background: linear-gradient(135deg, #1a1a2e, #2a1a2e);
                    border: 2px solid #cd7f32;
                }
                
                .top-rank {
                    font-size: 48px;
                    margin-bottom: 10px;
                }
                
                .top-avatar {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 15px;
                }
                
                .top-avatar img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid var(--color-accent);
                }
                
                .top-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--color-gray);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 50px;
                    border: 3px solid var(--color-accent);
                }
                
                .top-name {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .top-id {
                    font-size: 14px;
                    color: var(--color-gray-light);
                    margin-bottom: 10px;
                }
                
                .top-score {
                    font-size: 36px;
                    font-weight: bold;
                    color: var(--color-accent);
                    margin-bottom: 10px;
                }
                
                .top-stats {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    font-size: 14px;
                    color: var(--color-gray-light);
                }
                
                /* Исправление для таблицы рейтинга - фиксированная ширина и no-wrap */
                .rating-table-modern {
                    background: var(--color-darker);
                    border-radius: 15px;
                    overflow-x: auto;
                    overflow-y: visible;
                }
                
                .table-header {
                    display: grid;
                    grid-template-columns: 60px minmax(180px, 1fr) 120px 80px 80px 80px 80px 80px;
                    background: var(--color-gray);
                    padding: 15px;
                    font-weight: bold;
                    color: var(--color-accent);
                    gap: 8px;
                    min-width: 800px;
                }
                
                .table-row {
                    display: grid;
                    grid-template-columns: 60px minmax(180px, 1fr) 120px 80px 80px 80px 80px 80px;
                    padding: 12px 15px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                    align-items: center;
                    gap: 8px;
                    min-width: 800px;
                }
                
                /* Фикс для содержимого колонок - запрещаем перенос */
                .table-header > div,
                .table-row > div {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                /* Колонка с именем адвоката может быть чуть шире */
                .col-lawyer {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 160px;
                }
                
                .col-lawyer strong {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .col-id {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .col-calls, .col-released, .col-jailed, .col-jurist, .col-score {
                    text-align: center;
                    white-space: nowrap;
                }
                
                .col-rank {
                    text-align: center;
                    font-weight: bold;
                    font-size: 18px;
                    white-space: nowrap;
                }
                
                .lawyer-avatar-small {
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    background: var(--color-gray);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                .lawyer-avatar-small img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .col-released {
                    color: #4caf50;
                    font-weight: bold;
                    text-align: center;
                }
                
                .col-jailed {
                    color: #f44336;
                    font-weight: bold;
                    text-align: center;
                }
                
                .col-jurist {
                    color: #ff9800;
                    font-weight: bold;
                    text-align: center;
                }
                
                .col-score {
                    color: var(--color-accent);
                    font-weight: bold;
                    font-size: 18px;
                    text-align: center;
                }
                
                .empty-state-modern {
                    text-align: center;
                    padding: 60px 20px;
                }
                
                .empty-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                    opacity: 0.5;
                }
                
                .empty-state-modern h3 {
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                
                .empty-state-modern p {
                    color: var(--color-gray-light);
                }
                
                /* Стили для photo-upload-area с поддержкой вставки */
                .photo-upload-area {
                    border: 2px dashed var(--color-gray);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: var(--color-darker);
                }
                
                .photo-upload-area:hover {
                    border-color: var(--color-accent);
                    background: rgba(212, 175, 55, 0.05);
                }
                
                .upload-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                
                .upload-icon {
                    font-size: 32px;
                }
                
                .upload-placeholder span {
                    font-size: 14px;
                    color: var(--color-light);
                }
                
                .upload-placeholder small {
                    font-size: 12px;
                    color: var(--color-gray-light);
                }
                
                .photo-preview {
                    position: relative;
                    display: flex;
                    justify-content: center;
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
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @media (max-width: 1200px) {
                    .table-header,
                    .table-row {
                        grid-template-columns: 50px minmax(150px, 1fr) 100px 70px 70px 70px 70px 70px;
                        font-size: 12px;
                        gap: 6px;
                        min-width: 720px;
                    }
                }
                
                @media (max-width: 900px) {
                    .table-header,
                    .table-row {
                        grid-template-columns: 40px minmax(130px, 1fr) 90px 60px 60px 60px 60px 60px;
                        font-size: 11px;
                        gap: 5px;
                        min-width: 650px;
                    }
                    
                    .top-card {
                        min-width: 160px;
                        padding: 15px;
                    }
                    
                    .top-avatar {
                        width: 70px;
                        height: 70px;
                    }
                    
                    .top-score {
                        font-size: 28px;
                    }
                }
                
                @media (max-width: 768px) {
                    .rating-container-modern {
                        padding: 15px;
                    }
                    
                    .top-three {
                        gap: 15px;
                    }
                    
                    .top-card {
                        min-width: 130px;
                    }
                    
                    .top-avatar {
                        width: 50px;
                        height: 50px;
                    }
                    
                    .top-name {
                        font-size: 14px;
                    }
                    
                    .top-score {
                        font-size: 22px;
                    }
                    
                    .top-stats {
                        font-size: 10px;
                        gap: 6px;
                    }
                    
                    .week-nav-btn {
                        padding: 6px 12px;
                        font-size: 12px;
                    }
                    
                    .week-date {
                        font-size: 14px;
                    }
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
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };
    
    // Экспортируем модуль
    window.Pages = window.Pages || {};
    window.Pages.LawyerReports = LawyerReports;
    
})();