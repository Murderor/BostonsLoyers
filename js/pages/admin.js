// js/pages/admin.js

window.Pages = window.Pages || {};

window.Pages.Admin = {
    usersCache: null,
    isLoading: false,
    currentSort: { column: 'id', direction: 'asc' },
    searchTerm: '',
    filteredUsers: null,
    
    async render() {
        
        // Проверка авторизации
        if (!window.Auth || !window.Auth.currentUser || !window.Auth.currentUser.id) {
            Utils.showNotification('Необходимо войти в систему', 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        // Получаем уровень пользователя и приводим к числу
        const userRoleLevel = Number(window.Auth.currentUser.role_level);
        
        // Уровни 5 и выше имеют доступ к админ-панели
        if (isNaN(userRoleLevel) || userRoleLevel < 5) {
            Utils.showNotification(`Доступ запрещен. Ваш уровень: ${userRoleLevel || 'не определен'}. Требуется уровень 5+`, 'error');
            window.Router.navigateTo('home');
            return;
        }
        
        const container = document.getElementById('page-content');
        if (!container) {
            console.error('Page content container not found');
            return;
        }
        
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
            
            // Нормализуем данные пользователей
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
            this.filteredUsers = [...users];
            this.currentSort = { column: 'id', direction: 'asc' };
            this.searchTerm = '';
            
            this.renderFullPage(container);
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.renderError(container, error.message);
        }
    },
    
    // Отрисовка всей страницы (только при первом рендере)
    renderFullPage(container) {
        const currentUserRole = Number(window.Auth.currentUser.role_level);
        
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        };
        
        container.innerHTML = `
            <div class="card">
                <h2>⚙️ Управление пользователями</h2>
                <p>Всего пользователей: ${escapeHtml(String(this.usersCache.length))}</p>
                <p>Ваш уровень доступа: ${currentUserRole} (${Utils.getRoleName(currentUserRole)})</p>
                
                <!-- Панель поиска и фильтров -->
                <div style="margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 200px;">
                        <input 
                            type="text" 
                            id="user-search-input" 
                            placeholder="🔍 Поиск по имени, Static ID, роли, ID..." 
                            value="${escapeHtml(this.searchTerm)}"
                            style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #2a2a2a; color: white;"
                        >
                    </div>
                    <button id="reset-filters-btn" style="padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        🗑️ Сбросить фильтры
                    </button>
                    <div style="font-size: 14px; color: #888;" id="users-count-display">
                        Найдено: ${this.filteredUsers.length} пользователей
                    </div>
                </div>
                
                <div style="overflow-x: auto; margin-top: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                                <th style="text-align: left; padding: 12px; cursor: pointer;" data-sort="id" id="sort-id">
                                    ID <span id="sort-icon-id">↕️</span>
                                </th>
                                <th style="text-align: left; padding: 12px; cursor: pointer;" data-sort="name" id="sort-name">
                                    Имя персонажа <span id="sort-icon-name">↕️</span>
                                </th>
                                <th style="text-align: left; padding: 12px; cursor: pointer;" data-sort="static_id" id="sort-static_id">
                                    Static ID <span id="sort-icon-static_id">↕️</span>
                                </th>
                                <th style="text-align: left; padding: 12px; cursor: pointer;" data-sort="discord" id="sort-discord">
                                    Discord <span id="sort-icon-discord">↕️</span>
                                </th>
                                <th style="text-align: left; padding: 12px; cursor: pointer;" data-sort="role" id="sort-role">
                                    Роль <span id="sort-icon-role">↕️</span>
                                </th>
                                <th style="text-align: left; padding: 12px;">Действия</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body"></tbody>
                    8vao
                </div>
            </div>
        `;
        
        // Обновляем иконки сортировки
        this.updateSortIcons();
        
        // Добавляем обработчики сортировки
        document.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                this.setSortColumn(column);
            });
        });
        
        // Добавляем обработчик поиска
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterUsers();
                this.updateTableBody(); // Только обновляем тело таблицы, не перерисовывая всю страницу
            });
        }
        
        // Добавляем обработчик сброса
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.searchTerm = '';
                this.currentSort = { column: 'id', direction: 'asc' };
                this.filteredUsers = [...this.usersCache];
                this.sortUsers();
                
                const searchInput = document.getElementById('user-search-input');
                if (searchInput) searchInput.value = '';
                
                this.updateSortIcons();
                this.updateTableBody();
                this.updateUsersCount();
            });
        }
        
        // ВАЖНО: Отрисовываем тело таблицы после того, как все обработчики привязаны
        this.updateTableBody();
    },
    
    // Обновление только тела таблицы (без перерисовки всей страницы)
    updateTableBody() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) {
            console.warn('Table body not found');
            return;
        }
        
        const currentUserRole = Number(window.Auth.currentUser.role_level);
        const currentUserId = parseInt(window.Auth.currentUser.id);
        
        // Очищаем тело таблицы
        tbody.innerHTML = '';
        
        if (!this.filteredUsers || this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
                        🔍 Ничего не найдено. Попробуйте изменить поисковый запрос.
                    </td>
                </tr>
            `;
            this.updateUsersCount();
            return;
        }
        
        this.filteredUsers.forEach(user => {
            const row = this.createUserRow(user, currentUserRole, currentUserId);
            tbody.appendChild(row);
        });
        
        this.attachEventHandlers();
        this.updateUsersCount();
    },
    
    // Обновление счетчика пользователей
    updateUsersCount() {
        const countDisplay = document.getElementById('users-count-display');
        if (countDisplay) {
            countDisplay.textContent = `Найдено: ${this.filteredUsers ? this.filteredUsers.length : 0} пользователей`;
        }
    },
    
    // Обновление иконок сортировки
    updateSortIcons() {
        const columns = ['id', 'name', 'static_id', 'discord', 'role'];
        columns.forEach(col => {
            const iconSpan = document.getElementById(`sort-icon-${col}`);
            if (iconSpan) {
                if (this.currentSort.column !== col) {
                    iconSpan.textContent = '↕️';
                } else {
                    iconSpan.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
                }
            }
        });
    },
    
    // Фильтрация пользователей
    filterUsers() {
        if (!this.searchTerm.trim()) {
            this.filteredUsers = [...this.usersCache];
        } else {
            const searchLower = this.searchTerm.toLowerCase();
            this.filteredUsers = this.usersCache.filter(user => {
                return user.character_name?.toLowerCase().includes(searchLower) ||
                       user.static_id?.toLowerCase().includes(searchLower) ||
                       user.id?.toString().includes(searchLower) ||
                       Utils.getRoleName(user.role_level).toLowerCase().includes(searchLower) ||
                       (user.discord_id ? 'привязан' : 'не привязан').includes(searchLower);
            });
        }
        this.sortUsers();
    },
    
    // Сортировка пользователей
    sortUsers() {
        const { column, direction } = this.currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;
        
        if (!this.filteredUsers) return;
        
        this.filteredUsers.sort((a, b) => {
            let valA, valB;
            
            switch(column) {
                case 'id':
                    valA = a.id;
                    valB = b.id;
                    break;
                case 'name':
                    valA = (a.character_name || '').toLowerCase();
                    valB = (b.character_name || '').toLowerCase();
                    break;
                case 'static_id':
                    valA = (a.static_id || '').toLowerCase();
                    valB = (b.static_id || '').toLowerCase();
                    break;
                case 'discord':
                    valA = a.discord_id ? 1 : 0;
                    valB = b.discord_id ? 1 : 0;
                    break;
                case 'role':
                    valA = a.role_level;
                    valB = b.role_level;
                    break;
                default:
                    valA = a.id;
                    valB = b.id;
            }
            
            if (valA < valB) return -1 * multiplier;
            if (valA > valB) return 1 * multiplier;
            return 0;
        });
    },
    
    // Изменение сортировки
    setSortColumn(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        
        this.sortUsers();
        this.updateSortIcons();
        this.updateTableBody(); // Только обновляем тело таблицы
    },
    
    createUserRow(user, currentUserRole, currentUserId) {
        const canEdit = currentUserRole === 8 || 
                       (currentUserRole >= 5 && user.role_level < currentUserRole);
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-user-id', user.id);
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        // ID
        const tdId = document.createElement('td');
        tdId.style.padding = '12px';
        tdId.textContent = user.id;
        tr.appendChild(tdId);
        
        // Имя персонажа
        const tdName = document.createElement('td');
        tdName.style.padding = '12px';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'user-name-input';
        nameInput.setAttribute('data-user-id', user.id);
        nameInput.value = user.character_name || '';
        nameInput.style.width = '150px';
        nameInput.style.padding = '6px';
        nameInput.style.borderRadius = '4px';
        nameInput.style.border = '1px solid #ccc';
        nameInput.style.background = canEdit ? '#fff' : '#f0f0f0';
        nameInput.style.color = canEdit ? '#000' : '#666';
        if (!canEdit) nameInput.disabled = true;
        tdName.appendChild(nameInput);
        tr.appendChild(tdName);
        
        // Static ID
        const tdStaticId = document.createElement('td');
        tdStaticId.style.padding = '12px';
        tdStaticId.textContent = user.static_id || '-';
        tr.appendChild(tdStaticId);
        
        // Discord
        const tdDiscord = document.createElement('td');
        tdDiscord.style.padding = '12px';
        const discordSpan = document.createElement('span');
        discordSpan.style.color = user.discord_id ? '#5865F2' : '#999';
        discordSpan.textContent = user.discord_id ? '✓ Привязан' : 'Не привязан';
        tdDiscord.appendChild(discordSpan);
        tr.appendChild(tdDiscord);
        
        // Роль (select)
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
        
        // Действия
        const tdActions = document.createElement('td');
        tdActions.style.padding = '12px';
        
        if (canEdit) {
            const saveRoleBtn = document.createElement('button');
            saveRoleBtn.textContent = '💾 Роль';
            saveRoleBtn.className = 'save-role-btn';
            saveRoleBtn.setAttribute('data-user-id', user.id);
            saveRoleBtn.style.marginRight = '8px';
            saveRoleBtn.style.padding = '6px 12px';
            saveRoleBtn.style.backgroundColor = '#4CAF50';
            saveRoleBtn.style.color = 'white';
            saveRoleBtn.style.border = 'none';
            saveRoleBtn.style.borderRadius = '4px';
            saveRoleBtn.style.cursor = 'pointer';
            
            const saveNameBtn = document.createElement('button');
            saveNameBtn.textContent = '💾 Имя';
            saveNameBtn.className = 'save-name-btn';
            saveNameBtn.setAttribute('data-user-id', user.id);
            saveNameBtn.style.padding = '6px 12px';
            saveNameBtn.style.backgroundColor = '#2196F3';
            saveNameBtn.style.color = 'white';
            saveNameBtn.style.border = 'none';
            saveNameBtn.style.borderRadius = '4px';
            saveNameBtn.style.cursor = 'pointer';
            
            tdActions.appendChild(saveRoleBtn);
            tdActions.appendChild(saveNameBtn);
        } else {
            const noAccessSpan = document.createElement('span');
            noAccessSpan.style.color = '#999';
            noAccessSpan.textContent = '⛔ Нет прав';
            tdActions.appendChild(noAccessSpan);
        }
        
        tr.appendChild(tdActions);
        
        // Сохраняем ссылки на элементы для быстрого доступа
        tr.userData = {
            id: user.id,
            nameInput,
            roleSelect,
            originalName: user.character_name || '',
            originalRole: user.role_level
        };
        
        return tr;
    },
    
    attachEventHandlers() {
        // Обработчики для сохранения роли
        document.querySelectorAll('.save-role-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleRoleSave);
            btn.addEventListener('click', this.handleRoleSave.bind(this));
        });
        
        // Обработчики для сохранения имени
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
        const currentUserRole = Number(window.Auth.currentUser.role_level);
        
        if (isNaN(newRole) || newRole < 1 || newRole > 8) {
            Utils.showNotification('Недопустимое значение роли', 'error');
            roleSelect.value = tr.userData.originalRole;
            return;
        }
        
        if (currentUserRole < 8 && newRole >= currentUserRole) {
            Utils.showNotification(`Вы не можете назначить роль ${Utils.getRoleName(newRole)} (${newRole}), так как ваша роль ${Utils.getRoleName(currentUserRole)} (${currentUserRole})`, 'error');
            roleSelect.value = tr.userData.originalRole;
            return;
        }
        
        if (userId === parseInt(window.Auth.currentUser.id) && newRole < currentUserRole) {
            const confirmed = confirm(`⚠️ ВНИМАНИЕ!\n\nВы понижаете свою роль с ${Utils.getRoleName(currentUserRole)} (${currentUserRole}) до ${Utils.getRoleName(newRole)} (${newRole}).\n\nВы можете потерять доступ к админ-панели. Продолжить?`);
            if (!confirmed) {
                roleSelect.value = tr.userData.originalRole;
                return;
            }
        }
        
        try {
            Utils.showNotification('Сохранение роли...', 'info');
            btn.disabled = true;
            btn.textContent = '⏳ Сохранение...';
            
            await API.updateUserRole(window.Auth.token, userId, newRole);
            
            Utils.showNotification(`Роль пользователя изменена на ${Utils.getRoleName(newRole)}!`, 'success');
            
            if (this.usersCache) {
                const userIndex = this.usersCache.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.usersCache[userIndex].role_level = newRole;
                }
                const filteredIndex = this.filteredUsers.findIndex(u => u.id === userId);
                if (filteredIndex !== -1) {
                    this.filteredUsers[filteredIndex].role_level = newRole;
                }
            }
            
            tr.userData.originalRole = newRole;
            
            if (userId === parseInt(window.Auth.currentUser.id)) {
                await window.Auth.refreshUserData();
                Utils.showNotification('Ваша роль обновлена! Страница будет перезагружена.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
            
        } catch (error) {
            console.error('Error saving role:', error);
            Utils.showNotification('Ошибка: ' + (error.message || 'Не удалось обновить роль'), 'error');
            roleSelect.value = tr.userData.originalRole;
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Роль';
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
        
        if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s\-']+$/.test(newName)) {
            Utils.showNotification('Имя содержит недопустимые символы (только буквы, цифры, пробелы, дефис, апостроф)', 'error');
            nameInput.value = oldName;
            return;
        }
        
        if (newName === oldName) {
            Utils.showNotification('Имя не изменено', 'info');
            return;
        }
        
        try {
            Utils.showNotification('Сохранение имени...', 'info');
            btn.disabled = true;
            btn.textContent = '⏳ Сохранение...';
            
            await API.updateUserName(window.Auth.token, userId, newName);
            
            Utils.showNotification('Имя пользователя обновлено!', 'success');
            
            if (this.usersCache) {
                const userIndex = this.usersCache.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.usersCache[userIndex].character_name = newName;
                }
                const filteredIndex = this.filteredUsers.findIndex(u => u.id === userId);
                if (filteredIndex !== -1) {
                    this.filteredUsers[filteredIndex].character_name = newName;
                }
            }
            
            tr.userData.originalName = newName;
            
            if (userId === parseInt(window.Auth.currentUser.id)) {
                await window.Auth.refreshUserData();
                Utils.showNotification('Ваше имя обновлено!', 'success');
                
                const userNameSpan = document.querySelector('.user-name');
                if (userNameSpan) {
                    userNameSpan.textContent = newName;
                }
            }
            
        } catch (error) {
            console.error('Error saving name:', error);
            Utils.showNotification('Ошибка: ' + (error.message || 'Не удалось обновить имя'), 'error');
            nameInput.value = oldName;
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Имя';
        }
    },
    
    renderError(container, errorMessage) {
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        };
        
        const safeErrorMessage = escapeHtml(errorMessage);
        
        container.innerHTML = `
            <div class="card">
                <h2>❌ Ошибка загрузки</h2>
                <p style="color: #ff6464;">${safeErrorMessage}</p>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="window.Router.navigateTo('home')" class="btn-primary">🏠 Вернуться на главную</button>
                    <button onclick="window.Pages.Admin.render()" class="btn-secondary">🔄 Попробовать снова</button>
                </div>
            </div>
        `;
    },
    
    clearCache() {
        this.usersCache = null;
        this.filteredUsers = null;
        this.isLoading = false;
        this.searchTerm = '';
        this.currentSort = { column: 'id', direction: 'asc' };
    }
};