// js/pages/home.js
window.Pages = window.Pages || {};

window.Pages.Home = {
    async render() {
        const container = document.getElementById('page-content');
        const isAuth = !!Auth.currentUser;
        const isDiscordLinked = Auth.currentUser?.discord_id;
        
        container.innerHTML = `
            <div class="card">
                <h2>Добро пожаловать в коллегию адвокатов Boston</h2>
                <p>Официальный сайт коллегии адвокатов. Здесь вы можете получить юридическую помощь, записаться на консультацию и отслеживать свои дела.</p>
                
                ${!isAuth ? `
                    <div style="margin-top: 20px;">
                        <button id="auth-btn-home">Войти / Зарегистрироваться</button>
                    </div>
                ` : `
                    <div style="margin-top: 20px;">
                        <p>Вы вошли как: <strong>${Utils.escapeHtml(Auth.currentUser.character_name)}</strong></p>
                        <p>Ваш уровень доступа: ${Utils.getRoleName(Auth.currentUser.role_level)}</p>
                    </div>
                `}
            </div>
            
            ${isAuth && !isDiscordLinked ? `
                <div class="discord-notice">
                    <div class="discord-notice-icon">🎮</div>
                    <div class="discord-notice-content">
                        <strong>Для доступа к системе обращений необходимо привязать Discord</strong>
                        <p>Привяжите Discord аккаунт, чтобы подавать заявки на экзамен, аккредитацию и повышение</p>
                    </div>
                    <button id="link-discord-notice" class="discord-notice-btn">Привязать Discord</button>
                </div>
            ` : ''}
            
            <div class="card">
                <h3>Последние новости</h3>
                <p>🆕 Набор в стажеры адвокатуры открыт! Подайте заявку через личный кабинет.</p>
                <p>⚖️ Обновление законов города от 15.04.2025</p>
                <p>📅 График работы: Пн-Пт с 10:00 до 20:00</p>
            </div>
        `;
        
        document.getElementById('auth-btn-home')?.addEventListener('click', () => Auth.showAuthModal());
        document.getElementById('link-discord-notice')?.addEventListener('click', () => this.linkDiscord());
    },
    
    async linkDiscord() {
        const btn = document.getElementById('link-discord-notice');
        const originalText = btn?.textContent || 'Привязать Discord';
        
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Открытие окна...';
            }
            
            Utils.showNotification('Открываем окно авторизации Discord...', 'info');
            
            const result = await API.linkDiscord(Auth.token);
            
            if (result && result.success) {
                Utils.showNotification('Discord успешно привязан!', 'success');
                await Auth.refreshUserData();
                await this.render();
            }
        } catch (error) {
            console.error('Link Discord error:', error);
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
    }
};