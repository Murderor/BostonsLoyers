// js/pages/senior.js
window.Pages = window.Pages || {};

window.Pages.Senior = {
    currentTab: 'appeals',
    appeals: [],
    isProcessing: false,
    
    async render() {
        
        if (!window.Auth || !window.Auth.currentUser || !window.Auth.currentUser.id) {
            Utils.showNotification('Необходимо войти в систему', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        if (window.Auth.currentUser.role_level < 5) {
            Utils.showNotification('Доступ запрещен. Требуется уровень доступа 5+', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        const container = document.getElementById('page-content');
        
        if (!container) {
            console.error('Page content container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <h2>👥 Старший состав адвокатуры</h2>
                <p style="margin-top: 0.5rem; color: #aaa;">Добро пожаловать, ${window.Auth.currentUser.character_name || 'Старший состав'} (Уровень ${window.Auth.currentUser.role_level})</p>
                
                <div class="senior-tabs" style="display: flex; gap: 1rem; margin-top: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <button class="tab-btn ${this.currentTab === 'appeals' ? 'active' : ''}" data-tab="appeals">
                        📋 Рассмотреть обращения
                    </button>
                    <button class="tab-btn ${this.currentTab === 'exam-result' ? 'active' : ''}" data-tab="exam-result">
                        📝 Результат проведения экзамена
                    </button>
                </div>
                
                <div id="senior-tab-content" style="margin-top: 2rem;">
                    ${this.currentTab === 'appeals' ? '<div class="loader">Загрузка обращений...</div>' : this.renderExamResultTab()}
                </div>
            </div>
        `;
        
        const tabButtons = container.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        if (this.currentTab === 'appeals') {
            await this.loadAppeals();
        }
        
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },
    
    async loadAppeals() {
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Не найден токен авторизации');
            }
            
            this.appeals = await window.API.getAppeals(token, 'pending');
            
            const container = document.getElementById('senior-tab-content');
            if (container) {
                container.innerHTML = this.renderAppealsTab();
            }
        } catch (error) {
            console.error('Error loading appeals:', error);
            Utils.showNotification('Ошибка загрузки обращений: ' + error.message, 'error');
            
            const container = document.getElementById('senior-tab-content');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 2rem; text-align: center; background: rgba(255,100,100,0.1); border-radius: 12px;">
                        <p style="color: #ff6464;">❌ Ошибка загрузки обращений</p>
                        <button onclick="window.Pages.Senior.loadAppeals()" class="btn-sm" style="margin-top: 1rem;">Повторить</button>
                    </div>
                `;
            }
        }
    },
    
    renderAppealsTab() {
        if (!this.appeals || this.appeals.length === 0) {
            return `
                <div class="senior-appeals">
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,215,0,0.1); border-radius: 8px; border-left: 3px solid #ffd700;">
                        <h3 style="color: #ffd700; margin-bottom: 0.5rem;">📋 Обращения на рассмотрение</h3>
                        <p style="color: #aaa;">Здесь отображаются обращения коллег, требующие вашего внимания и решения</p>
                    </div>
                    
                    <div style="padding: 3rem 2rem; text-align: center; background: rgba(255,255,255,0.03); border-radius: 12px;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                        <h3 style="margin-bottom: 1rem;">Нет обращений на рассмотрение</h3>
                        <p style="color: #aaa;">Все обращения уже обработаны</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="senior-appeals">
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,215,0,0.1); border-radius: 8px; border-left: 3px solid #ffd700;">
                    <h3 style="color: #ffd700; margin-bottom: 0.5rem;">📋 Обращения на рассмотрение</h3>
                    <p style="color: #aaa;">Найдено обращений: ${this.appeals.length}</p>
                </div>
                
                <div class="appeals-list">
                    ${this.appeals.map(appeal => this.renderAppealCard(appeal)).join('')}
                </div>
            </div>
        `;
    },
    
    renderAppealCard(appeal) {
        const details = appeal.details || {};
        let appealTypeText = '';
        
        if (appeal.appeal_type === 'oral_exam') appealTypeText = '📝 Устный экзамен';
        else if (appeal.appeal_type === 'accreditation') appealTypeText = '⚖️ Аккредитация юриста';
        else if (appeal.appeal_type === 'lawyer_promotion') appealTypeText = '⬆️ Повышение до адвоката';
        else appealTypeText = appeal.appeal_type;
        
        return `
            <div class="appeal-card" data-appeal-id="${appeal.id}" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border-left: 3px solid #ffd700;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: #ffd700; margin-bottom: 0.5rem;">${appealTypeText}</h4>
                        <p style="color: #aaa; font-size: 0.9rem;">
                            От: ${appeal.character_name || 'Не указан'} (${appeal.static_id || 'ID не указан'})
                        </p>
                    </div>
                    <span style="background: rgba(255,215,0,0.2); color: #ffd700; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">
                        Ожидает
                    </span>
                </div>
                
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    ${appeal.appeal_type === 'oral_exam' ? `
                        <p style="margin-bottom: 0.5rem;"><strong>📅 Дата экзамена:</strong> ${details.exam_date || 'Не указана'}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>⏰ Время:</strong> ${details.exam_time || 'Не указано'}</p>
                        ${details.additional_info ? `<p><strong>💬 Доп. информация:</strong> ${details.additional_info}</p>` : ''}
                    ` : ''}
                    ${appeal.appeal_type === 'accreditation' ? `
                        <p><strong>📎 Вложения:</strong> Скриншот удостоверения, скриншот ролей в State</p>
                        ${details.comment ? `<p><strong>💬 Комментарий:</strong> ${details.comment}</p>` : ''}
                    ` : ''}
                    ${appeal.appeal_type === 'lawyer_promotion' ? `
                        <p><strong>📎 Вложения:</strong> 3 скриншота с вызовов</p>
                        ${details.exam_message_link ? `<p><strong>🔗 Ссылка на экзамен:</strong> <a href="${details.exam_message_link}" target="_blank" style="color: #ffd700;">Открыть</a></p>` : ''}
                        ${details.comment ? `<p><strong>💬 Комментарий:</strong> ${details.comment}</p>` : ''}
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-success btn-sm" onclick="window.Pages.Senior.showAppealModal(${appeal.id}, 'approve')">
                        ✅ Одобрить
                    </button>
                    <button class="btn-danger btn-sm" onclick="window.Pages.Senior.showAppealModal(${appeal.id}, 'reject')">
                        ❌ Отклонить
                    </button>
                </div>
            </div>
        `;
    },
    
    showAppealModal(appealId, action) {
        const appeal = this.appeals.find(a => a.id === appealId);
        if (!appeal) return;
        
        const existingModal = document.querySelector('.modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" style="cursor: pointer; float: right; font-size: 28px; font-weight: bold;">&times;</span>
                <h3 style="margin-top: 0;">${action === 'approve' ? '✅ Одобрение обращения' : '❌ Отклонение обращения'}</h3>
                
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(255,215,0,0.1); border-radius: 8px;">
                    <p><strong>Кандидат:</strong> ${appeal.character_name} (${appeal.static_id})</p>
                    <p><strong>Тип:</strong> ${appeal.appeal_type === 'oral_exam' ? 'Устный экзамен' : appeal.appeal_type === 'accreditation' ? 'Аккредитация юриста' : 'Повышение до адвоката'}</p>
                    ${appeal.discord_thread_name ? `<p><strong>📌 Discord ветка:</strong> ${appeal.discord_thread_name}</p>` : ''}
                    ${appeal.discord_thread_id ? `<p><strong>🆔 Thread ID из БД:</strong> <code style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px;">${appeal.discord_thread_id}</code></p>` : ''}
                </div>
                
                <div class="form-group">
                    <label for="discordThreadIdInput">
                        📝 Discord Thread ID:
                        <small style="color: #aaa; display: block; font-size: 0.8rem; margin-top: 0.25rem;">
                            Вставьте ID ветки форума (число) для отправки уведомления
                        </small>
                    </label>
                    <input 
                        type="text" 
                        id="discordThreadIdInput" 
                        placeholder="123456789012345678"
                        value="${appeal.discord_thread_id || ''}"
                        style="width: 100%; padding: 0.5rem; border-radius: 8px; background: rgba(0,0,0,0.3); color: white; font-family: monospace; font-size: 14px;"
                    />
                </div>
                
                <div class="form-group">
                    <label for="adminCommentInput">Комментарий:</label>
                    <textarea id="adminCommentInput" rows="3" placeholder="Введите комментарий..." style="width: 100%; padding: 0.5rem; border-radius: 8px; background: rgba(0,0,0,0.3); color: white; font-family: inherit;"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-primary" id="confirmBtn" style="flex: 1;">${action === 'approve' ? '✅ Одобрить' : '❌ Отклонить'}</button>
                    <button class="btn-secondary" id="cancelBtn" style="flex: 1;">Отмена</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const confirmBtn = modal.querySelector('#confirmBtn');
        const cancelBtn = modal.querySelector('#cancelBtn');
        const closeBtn = modal.querySelector('.close-btn');
        const discordThreadIdInput = modal.querySelector('#discordThreadIdInput');
        const adminCommentInput = modal.querySelector('#adminCommentInput');
        
        confirmBtn.onclick = async (e) => {
            e.preventDefault();
            
            const discordThreadId = discordThreadIdInput.value.trim();
            const adminComment = adminCommentInput.value;
            
            
            if (!discordThreadId) {
                Utils.showNotification('Предупреждение: Thread ID не указан, уведомление в Discord не будет отправлено', 'info');
            }
            
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Обработка...';
            
            await this.processAppeal(appealId, action, discordThreadId, adminComment);
            
            modal.remove();
        };
        
        cancelBtn.onclick = () => {
            modal.remove();
        };
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.remove();
            };
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    },
    
    async processAppeal(appealId, action, discordThreadId = null, adminComment = '') {
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Не найден токен авторизации');
            }
            
            const status = action === 'approve' ? 'approved' : 'rejected';
            
            
            Utils.showNotification('Обработка обращения...', 'info');
            
            const response = await window.API.updateAppealStatus(
                token, 
                appealId, 
                status, 
                adminComment, 
                null, 
                discordThreadId
            );
            
            
            if (response.notificationSent) {
                Utils.showNotification(`Обращение ${action === 'approve' ? 'одобрено' : 'отклонено'}! Уведомление отправлено в Discord`, 'success');
            } else {
                if (discordThreadId) {
                    Utils.showNotification(`Обращение ${action === 'approve' ? 'одобрено' : 'отклонено'}! Но уведомление в Discord не отправлено (ошибка)`, 'warning');
                } else {
                    Utils.showNotification(`Обращение ${action === 'approve' ? 'одобрено' : 'отклонено'}!`, 'success');
                }
            }
            
            await this.loadAppeals();
            
        } catch (error) {
            console.error('Error processing appeal:', error);
            Utils.showNotification('Ошибка обработки: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },
    
    renderExamResultTab() {
        return `
            <div class="senior-exam-result">
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,215,0,0.1); border-radius: 8px; border-left: 3px solid #ffd700;">
                    <h3 style="color: #ffd700; margin-bottom: 0.5rem;">📝 Ввод результатов экзамена</h3>
                    <p style="color: #aaa;">Здесь вы сможете вносить результаты проведения устных экзаменов у коллег</p>
                </div>
                
                <div style="padding: 2rem; background: rgba(255,255,255,0.03); border-radius: 12px;">
                    <div class="form-group">
                        <label for="searchUser">Поиск пользователя (Static ID или имя):</label>
                        <input type="text" id="searchUser" placeholder="Например: 202027 или Conte Grande" style="margin-bottom: 1rem; width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                        <button class="btn-primary" onclick="window.Pages.Senior.searchUser()">🔍 Найти</button>
                    </div>
                    
                    <div id="userSearchResult" style="margin-top: 2rem;"></div>
                    
                    <div id="examForm" style="display: none; margin-top: 2rem; padding: 1.5rem; background: rgba(255,215,0,0.05); border-radius: 12px;">
                        <h4 style="color: #ffd700; margin-bottom: 1rem;">Ввод результата экзамена</h4>
                        
                        <div class="form-group">
                            <label>Кандидат:</label>
                            <p id="candidateName" style="padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 8px;"></p>
                        </div>
                        
                        <div class="form-group">
                            <label for="examResult">Результат:</label>
                            <select id="examResult" class="form-control" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                                <option value="passed">✅ Сдал</option>
                                <option value="failed">❌ Не сдал</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="examComment">Комментарий:</label>
                            <textarea id="examComment" rows="3" placeholder="Введите комментарий к экзамену..." style="width: 100%; padding: 0.5rem; border-radius: 8px; background: rgba(0,0,0,0.3); color: white;"></textarea>
                        </div>
                        
                        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,100,100,0.1); border-radius: 8px; border-left: 3px solid #ff6464;">
                            <p style="color: #ffaa64; margin-bottom: 0; font-size: 0.85rem;">
                                ⚠️ <strong>Внимание:</strong> При сдаче экзамена уровень пользователя НЕ повышается автоматически. 
                                Повышение уровня осуществляется отдельно через другие процедуры.
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button class="btn-success" onclick="window.Pages.Senior.submitExamResult()">
                                ✅ Сохранить результат
                            </button>
                            <button class="btn-secondary" onclick="window.Pages.Senior.resetExamForm()">
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    async searchUser() {
        const searchInput = document.getElementById('searchUser');
        const searchTerm = searchInput?.value.trim();
        
        if (!searchTerm) {
            Utils.showNotification('Введите Static ID или имя для поиска', 'error');
            return;
        }
        
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Не найден токен авторизации');
            }
            
            Utils.showNotification('Поиск пользователя...', 'info');
            
            const users = await window.API.getUsers(token);
            
            const foundUser = users.find(user => 
                user.static_id === searchTerm || 
                user.character_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            const resultContainer = document.getElementById('userSearchResult');
            
            if (!foundUser) {
                resultContainer.innerHTML = `
                    <div style="padding: 1rem; background: rgba(255,100,100,0.1); border-radius: 8px; color: #ff6464;">
                        ❌ Пользователь не найден
                    </div>
                `;
                document.getElementById('examForm').style.display = 'none';
                return;
            }
            
            resultContainer.innerHTML = `
                <div style="padding: 1rem; background: rgba(255,215,0,0.1); border-radius: 8px;">
                    <p><strong>✅ Пользователь найден:</strong></p>
                    <p>Имя: ${foundUser.character_name}</p>
                    <p>Static ID: ${foundUser.static_id}</p>
                    <p>Текущий уровень: ${foundUser.role_level}</p>
                    ${foundUser.discord_id ? `<p>Discord ID: <code>${foundUser.discord_id}</code></p>` : '<p style="color: #ff6464;">Discord не привязан!</p>'}
                </div>
            `;
            
            const examForm = document.getElementById('examForm');
            examForm.style.display = 'block';
            
            examForm.dataset.userId = foundUser.id;
            examForm.dataset.userName = foundUser.character_name;
            examForm.dataset.userStaticId = foundUser.static_id;
            examForm.dataset.userDiscordId = foundUser.discord_id || '';
            examForm.dataset.currentRole = foundUser.role_level;
            
            document.getElementById('candidateName').innerHTML = `
                ${foundUser.character_name} (${foundUser.static_id}) - Уровень ${foundUser.role_level}
            `;
            
        } catch (error) {
            console.error('Error searching user:', error);
            Utils.showNotification('Ошибка поиска: ' + error.message, 'error');
        }
    },
    
    async submitExamResult() {
    const examForm = document.getElementById('examForm');
    const userId = examForm?.dataset.userId;
    const userName = examForm?.dataset.userName;
    const userStaticId = examForm?.dataset.userStaticId;
    const userDiscordId = examForm?.dataset.userDiscordId;
    const examResult = document.getElementById('examResult')?.value;
    const examComment = document.getElementById('examComment')?.value;
    
    if (!userId) {
        Utils.showNotification('Пользователь не выбран', 'error');
        return;
    }
    
    // Валидация обязательных полей
    if (!userName || !userStaticId) {
        Utils.showNotification('Ошибка: данные пользователя неполные', 'error');
        console.error('Missing user data:', { userName, userStaticId, userDiscordId });
        return;
    }
    
    try {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            throw new Error('Не найден токен авторизации');
        }
        
        const currentUser = window.Auth.currentUser;
        if (!currentUser || !currentUser.character_name) {
            throw new Error('Данные текущего пользователя не найдены');
        }
        
        const examinerName = currentUser.character_name;
        const examinerDiscordId = currentUser.discord_id || '';
        
        Utils.showNotification('Сохранение результата...', 'info');
        
        let resultText = examResult === 'passed' ? '✅ СДАЛ!' : '❌ НЕ СДАЛ';
        
        // Формируем данные для отправки
        const notificationData = {
            candidateName: userName,
            candidateStaticId: userStaticId,
            candidateDiscordId: userDiscordId || '',
            examinerName: examinerName,
            examinerDiscordId: examinerDiscordId,
            result: examResult,
            resultText: resultText,
            comment: examComment || ''
        };
        
        
        // Проверяем, что все обязательные поля заполнены
        const requiredFields = ['candidateName', 'candidateStaticId', 'examinerName', 'result', 'resultText'];
        const missingFields = requiredFields.filter(field => !notificationData[field]);
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
        }
        
        // Показываем уведомление о результате без повышения
        if (examResult === 'passed') {
            Utils.showNotification('✅ Результат экзамена: СДАЛ (уровень не изменен)', 'success');
        } else {
            Utils.showNotification('❌ Результат экзамена: НЕ СДАЛ', 'info');
        }
        
        // Отправляем уведомление в Discord
        await this.sendExamResultNotification(notificationData);
        
        Utils.showNotification('Результат экзамена сохранен! Уведомление отправлено в Discord', 'success');
        
        this.resetExamForm();
        const searchInput = document.getElementById('searchUser');
        if (searchInput) searchInput.value = '';
        const resultContainer = document.getElementById('userSearchResult');
        if (resultContainer) resultContainer.innerHTML = '';
        
    } catch (error) {
        console.error('Error submitting exam result:', error);
        Utils.showNotification('Ошибка сохранения: ' + error.message, 'error');
    }
},
    
    async sendExamResultNotification(data) {
    try {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            throw new Error('Не найден токен авторизации');
        }
        
        
        const response = await fetch('https://rfjmdevsnvirrxonhsny.supabase.co/functions/v1/send-exam-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            let errorMessage = 'Ошибка отправки уведомления';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const result = JSON.parse(responseText);
        return result;
        
    } catch (error) {
        console.error('Error sending exam result notification:', error);
        throw error;
    }
},
    
    resetExamForm() {
        const examForm = document.getElementById('examForm');
        if (examForm) {
            examForm.style.display = 'none';
            examForm.dataset.userId = '';
            examForm.dataset.userName = '';
            examForm.dataset.userStaticId = '';
            examForm.dataset.userDiscordId = '';
            examForm.dataset.currentRole = '';
        }
        
        const examComment = document.getElementById('examComment');
        if (examComment) examComment.value = '';
        
        const examResult = document.getElementById('examResult');
        if (examResult) examResult.value = 'passed';
    }
};