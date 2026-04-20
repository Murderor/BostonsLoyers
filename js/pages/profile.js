// js/pages/profile.js
window.Pages.Profile = {
    async render() {
        const container = document.getElementById('page-content');
        
        // Получаем актуальные данные пользователя
        let user = Auth.currentUser;
        
        // Если нет пользователя или нет ID, пробуем получить заново
        if (!user || !user.id) {
            try {
                await Auth.refreshUserData();
                user = Auth.currentUser;
            } catch (error) {
                console.error('Failed to refresh user data:', error);
                container.innerHTML = '<div class="card"><p>Ошибка: не удалось загрузить данные пользователя. Пожалуйста, <a href="#" onclick="Auth.logout(); return false;">войдите заново</a>.</p></div>';
                return;
            }
        }
        
        if (!user || !user.id) {
            container.innerHTML = '<div class="card"><p>Ошибка: пользователь не авторизован</p></div>';
            return;
        }
        
        const avatarUrl = user.avatar_url || '';
        const hasAvatar = !!avatarUrl;
        
        container.innerHTML = `
            <div class="card">
                <h2>Мой профиль</h2>
                
                <!-- Avatar Section -->
                <div class="avatar-section">
                    <h3>Аватар</h3>
                    <div class="avatar-container">
                        <div class="avatar-preview">
                            ${hasAvatar ? 
                                `<img src="${Utils.escapeHtml(avatarUrl)}" alt="Avatar" id="avatar-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'1\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\'%3E%3C/path%3E%3Ccircle cx=\'12\' cy=\'7\' r=\'4\'%3E%3C/circle%3E%3C/svg%3E'">` : 
                                `<div class="avatar-placeholder">
                                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>`
                            }
                        </div>
                        <div class="avatar-controls">
                            <div class="form-group">
                                <label>URL аватара (ссылка на изображение)</label>
                                <input type="url" id="avatar-url" placeholder="https://i.imgur.com/example.jpg" value="${Utils.escapeHtml(avatarUrl)}">
                                <small>Поддерживаются HTTPS ссылки с imgur, discordapp, postimg, и других популярных хостингов</small>
                            </div>
                            <div class="avatar-buttons">
                                <button type="button" id="save-avatar-btn" class="btn-secondary">Сохранить аватар</button>
                                ${hasAvatar ? '<button type="button" id="delete-avatar-btn" class="btn-danger">Удалить аватар</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <hr style="margin: 30px 0;">
                
                <form id="profile-form">
                    <div class="form-group">
                        <label>Имя персонажа</label>
                        <input type="text" id="profile-name" value="${Utils.escapeHtml(user.character_name || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Static ID</label>
                        <input type="text" id="profile-id" value="${Utils.escapeHtml(user.static_id || '')}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label>Уровень доступа</label>
                        <input type="text" value="${Utils.getRoleName(user.role_level || 1)}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label>Новый пароль (оставьте пустым, если не хотите менять)</label>
                        <input type="password" id="profile-password" placeholder="Новый пароль" autocomplete="new-password">
                    </div>
                    <button type="submit">Сохранить изменения</button>
                </form>
                
                <hr style="margin: 30px 0;">
                
                <div class="discord-section">
                    <h3>Привязка Discord</h3>
                    <div id="discord-status" class="discord-status">
                        ${user.discord_id ? `
                            <div class="discord-linked">
                                <span class="discord-icon">✅</span>
                                <span>Discord аккаунт привязан</span>
                                <span class="discord-id">ID: ${Utils.escapeHtml(user.discord_id)}</span>
                            </div>
                        ` : `
                            <div class="discord-not-linked">
                                <span class="discord-icon">❌</span>
                                <span>Discord не привязан</span>
                                <small>Привяжите Discord для получения уведомлений и дополнительных возможностей</small>
                            </div>
                        `}
                    </div>
                    <button id="discord-action-btn" class="btn-discord ${user.discord_id ? 'btn-danger' : 'btn-primary'}">
                        ${user.discord_id ? 'Отвязать Discord' : 'Привязать Discord'}
                    </button>
                </div>
            </div>
        `;
        
        // Handle avatar save
        const saveAvatarBtn = document.getElementById('save-avatar-btn');
        if (saveAvatarBtn) {
            saveAvatarBtn.addEventListener('click', async () => {
                const avatarUrlInput = document.getElementById('avatar-url');
                const avatarUrl = avatarUrlInput.value.trim();
                
                // Валидация URL
                if (avatarUrl && !avatarUrl.startsWith('https://')) {
                    Utils.showNotification('URL аватара должен использовать HTTPS протокол', 'error');
                    return;
                }
                
                try {
                    saveAvatarBtn.disabled = true;
                    saveAvatarBtn.textContent = 'Сохранение...';
                    
                    const result = await API.updateProfile(Auth.token, { avatarUrl: avatarUrl || null });
                    
                    if (result && result.user) {
                        Auth.currentUser = result.user;
                        Auth.updateUI();
                        Utils.showNotification('Аватар обновлен', 'success');
                        await this.render();
                    }
                } catch (error) {
                    console.error('Avatar save error:', error);
                    Utils.showNotification(error.message || 'Ошибка при сохранении аватара', 'error');
                } finally {
                    saveAvatarBtn.disabled = false;
                    saveAvatarBtn.textContent = 'Сохранить аватар';
                }
            });
        }
        
        // Handle avatar delete
        const deleteAvatarBtn = document.getElementById('delete-avatar-btn');
        if (deleteAvatarBtn) {
            deleteAvatarBtn.addEventListener('click', async () => {
                if (!confirm('Вы уверены, что хотите удалить аватар?')) return;
                
                try {
                    deleteAvatarBtn.disabled = true;
                    deleteAvatarBtn.textContent = 'Удаление...';
                    
                    const result = await API.deleteAvatar(Auth.token);
                    
                    if (result && result.success) {
                        Auth.currentUser = result.user;
                        Auth.updateUI();
                        Utils.showNotification('Аватар удален', 'success');
                        await this.render();
                    }
                } catch (error) {
                    console.error('Avatar delete error:', error);
                    Utils.showNotification(error.message || 'Ошибка при удалении аватара', 'error');
                } finally {
                    if (deleteAvatarBtn) {
                        deleteAvatarBtn.disabled = false;
                        deleteAvatarBtn.textContent = 'Удалить аватар';
                    }
                }
            });
        }
        
        // Handle profile form submit
        const form = document.getElementById('profile-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                
                const newName = document.getElementById('profile-name').value.trim();
                const newPassword = document.getElementById('profile-password').value;
                
                if (!newName) {
                    Utils.showNotification('Имя не может быть пустым', 'error');
                    return;
                }
                
                const updates = { characterName: newName };
                if (newPassword) {
                    if (newPassword.length < 6) {
                        Utils.showNotification('Пароль должен быть не менее 6 символов', 'error');
                        return;
                    }
                    updates.password = newPassword;
                }
                
                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Сохранение...';
                    
                    const result = await API.updateProfile(Auth.token, updates);
                    
                    if (result && result.user) {
                        // Обновляем локальные данные пользователя
                        Auth.currentUser = result.user;
                        // Обновляем UI
                        Auth.updateUI();
                        Utils.showNotification('Профиль успешно обновлен', 'success');
                        
                        // Очищаем поле пароля
                        document.getElementById('profile-password').value = '';
                        
                        // Обновляем отображение имени в шапке
                        const userNameSpan = document.querySelector('.user-name');
                        if (userNameSpan) {
                            userNameSpan.textContent = result.user.character_name;
                        }
                    } else {
                        throw new Error('Не удалось обновить профиль');
                    }
                } catch (error) {
                    console.error('Profile update error:', error);
                    Utils.showNotification(error.message || 'Ошибка при обновлении профиля', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }
        
        // Handle Discord action
        const discordBtn = document.getElementById('discord-action-btn');
        if (discordBtn) {
            // Удаляем старые обработчики, если есть
            const newDiscordBtn = discordBtn.cloneNode(true);
            discordBtn.parentNode.replaceChild(newDiscordBtn, discordBtn);
            
            if (user.discord_id) {
                newDiscordBtn.addEventListener('click', () => this.unlinkDiscord());
            } else {
                newDiscordBtn.addEventListener('click', () => this.linkDiscord());
            }
        }
    },
    
    async linkDiscord() {
        const btn = document.getElementById('discord-action-btn');
        const originalText = btn ? btn.textContent : 'Привязать Discord';
        
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Открытие окна...';
            }
            
            Utils.showNotification('Открываем окно авторизации Discord...', 'info');
            
            const result = await API.linkDiscord(Auth.token);
            
            if (result && result.success) {
                Utils.showNotification('Discord успешно привязан!', 'success');
                
                // Обновляем данные пользователя
                await Auth.refreshUserData();
                
                // Перерисовываем страницу профиля
                await this.render();
            } else if (result && result.error) {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Link Discord error:', error);
            
            // Более понятное сообщение об ошибке
            let errorMessage = error.message;
            if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
                errorMessage = 'Всплывающее окно было заблокировано. Пожалуйста, разрешите всплывающие окна для этого сайта и попробуйте снова.';
            }
            
            Utils.showNotification('Ошибка при привязке Discord: ' + errorMessage, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    },
    
    async unlinkDiscord() {
        if (!confirm('Вы уверены, что хотите отвязать Discord аккаунт? Это действие нельзя отменить.')) {
            return;
        }
        
        const btn = document.getElementById('discord-action-btn');
        const originalText = btn ? btn.textContent : 'Отвязать Discord';
        
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Отвязка...';
            }
            
            Utils.showNotification('Отвязываем Discord...', 'info');
            
            // Вызываем API метод для отвязки Discord
            const result = await API.unlinkDiscord(Auth.token);
            
            if (result && result.success) {
                Utils.showNotification('Discord успешно отвязан!', 'success');
                
                // Обновляем данные пользователя
                await Auth.refreshUserData();
                
                // Перерисовываем страницу профиля
                await this.render();
            } else {
                throw new Error(result?.error || 'Не удалось отвязать Discord');
            }
        } catch (error) {
            console.error('Unlink Discord error:', error);
            Utils.showNotification('Ошибка при отвязке Discord: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }
};