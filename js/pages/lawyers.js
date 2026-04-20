// js/pages/lawyers.js
window.Pages.Lawyers = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `<div class="loader">Загрузка состава коллегии...</div>`;
        
        try {
            // Проверяем наличие токена и авторизацию
            if (!window.Auth || !window.Auth.token) {
                container.innerHTML = `
                    <div class="card" style="text-align: center;">
                        <p>Для просмотра состава коллегии необходимо авторизоваться</p>
                        <button onclick="window.Auth.showAuthModal()" class="btn btn-primary">Войти</button>
                    </div>
                `;
                return;
            }
            
            const response = await API.getUsers(window.Auth.token);
            const users = response.users || response;
            
            if (!users || !Array.isArray(users)) {
                throw new Error('Неверный формат данных');
            }
            
            // Фильтруем только адвокатский состав (роль 4-7) + главу (7) и замглавы (6)
            const barMembers = users.filter(u => u.role_level >= 4 && u.role_level <= 7);
            
            // Группировка по ролям
            const head = barMembers.find(u => u.role_level === 7); // Глава коллегии
            const deputies = barMembers.filter(u => u.role_level === 6); // Заместители главы
            const seniorLawyers = barMembers.filter(u => u.role_level === 5); // Старшие адвокаты
            const lawyers = barMembers.filter(u => u.role_level === 4); // Адвокаты
            
            container.innerHTML = `
                <div class="lawyers-page">
                    <!-- Заголовок страницы -->
                    <div class="page-header">
                        <h1 class="page-title">Коллегия государственных адвокатов</h1>
                        <p class="page-subtitle">Majestic RP | Boston</p>
                    </div>
                    
                    <!-- Глава коллегии -->
                    ${head ? `
                        <div class="section-title">
                            <span class="section-icon">👑</span>
                            <h2>Глава коллегии</h2>
                        </div>
                        <div class="head-section">
                            ${this.createLawyerCard(head, 'head')}
                        </div>
                    ` : ''}
                    
                    <!-- Заместители главы -->
                    ${deputies.length > 0 ? `
                        <div class="section-title">
                            <span class="section-icon">⚜️</span>
                            <h2>Заместители главы</h2>
                        </div>
                        <div class="deputies-grid">
                            ${deputies.map(deputy => this.createLawyerCard(deputy, 'deputy')).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- Старшие адвокаты -->
                    ${seniorLawyers.length > 0 ? `
                        <div class="section-title">
                            <span class="section-icon">⭐</span>
                            <h2>Старшие адвокаты</h2>
                        </div>
                        <div class="senior-grid">
                            ${seniorLawyers.map(senior => this.createLawyerCard(senior, 'senior')).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- Адвокаты -->
                    ${lawyers.length > 0 ? `
                        <div class="section-title">
                            <span class="section-icon">⚖️</span>
                            <h2>Адвокаты</h2>
                        </div>
                        <div class="lawyers-grid">
                            ${lawyers.map(lawyer => this.createLawyerCard(lawyer, 'lawyer')).join('')}
                        </div>
                    ` : ''}
                    
                    ${barMembers.length === 0 ? `
                        <div class="card" style="text-align: center;">
                            <p>В данный момент состав коллегии формируется</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading bar members:', error);
            container.innerHTML = `
                <div class="card" style="text-align: center;">
                    <h2>Ошибка загрузки</h2>
                    <p>Не удалось загрузить состав коллегии: ${error.message}</p>
                    <button onclick="window.Pages.Lawyers.render()" class="btn btn-primary">Попробовать снова</button>
                </div>
            `;
        }
    },
    
    // Функция создания карточки адвоката
    createLawyerCard(lawyer, type = 'lawyer') {
        const roleName = Utils.getRoleName(lawyer.role_level);
        
        // Разные иконки для разных типов
        const icons = {
            head: '👑',
            deputy: '⚜️',
            senior: '⭐',
            lawyer: '⚖️'
        };
        
        const icon = icons[type] || '👨‍⚖️';
        
        // Разные стили для разных типов
        let cardClass = 'lawyer-card';
        let nameClass = 'lawyer-name';
        let roleClass = 'lawyer-role';
        
        switch(type) {
            case 'head':
                cardClass += ' lawyer-card-head';
                nameClass += ' lawyer-name-head';
                roleClass += ' lawyer-role-head';
                break;
            case 'deputy':
                cardClass += ' lawyer-card-deputy';
                nameClass += ' lawyer-name-deputy';
                roleClass += ' lawyer-role-deputy';
                break;
            case 'senior':
                cardClass += ' lawyer-card-senior';
                break;
            default:
                cardClass += ' lawyer-card-lawyer';
        }
        
        // Формируем HTML для аватара или иконки
        const avatarHtml = lawyer.avatar_url ? 
            `<img src="${Utils.escapeHtml(lawyer.avatar_url)}" 
                  alt="${Utils.escapeHtml(lawyer.character_name)}" 
                  class="lawyer-avatar"
                  onerror="this.onerror=null; this.style.display='none'; this.parentElement.querySelector('.lawyer-icon-fallback').style.display='flex';">` : '';
        
        const fallbackIconHtml = !lawyer.avatar_url ? 
            `<div class="lawyer-icon-fallback">${icon}</div>` : 
            `<div class="lawyer-icon-fallback" style="display: none;">${icon}</div>`;
        
        return `
            <div class="${cardClass}">
                <div class="lawyer-avatar-container">
                    ${avatarHtml}
                    ${fallbackIconHtml}
                </div>
                <div class="lawyer-info">
                    <div class="${nameClass}">${Utils.escapeHtml(lawyer.character_name)}</div>
                    <div class="${roleClass}">${roleName}</div>
                </div>
            </div>
        `;
    }
};