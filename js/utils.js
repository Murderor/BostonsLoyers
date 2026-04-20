// Утилиты для работы с DOM и безопасностью
window.Utils = {
    // ========================
    // БЕЗОПАСНОСТЬ
    // ========================
    
    // Расширенное экранирование HTML для предотвращения XSS
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/\//g, '&#x2F;');
    },
    
    // Экранирование для атрибутов HTML
    escapeAttribute(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/=/g, '&#61;')
            .replace(/ /g, '&#32;');
    },
    
    // Экранирование для JavaScript строк
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
    
    // Валидация Discord ссылки
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
    
    // Валидация имени персонажа
    validateCharacterName(name) {
        if (!name || typeof name !== 'string') return false;
        if (name.length > 50) return false;
        return /^[a-zA-Zа-яА-ЯёЁ0-9\s\-']+$/u.test(name);
    },
    
    // Санитайзинг объекта (рекурсивный)
    sanitizeObject(obj, maxDepth = 3) {
        if (maxDepth < 0) return null;
        
        if (typeof obj === 'string') {
            return this.escapeHtml(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const safeKey = this.escapeHtml(key);
                    sanitized[safeKey] = this.sanitizeObject(obj[key], maxDepth - 1);
                }
            }
            return sanitized;
        }
        return obj;
    },
    
    // ========================
    // УВЕДОМЛЕНИЯ (ИСПРАВЛЕННЫЕ)
    // ========================
    
    showNotification(message, type = 'info', duration = 3000) {
        // Получаем или создаем контейнер для уведомлений
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        // Ограничиваем количество уведомлений (не больше 5)
        const existingNotifications = container.querySelectorAll('.notification');
        if (existingNotifications.length >= 5) {
            existingNotifications[0].remove();
        }
        
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Безопасно добавляем сообщение
        const safeMessage = this.escapeHtml(message);
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${safeMessage}</span>
            <button class="notification-close" aria-label="Закрыть">×</button>
        `;
        
        // Добавляем прогресс-бар
        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';
        progressBar.style.animationDuration = `${duration}ms`;
        notification.appendChild(progressBar);
        
        container.appendChild(notification);
        
        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Закрытие по клику на крестик
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeNotification(notification);
        });
        
        // Закрытие по клику на уведомление (опционально)
        notification.addEventListener('click', (e) => {
            if (e.target !== closeBtn) {
                this.closeNotification(notification);
            }
        });
        
        // Автоматическое закрытие
        let timeoutId = setTimeout(() => {
            this.closeNotification(notification);
        }, duration);
        
        // При наведении мыши отменяем автоматическое закрытие
        notification.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            progressBar.style.animationPlayState = 'paused';
        });
        
        notification.addEventListener('mouseleave', () => {
            progressBar.style.animationPlayState = 'running';
            timeoutId = setTimeout(() => {
                this.closeNotification(notification);
            }, duration);
        });
        
        return notification;
    },
    
    closeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            
            // Удаляем контейнер, если уведомлений больше нет
            const container = document.querySelector('.notifications-container');
            if (container && container.children.length === 0) {
                container.remove();
            }
        }, 300);
    },
    
    getNotificationIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✗';
            case 'warning': return '⚠';
            case 'info':
            default: return 'ℹ';
        }
    },
    
    // ========================
    // РОЛИ И ПРАВА
    // ========================
    
    // Получение названия роли по уровню
    getRoleName(level) {
        const roles = {
            1: 'Гражданин',
            2: 'Стажер адвокатуры',
            3: 'Юрист',
            4: 'Адвокат',
            5: 'Старший адвокат',
            6: 'Зам. главы коллегии',
            7: 'Глава коллегии',
            8: 'Администрация сайта'
        };
        return roles[level] || 'Неизвестно';
    },
    
    // Получение CSS класса для роли
    getRoleClass(level) {
        return `role-${level}`;
    },
    
    // Проверка прав доступа
    hasAccess(userRole, requiredRole) {
        return parseInt(userRole) >= parseInt(requiredRole);
    },
    
    // Проверка, может ли пользователь редактировать другого пользователя
    canEditUser(currentUserRole, targetUserRole) {
        // Администратор (8) может редактировать всех
        if (currentUserRole === 8) return true;
        // Остальные не могут редактировать пользователей с ролью выше или равной своей
        return currentUserRole >= 6 && targetUserRole < currentUserRole;
    },
    
    // ========================
    // ЗАЩИТА ОТ FLOOD (DEBOUNCE/THROTTLE)
    // ========================
    
    // Дебаунс для защиты от частых запросов
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Троттлинг (не чаще чем раз в указанное время)
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // ========================
    // ФОРМАТИРОВАНИЕ
    // ========================
    
    // Форматирование даты
    formatDate(date, format = 'ru') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Неверная дата';
        
        if (format === 'ru') {
            return d.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return d.toLocaleString();
    },
    
    // Форматирование относительного времени (например: "5 минут назад")
    formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин. назад`;
        if (diffHours < 24) return `${diffHours} ч. назад`;
        if (diffDays < 7) return `${diffDays} д. назад`;
        
        return this.formatDate(date, 'ru');
    },
    
    // Обрезание текста
    truncateText(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },
    
    // ========================
    // РАБОТА С ФАЙЛАМИ
    // ========================
    
    // Валидация файла
    validateFile(file, options = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        } = options;
        
        if (!file) return { valid: false, error: 'Файл не выбран' };
        
        if (file.size > maxSize) {
            return { valid: false, error: `Файл слишком большой (макс. ${maxSize / 1024 / 1024}MB)` };
        }
        
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Неподдерживаемый тип файла' };
        }
        
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return { valid: false, error: 'Неподдерживаемое расширение файла' };
        }
        
        return { valid: true };
    },
    
    // Преобразование файла в base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    // ========================
    // DOM УТИЛИТЫ
    // ========================
    
    // Безопасное создание элемента
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, this.escapeAttribute(String(value)));
            } else {
                element.setAttribute(key, this.escapeAttribute(String(value)));
            }
        }
        
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(this.escapeHtml(child)));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        }
        
        return element;
    },
    
    // Очистка контейнера
    clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    },
    
    // ========================
    // ЛОГИРОВАНИЕ (безопасное)
    // ========================
    
    log(message, data = null, level = 'info') {
        const safeMessage = this.escapeHtml(String(message));
        const timestamp = new Date().toISOString();
        
        // В консоль выводим оригинал (для разработки)
        if (data) {
            console[level](`[${timestamp}] ${message}`, data);
        } else {
            console[level](`[${timestamp}] ${message}`);
        }
        
        // Для production можно отправлять на сервер (опционально)
        if (window.ENV === 'production' && level === 'error') {
            this.sendErrorToServer(message, data);
        }
    },
    
    sendErrorToServer(message, data) {
        // Отправка ошибки на сервер (опционально)
        if (window.API && window.API.logError) {
            window.API.logError({
                message: this.escapeHtml(String(message)),
                data: data ? JSON.stringify(data) : null,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            }).catch(() => {});
        }
    }
};

