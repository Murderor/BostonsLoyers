// ========================
// Безопасные HTML-функции
// ========================
window.SafeHtml = {
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
    
    escapeJsString(str) {
        if (!str) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/</g, '\\x3C')
            .replace(/>/g, '\\x3E');
    },
    
    isValidCharacterName(name) {
        if (!name || typeof name !== 'string') return false;
        if (name.length > 50) return false;
        return /^[a-zA-Zа-яА-ЯёЁ0-9\s\-']+$/u.test(name);
    },
    
    isValidRoleLevel(level) {
        const num = parseInt(level);
        return !isNaN(num) && num >= 1 && num <= 8;
    },
    
    sanitizeInput(obj, maxDepth = 3) {
        if (maxDepth < 0) return null;
        
        if (typeof obj === 'string') {
            return this.escapeHtml(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeInput(item, maxDepth - 1));
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const safeKey = this.escapeHtml(key);
                    sanitized[safeKey] = this.sanitizeInput(obj[key], maxDepth - 1);
                }
            }
            return sanitized;
        }
        return obj;
    }
};

// ========================
// Компонент админ-панели
// ========================
window.Pages = window.Pages || {};

window.Pages.Admin = {
    usersCache: null,
    isLoading: false,
    
    async render() {
        if (!window.Auth || !window.Auth.currentUser || !window.Auth.currentUser.id) {
            Utils.showNotification('Необходимо войти в систему', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        if (window.Auth.currentUser.role_level < 6) {
            Utils.showNotification('Доступ запрещен. Требуются права администратора.', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        const container = document.getElementById('page-content');
        if (!container) return;
        
        container.innerHTML = `<div class="loader">Загрузка пользователей...</div>`;
        
        try {
            if (!window.Auth.token) {
                throw new Error('Токен не найден. Пожалуйста, войдите заново.');
            }
            
            const result = await API.getUsers(window.Auth.token);
            
            let users = null;
            if (result && result.users) {
                users = result.users;
            } else if (Array.isArray(result)) {
                users = result;
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
            
            if (!users || !Array.isArray(users)) {
                throw new Error('Список пользователей не получен');
            }
            
            users = users.map(user => ({
                ...user,
                id: Number(user.id),
                character_name: user.character_name || '',
                static_id: user.static_id || '',
                discord_id: user.discord_id || null,
                role_level: Number(user.role_level) || 1,
                auth_id: user.auth_id || ''
            }));
            
            this.usersCache = users;
            
            this.renderUsersTable(container, users);
            
        } catch (error) {
            this.renderError(container, error.message);
        }
    },
    
    renderUsersTable(container, users) {
        const currentUserRole = window.Auth.currentUser.role_level;
        const currentUserId = parseInt(window.Auth.currentUser.id);
        
        container.innerHTML = `
            <div class="card">
                <h2>Управление пользователями</h2>
                <p>Всего пользователей: ${window.SafeHtml.escapeHtml(String(users.length))}</p>
                <div style="overflow-x: auto; margin-top: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 12px;">ID</th>
                                <th style="text-align: left; padding: 12px;">Имя персонажа</th>
                                <th style="text-align: left; padding: 12px;">Static ID</th>
                                <th style="text-align: left; padding: 12px;">Discord</th>
                                <th style="text-align: left; padding: 12px;">Роль</th>
                                <th style="text-align: left; padding: 12px;">Действия</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body"></tbody>
                    </table>
                </div>
            </div>
        `;
        
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        users.forEach(user => {
            const row = this.createUserRow(user, currentUserRole, currentUserId);
            tbody.appendChild(row);
        });
        
        this.attachEventHandlers();
    },
    
    createUserRow(user, currentUserRole, currentUserId) {
        const canEdit = currentUserRole === 8 || 
                       (currentUserRole >= 6 && user.role_level < currentUserRole);
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-user-id', user.id);
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const tdId = document.createElement('td');
        tdId.style.padding = '12px';
        tdId.textContent = user.id;
        tr.appendChild(tdId);
        
        const tdName = document.createElement('td');
        tdName.style.padding = '12px';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'user-name-input';
        nameInput.setAttribute('data-user-id', user.id);
        nameInput.value = user.character_name;
        nameInput.style.width = '150px';
        nameInput.style.padding = '6px';
        nameInput.style.borderRadius = '4px';
        nameInput.style.border = '1px solid #ddd';
        nameInput.style.background = canEdit ? '#fff' : '#f0f0f0';
        if (!canEdit) nameInput.disabled = true;
        tdName.appendChild(nameInput);
        tr.appendChild(tdName);
        
        const tdStaticId = document.createElement('td');
        tdStaticId.style.padding = '12px';
        tdStaticId.textContent = user.static_id;
        tr.appendChild(tdStaticId);
        
        const tdDiscord = document.createElement('td');
        tdDiscord.style.padding = '12px';
        const discordSpan = document.createElement('span');
        discordSpan.style.color = user.discord_id ? '#5865F2' : '#999';
        discordSpan.textContent = user.discord_id ? '✓ Привязан' : 'Не привязан';
        tdDiscord.appendChild(discordSpan);
        tr.appendChild(tdDiscord);
        
        const tdRole = document.createElement('td');
        tdRole.style.padding = '12px';
        const roleSelect = document.createElement('select');
        roleSelect.className = 'role-select';
        roleSelect.setAttribute('data-user-id', user.id);
        roleSelect.style.padding = '6px';
        roleSelect.style.borderRadius = '4px';
        if (!canEdit) roleSelect.disabled = true;
        
        const roles = [1, 2, 3, 4, 5, 6, 7, 8];
        roles.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = Utils.getRoleName(level);
            if (user.role_level === level) option.selected = true;
            roleSelect.appendChild(option);
        });
        
        tdRole.appendChild(roleSelect);
        tr.appendChild(tdRole);
        
        const tdActions = document.createElement('td');
        tdActions.style.padding = '12px';
        
        if (canEdit) {
            const saveRoleBtn = document.createElement('button');
            saveRoleBtn.textContent = 'Сохранить роль';
            saveRoleBtn.className = 'save-role-btn btn btn-sm';
            saveRoleBtn.setAttribute('data-user-id', user.id);
            saveRoleBtn.style.marginRight = '8px';
            saveRoleBtn.style.padding = '6px 12px';
            
            const saveNameBtn = document.createElement('button');
            saveNameBtn.textContent = 'Сохранить имя';
            saveNameBtn.className = 'save-name-btn btn btn-sm';
            saveNameBtn.setAttribute('data-user-id', user.id);
            saveNameBtn.style.padding = '6px 12px';
            
            tdActions.appendChild(saveRoleBtn);
            tdActions.appendChild(saveNameBtn);
        } else {
            const noAccessSpan = document.createElement('span');
            noAccessSpan.style.color = '#999';
            noAccessSpan.textContent = 'Нет прав';
            tdActions.appendChild(noAccessSpan);
        }
        
        tr.appendChild(tdActions);
        
        tr.userData = {
            id: user.id,
            nameInput,
            roleSelect,
            saveRoleBtn: tdActions.querySelector('.save-role-btn'),
            saveNameBtn: tdActions.querySelector('.save-name-btn'),
            originalName: user.character_name,
            originalRole: user.role_level
        };
        
        return tr;
    },
    
    attachEventHandlers() {
        document.querySelectorAll('.save-role-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleRoleSave);
            btn.addEventListener('click', this.handleRoleSave.bind(this));
        });
        
        document.querySelectorAll('.save-name-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleNameSave);
            btn.addEventListener('click', this.handleNameSave.bind(this));
        });
    },
    
    async handleRoleSave(event) {
        const btn = event.currentTarget;
        const userId = parseInt(btn.getAttribute('data-user-id'));
        const tr = btn.closest('tr');
        
        if (!tr || !tr.userData) return;
        
        const roleSelect = tr.userData.roleSelect;
        const newRole = parseInt(roleSelect.value);
        
        if (!window.SafeHtml.isValidRoleLevel(newRole)) {
            Utils.showNotification('Недопустимое значение роли', 'error');
            roleSelect.value = tr.userData.originalRole;
            return;
        }
        
        if (window.Auth.currentUser.role_level < 8 && newRole >= window.Auth.currentUser.role_level) {
            Utils.showNotification('Вы не можете назначить роль выше или равную своей', 'error');
            roleSelect.value = tr.userData.originalRole;
            return;
        }
        
        if (userId === parseInt(window.Auth.currentUser.id) && newRole < window.Auth.currentUser.role_level) {
            if (!confirm('Вы понижаете свою роль. Вы можете потерять доступ к админ-панели. Продолжить?')) {
                roleSelect.value = tr.userData.originalRole;
                return;
            }
        }
        
        try {
            Utils.showNotification('Сохранение...', 'info');
            await API.updateUserRole(window.Auth.token, userId, newRole);
            Utils.showNotification('Роль обновлена успешно!', 'success');
            
            if (this.usersCache) {
                const userIndex = this.usersCache.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.usersCache[userIndex].role_level = newRole;
                }
            }
            
            tr.userData.originalRole = newRole;
            
            if (window.Auth.currentUser.id == userId) {
                await window.Auth.refreshUserData();
                Utils.showNotification('Ваша роль обновлена! Страница будет перезагружена.', 'success');
                setTimeout(() => window.Router.navigateTo('admin'), 1500);
            }
            
        } catch (error) {
            Utils.showNotification('Ошибка: ' + (error.message || 'Не удалось обновить роль'), 'error');
            roleSelect.value = tr.userData.originalRole;
        }
    },
    
    async handleNameSave(event) {
        const btn = event.currentTarget;
        const userId = parseInt(btn.getAttribute('data-user-id'));
        const tr = btn.closest('tr');
        
        if (!tr || !tr.userData) return;
        
        const nameInput = tr.userData.nameInput;
        const newName = nameInput.value.trim();
        const oldName = tr.userData.originalName;
        
        if (!newName) {
            Utils.showNotification('Имя не может быть пустым', 'error');
            nameInput.value = oldName;
            return;
        }
        
        if (!window.SafeHtml.isValidCharacterName(newName)) {
            Utils.showNotification('Имя содержит недопустимые символы (только буквы, цифры, пробелы, дефис, апостроф)', 'error');
            nameInput.value = oldName;
            return;
        }
        
        if (newName === oldName) {
            Utils.showNotification('Имя не изменено', 'info');
            return;
        }
        
        try {
            Utils.showNotification('Сохранение...', 'info');
            await API.updateUserName(window.Auth.token, userId, newName);
            Utils.showNotification('Имя обновлено успешно!', 'success');
            
            if (this.usersCache) {
                const userIndex = this.usersCache.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.usersCache[userIndex].character_name = newName;
                }
            }
            
            tr.userData.originalName = newName;
            
            if (window.Auth.currentUser.id == userId) {
                await window.Auth.refreshUserData();
                Utils.showNotification('Ваше имя обновлено!', 'success');
            }
            
        } catch (error) {
            Utils.showNotification('Ошибка: ' + (error.message || 'Не удалось обновить имя'), 'error');
            nameInput.value = oldName;
        }
    },
    
    renderError(container, errorMessage) {
        const safeErrorMessage = window.SafeHtml.escapeHtml(errorMessage);
        
        container.innerHTML = `
            <div class="card">
                <h2>Ошибка загрузки</h2>
                <p>${safeErrorMessage}</p>
                <button onclick="window.Router.navigateTo('home')" class="btn btn-primary">Вернуться на главную</button>
                <button onclick="window.Pages.Admin.render()" class="btn btn-secondary">Попробовать снова</button>
            </div>
        `;
    },
    
    clearCache() {
        this.usersCache = null;
        this.isLoading = false;
    }
};