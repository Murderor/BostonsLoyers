// js/auth.js
(function() {
    if (!window.API) {
        console.error('API not loaded');
    }
    
    window.Auth = {
        currentUser: null,
        token: null,

        async init() {
            const savedToken = sessionStorage.getItem('auth_token');
            if (savedToken) {
                try {
                    if (!window.API || typeof window.API.verifyToken !== 'function') {
                        throw new Error('API not loaded');
                    }
                    
                    const result = await window.API.verifyToken(savedToken);
                    
                    if (result.valid && result.user) {
                        this.token = savedToken;
                        this.currentUser = result.user;
                        // Убеждаемся, что role_level - число
                        this.currentUser.role_level = Number(this.currentUser.role_level) || 1;
                        this.updateUI();
                        
                        window.dispatchEvent(new CustomEvent('userDataUpdated', { 
                            detail: this.currentUser 
                        }));
                        
                        return true;
                    } else {
                        this.logout();
                        return false;
                    }
                } catch (error) {
                    console.error('Token verification error:', error);
                    this.logout();
                    return false;
                }
            }
            this.updateUI();
            return false;
        },

        async refreshUserData() {
            if (!this.token) return false;
            
            try {
                const result = await window.API.verifyToken(this.token);
                
                if (result.valid && result.user) {
                    this.currentUser = result.user;
                    this.currentUser.role_level = Number(this.currentUser.role_level) || 1;
                    sessionStorage.setItem('auth_token', this.token);
                    this.updateUI();
                    
                    window.dispatchEvent(new CustomEvent('userDataUpdated', { 
                        detail: this.currentUser 
                    }));
                    
                    return true;
                } else {
                    this.logout();
                    return false;
                }
            } catch (error) {
                console.error('Refresh user data error:', error);
                return false;
            }
        },

        showAuthModal() {
            const modal = document.getElementById('auth-modal');
            const formsContainer = document.getElementById('auth-forms');
            
            if (!modal || !formsContainer) return;
            
            formsContainer.innerHTML = `
                <div id="login-form">
                    <h2>Вход</h2>
                    <div class="form-group">
                        <label>Static ID (игровой ID)</label>
                        <input type="text" id="login-id" placeholder="Например: 12345" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="login-password" placeholder="Пароль">
                    </div>
                    <button id="login-btn">Войти</button>
                    <div class="auth-switch" id="show-register">Нет аккаунта? Зарегистрироваться</div>
                </div>
                <div id="register-form" style="display: none;">
                    <h2>Регистрация</h2>
                    <div class="form-group">
                        <label>Имя персонажа</label>
                        <input type="text" id="reg-name" placeholder="Имя Фамилия" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Static ID (игровой ID)</label>
                        <input type="text" id="reg-id" placeholder="Например: 12345" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="reg-password" placeholder="Пароль (мин. 6 символов)">
                    </div>
                    <div class="form-group">
                        <label>Подтверждение пароля</label>
                        <input type="password" id="reg-password2" placeholder="Повторите пароль">
                    </div>
                    <button id="register-btn">Зарегистрироваться</button>
                    <div class="auth-switch" id="show-login">Уже есть аккаунт? Войти</div>
                </div>
            `;
            
            modal.style.display = 'flex';
            
            document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
            document.getElementById('register-btn')?.addEventListener('click', () => this.handleRegister());
            document.getElementById('show-register')?.addEventListener('click', () => {
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
            });
            document.getElementById('show-login')?.addEventListener('click', () => {
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            });
        },

        async handleLogin() {
            const id = document.getElementById('login-id').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!id || !password) {
                Utils.showNotification('Заполните все поля', 'error');
                return;
            }
            
            const loginBtn = document.getElementById('login-btn');
            const originalText = loginBtn?.textContent || 'Войти';
            
            try {
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = 'Вход...';
                }
                
                const loginResult = await window.API.login(id, password);
                
                if (!loginResult.success || !loginResult.token) {
                    throw new Error(loginResult.error || 'Неверный ответ сервера');
                }
                
                this.token = loginResult.token;
                sessionStorage.setItem('auth_token', this.token);
                
                const verifyResult = await window.API.verifyToken(this.token);
                
                if (!verifyResult.valid || !verifyResult.user) {
                    throw new Error('Не удалось получить данные пользователя');
                }
                
                this.currentUser = verifyResult.user;
                this.currentUser.role_level = Number(this.currentUser.role_level) || 1;
                
                this.closeModal();
                this.updateUI();
                Utils.showNotification(`Добро пожаловать, ${Utils.escapeHtml(this.currentUser.character_name)}!`, 'success');
                
                window.dispatchEvent(new CustomEvent('userDataUpdated', { 
                    detail: this.currentUser 
                }));
                
                if (window.Router) {
                    window.Router.navigateTo('home');
                }
                
            } catch (error) {
                Utils.showNotification(error.message || 'Ошибка входа', 'error');
                
                this.token = null;
                this.currentUser = null;
                sessionStorage.removeItem('auth_token');
            } finally {
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = originalText;
                }
            }
        },

        async handleRegister() {
            const name = document.getElementById('reg-name').value.trim();
            const id = document.getElementById('reg-id').value.trim();
            const password = document.getElementById('reg-password').value;
            const password2 = document.getElementById('reg-password2').value;
            
            if (!name || !id || !password) {
                Utils.showNotification('Заполните все поля', 'error');
                return;
            }
            
            if (password !== password2) {
                Utils.showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            if (password.length < 6) {
                Utils.showNotification('Пароль должен быть не менее 6 символов', 'error');
                return;
            }
            
            const registerBtn = document.getElementById('register-btn');
            const originalText = registerBtn?.textContent || 'Зарегистрироваться';
            
            try {
                if (registerBtn) {
                    registerBtn.disabled = true;
                    registerBtn.textContent = 'Регистрация...';
                }
                
                const result = await window.API.register(name, id, password);
                
                if (!result.success) {
                    throw new Error(result.error || 'Ошибка регистрации');
                }
                
                Utils.showNotification('Регистрация успешна! Теперь войдите.', 'success');
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
                
                document.getElementById('reg-name').value = '';
                document.getElementById('reg-id').value = '';
                document.getElementById('reg-password').value = '';
                document.getElementById('reg-password2').value = '';
                
                const loginIdField = document.getElementById('login-id');
                if (loginIdField) {
                    loginIdField.value = id;
                }
                
                const loginPasswordField = document.getElementById('login-password');
                if (loginPasswordField) {
                    loginPasswordField.focus();
                }
                
            } catch (error) {
                Utils.showNotification(error.message || 'Ошибка регистрации', 'error');
            } finally {
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.textContent = originalText;
                }
            }
        },

        logout() {
            this.token = null;
            this.currentUser = null;
            sessionStorage.removeItem('auth_token');
            this.updateUI();
            Utils.showNotification('Вы вышли из системы', 'info');
            
            window.dispatchEvent(new CustomEvent('userLoggedOut'));
            
            if (window.Router) {
                window.Router.navigateTo('home');
            }
        },

        closeModal() {
            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        updateUI() {
            const userInfo = document.getElementById('user-info');
            const mainNav = document.getElementById('main-nav');
            
            if (!userInfo || !mainNav) return;
            

            
            if (this.currentUser && this.currentUser.id) {
                const roleLevel = Number(this.currentUser.role_level) || 1;
                
                let avatarHtml = '';
                if (this.currentUser.avatar_url) {
                    avatarHtml = `<img src="${Utils.escapeHtml(this.currentUser.avatar_url)}" 
                                       alt="Avatar" 
                                       class="user-avatar-mini" 
                                       onerror="this.onerror=null; this.style.display='none'; this.parentElement.querySelector('.user-avatar-placeholder').style.display='flex';">`;
                }
                
                userInfo.innerHTML = `
                    <div class="user-info-wrapper">
                        <div class="user-avatar-container">
                            ${avatarHtml}
                            ${!this.currentUser.avatar_url ? '<div class="user-avatar-placeholder">👤</div>' : ''}
                        </div>
                        <div class="user-details">
                            <span class="user-name">${Utils.escapeHtml(this.currentUser.character_name || 'Пользователь')}</span>
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                <span class="role-badge role-${roleLevel}">${Utils.getRoleName(roleLevel)}</span>
                                ${this.currentUser.discord_id ? '<span class="discord-badge">🎮 Discord</span>' : ''}
                            </div>
                        </div>
                        <button class="btn-logout" id="logout-btn">Выйти</button>
                    </div>
                `;
                
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    const newLogoutBtn = logoutBtn.cloneNode(true);
                    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
                    newLogoutBtn.addEventListener('click', () => this.logout());
                }
                
                let navLinks = `<a href="#" data-page="home">Главная</a>
                               <a href="#" data-page="profile">Профиль</a>
                               <a href="#" data-page="lawyers">О нас</a>`;
                
                if (roleLevel >= 4) {
                    navLinks += `<a href="#" data-page="lawyer-reports">📋 Отчеты</a>`;
                }
                
                if (this.currentUser.discord_id) {
                    navLinks += `<a href="#" data-page="appeals">📝 Обращения</a>`;
                }
                
                if (roleLevel >= 5) {
                    navLinks += `<a href="#" data-page="senior">👥 Старший состав</a>`;
                }
                
                if (roleLevel >= 5) {
                    navLinks += `<a href="#" data-page="admin">⚙️ Управление</a>`;
                }
                
                console.log('Generated nav links:', navLinks);
                mainNav.innerHTML = navLinks;
                
                document.querySelectorAll('[data-page]').forEach(link => {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                    newLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const page = newLink.getAttribute('data-page');
                        if (window.Router) {
                            window.Router.navigateTo(page);
                        }
                    });
                });
            } else {
                userInfo.innerHTML = `<button id="show-auth-btn">Вход / Регистрация</button>`;
                const authBtn = document.getElementById('show-auth-btn');
                if (authBtn) {
                    const newAuthBtn = authBtn.cloneNode(true);
                    authBtn.parentNode.replaceChild(newAuthBtn, authBtn);
                    newAuthBtn.addEventListener('click', () => this.showAuthModal());
                }
                mainNav.innerHTML = `<a href="#" data-page="home">Главная</a>
                                   <a href="#" data-page="lawyers">О нас</a>`;
                
                const links = document.querySelectorAll('[data-page]');
                links.forEach(link => {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                    newLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const page = newLink.getAttribute('data-page');
                        if (window.Router) {
                            window.Router.navigateTo(page);
                        }
                    });
                });
            }
        },

        checkAccess(requiredRole) {
            if (!this.currentUser || !this.currentUser.id) return false;
            const userRole = Number(this.currentUser.role_level) || 1;
            return userRole >= requiredRole;
        },
        
        getDiscordId() {
            return this.currentUser?.discord_id || null;
        },
        
        isDiscordLinked() {
            return !!(this.currentUser?.discord_id);
        },
        
        hasSeniorAccess() {
            const roleLevel = Number(this.currentUser?.role_level) || 1;
            return roleLevel >= 5;
        },
        
        hasAdminAccess() {
            const roleLevel = Number(this.currentUser?.role_level) || 1;
            return roleLevel >= 5;  // Исправлено: теперь 5+ имеют доступ
        },
        
        hasLawyerReportsAccess() {
            const roleLevel = Number(this.currentUser?.role_level) || 1;
            return roleLevel >= 4;
        }
    };
})();