// Добавляем CSS стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    /* Контейнер для уведомлений */
    .notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 350px;
    }
    
    /* Уведомление */
    .notification {
        pointer-events: auto;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        position: relative;
        overflow: hidden;
        border-left: 4px solid;
        cursor: pointer;
    }
    
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification.hide {
        transform: translateX(100%);
        opacity: 0;
    }
    
    /* Типы уведомлений */
    .notification.success {
        border-left-color: #10b981;
        background: linear-gradient(135deg, #064e3b, #065f46);
    }
    
    .notification.error {
        border-left-color: #ef4444;
        background: linear-gradient(135deg, #7f1d1d, #991b1b);
    }
    
    .notification.warning {
        border-left-color: #f59e0b;
        background: linear-gradient(135deg, #78350f, #92400e);
    }
    
    .notification.info {
        border-left-color: #3b82f6;
        background: linear-gradient(135deg, #1e3a8a, #1e40af);
    }
    
    /* Иконка уведомления */
    .notification-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        flex-shrink: 0;
    }
    
    /* Сообщение */
    .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
        color: #fff;
        word-wrap: break-word;
    }
    
    /* Кнопка закрытия */
    .notification-close {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.2s ease;
        flex-shrink: 0;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    /* Прогресс-бар */
    .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
        animation: progress linear forwards;
    }
    
    @keyframes progress {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
    
    /* Адаптивность для мобильных */
    @media (max-width: 768px) {
        .notifications-container {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }
        
        .notification {
            padding: 10px 14px;
        }
        
        .notification-message {
            font-size: 13px;
        }
    }
`;
document.head.appendChild(style);