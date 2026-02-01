// JavaScript для минимальной формы адвоката
document.addEventListener('DOMContentLoaded', function() {


    console.log('=== ДИАГНОСТИКА ФОРМЫ АДВОКАТА ===');
    
    // Проверяем ВСЕ источники вебхука
    console.log('1. DISCORD_WEBHOOK_URL (глобальная):', 
                typeof DISCORD_WEBHOOK_URL !== 'undefined' ? 'Есть' : 'Нет',
                DISCORD_WEBHOOK_URL?.substring(0, 30) + '...');
    
    console.log('2. window.DISCORD_WEBHOOK_URL:', 
                window.DISCORD_WEBHOOK_URL?.substring(0, 30) + '...');
    
    console.log('3. window.DISCORD_CONFIG.webhook:', 
                window.DISCORD_CONFIG?.webhook?.substring(0, 30) + '...');
    
    // Проверяем, одинаковые ли вебхуки
    const webhook1 = DISCORD_WEBHOOK_URL;
    const webhook2 = window.DISCORD_WEBHOOK_URL;
    const webhook3 = window.DISCORD_CONFIG?.webhook;
    
    if (webhook1 && webhook2 && webhook1 !== webhook2) {
        console.warn('⚠️ ВНИМАНИЕ: Вебхуки не совпадают!');
        console.warn('DISCORD_WEBHOOK_URL:', webhook1?.substring(30, 60));
        console.warn('window.DISCORD_WEBHOOK_URL:', webhook2?.substring(30, 60));
    }
    
    // Проверяем, есть ли старый вебхук в коде
    const oldWebhook = '1466132348943990886/uhgl4fKd8meIi5nTIiwT4Ig-JEyHil-vCdakZW5yaaPOBKHQ5n3R4uqjfGK_jrUyWrAl';
    if (webhook1?.includes(oldWebhook) || webhook2?.includes(oldWebhook)) {
        console.error('❌ ОШИБКА: Обнаружен СТАРЫЙ вебхук!');
        console.error('Нужно обновить GitHub Secrets или пересоздать вебхук в Discord');
    }


    
    
    console.log('Минимальная форма адвоката загружена');
    
    // ===== ПРОВЕРКА И ЗАГРУЗКА КОНФИГА DISCORD =====
    let discordWebhookUrl = null;
    let discordConfig = null;
    
    // Проверяем, загружен ли конфиг из внешнего файла
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' && 
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        
        console.log('✅ Discord Config загружен для формы адвоката');
        console.log('📅 Версия конфига:', discordConfig?.version || 'неизвестна');
        
    } else if (window.DISCORD_WEBHOOK_URL && 
               window.DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;
        
        console.log('✅ Discord Config загружен из window');
        
    } else {
        // Показываем предупреждение о тестовом режиме
        console.warn('⚠️ Discord вебхук не настроен для формы адвоката. Тестовый режим.');
        
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #ff9800, #f57c00);
                color: white;
                padding: 15px;
                margin: 20px 0;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
                border-left: 5px solid #ff5722;
            ">
                <strong>⚠️ Внимание:</strong> Discord вебхук не настроен.<br>
                <small>Для работы формы адвоката необходимо:</small><br>
                1. Добавить секрет DISCORD_WEBHOOK_URL в GitHub Secrets<br>
                2. Запустить GitHub Actions workflow<br>
                <small style="opacity: 0.8;">Форма будет сохранять заявки локально до настройки</small>
            </div>
        `;
        
        const form = document.querySelector('.minimal-section') || document.body;
        form.prepend(warning);
    }
    
    // ===== ВАЛИДАЦИЯ ССЫЛОК =====
    window.validateLink = function(input) {
        const index = input.name.replace('callLink', '');
        const validation = document.getElementById(`validation${index}`);
        const url = input.value.trim();
        
        // Обновляем счетчик
        updateLinksCounter();
        
        if (!url) {
            validation.className = 'link-validation';
            return;
        }
        
        // Проверяем, что это ссылка
        try {
            new URL(url);
            validation.textContent = '✅ Корректная ссылка';
            validation.className = 'link-validation valid';
        } catch (e) {
            validation.textContent = '❌ Некорректная ссылка. Используйте формат: https://...';
            validation.className = 'link-validation invalid';
        }
    };
    
    // Обновление счетчика заполненных ссылок
    function updateLinksCounter() {
        const inputs = document.querySelectorAll('input[name^="callLink"]');
        let filledCount = 0;
        
        inputs.forEach(input => {
            if (input.value.trim()) {
                filledCount++;
            }
        });
        
        const counterElement = document.getElementById('linksCount');
        if (counterElement) {
            counterElement.textContent = filledCount;
        }
        
        // Подсветка если все заполнены
        const statsCounter = document.querySelector('.stats-counter');
        if (statsCounter) {
            if (filledCount === 5) {
                statsCounter.style.border = '1px solid var(--color-accent)';
                statsCounter.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            } else {
                statsCounter.style.border = '';
                statsCounter.style.backgroundColor = '';
            }
        }
    }
    
    // ===== ПРОВЕРКА ДОСТУПНОСТИ DISCORD =====
    async function checkDiscordAvailability() {
        if (!discordWebhookUrl) return false;
        
        try {
            // Быстрая проверка доступности
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(discordWebhookUrl, {
                method: 'HEAD',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.status !== 404 && response.status !== 401;
        } catch (error) {
            console.log('Discord недоступен для формы адвоката:', error.name);
            return false;
        }
    }
    
    // ===== ОТПРАВКА В DISCORD =====
    async function sendToDiscord(formData) {
        const isDiscordAvailable = discordWebhookUrl ? await checkDiscordAvailability() : false;
        
        // Если Discord не настроен или недоступен, сохраняем локально
        if (!isDiscordAvailable) {
            console.log('Discord недоступен, сохраняем локально');
            return {
                success: true,
                id: `local-save-${Date.now()}`,
                message: 'Заявка сохранена локально',
                local: true
            };
        }
        
        try {
            showNotification('Отправка заявки в Discord...', 'info');
            
            // Формируем список ссылок с кликабельными ссылками
            let linksText = '';
            for (let i = 1; i <= 5; i++) {
                const link = formData[`callLink${i}`];
                if (link) {
                    // Форматируем ссылку для Discord Markdown
                    linksText += `**Вызов #${i}:** [Ссылка](${link})\n`;
                }
            }
            
            // Если слишком много ссылок, разбиваем на несколько embed полей
            const linksFields = [];
            if (linksText.length > 1024) {
                // Разбиваем длинный текст на части
                const linksArray = linksText.split('\n');
                let currentText = '';
                let fieldNumber = 1;
                
                for (const line of linksArray) {
                    if (currentText.length + line.length > 1024) {
                        linksFields.push({
                            name: `🔗 Ссылки на вызовы (часть ${fieldNumber})`,
                            value: currentText,
                            inline: false
                        });
                        currentText = line + '\n';
                        fieldNumber++;
                    } else {
                        currentText += line + '\n';
                    }
                }
                
                if (currentText.trim()) {
                    linksFields.push({
                        name: `🔗 Ссылки на вызовы (часть ${fieldNumber})`,
                        value: currentText.trim(),
                        inline: false
                    });
                }
            } else {
                linksFields.push({
                    name: '🔗 Ссылки на результаты вызовов',
                    value: linksText.trim() || 'Ссылки не указаны',
                    inline: false
                });
            }
            
            // Роли из конфига или дефолтные
            const discordRoles = discordConfig?.roles ? 
                `${discordConfig.roles.main}, ${discordConfig.roles.secondary}, ${discordConfig.roles.tertiary}` :
                '<@&1321503127987421316>, <@&1321503135302291516>, <@&1371785937180426270>';
            
            // Создаем основной embed
            const mainEmbed = {
                title: '📈 Заявка на повышение до Адвоката',
                description: `**Заявитель:** ${formData.fullName}\n**Повышение с должности:** Младший адвокат → Адвокат\n\n${discordRoles}`,
                color: 0x3498db, // Синий цвет
                fields: [
                    {
                        name: '👤 Имя заявителя',
                        value: formData.fullName,
                        inline: true
                    },
                    {
                        name: '📞 ID для связи',
                        value: `<@${formData.specialCommId}>`,
                        inline: true
                    },
                    {
                        name: '📋 Номер заявки',
                        value: formData.applicationId,
                        inline: true
                    },
                    {
                        name: '📅 Дата подачи',
                        value: new Date(formData.timestamp).toLocaleString('ru-RU'),
                        inline: true
                    },
                    {
                        name: '🔗 Количество ссылок',
                        value: '5/5 ссылок на вызовы',
                        inline: true
                    },
                    {
                        name: '📝 Статус',
                        value: '⏳ Ожидает рассмотрения',
                        inline: true
                    }
                ],
                footer: {
                    text: `Адвокатское бюро Majestic RP | Форма повышения | v${discordConfig?.version || '1.0'}`,
                    icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                timestamp: new Date().toISOString()
            };
            
            // Добавляем ссылки в основной embed
            if (linksFields.length === 1) {
                mainEmbed.fields.push(linksFields[0]);
            }
            
            // Подготавливаем данные для Discord
            const discordData = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: `Повышение: ${formData.fullName} → Адвокат`,
                embeds: [mainEmbed],
                content: `📢 **Новая заявка на повышение!** <@${formData.specialCommId}> подает заявку на повышение до Адвоката.\n\n**Проверьте ссылки на вызовы в embed сообщении ниже:**`
            };
            
            // Если ссылок много, добавляем дополнительные embeds
            if (linksFields.length > 1) {
                // Убираем первую часть из основного embed
                mainEmbed.fields = mainEmbed.fields.filter(field => !field.name.includes('Ссылки'));
                
                // Создаем отдельные embed для ссылок
                linksFields.forEach((field, index) => {
                    discordData.embeds.push({
                        title: `🔗 Ссылки на результаты вызовов ${linksFields.length > 1 ? `(часть ${index + 1})` : ''}`,
                        description: field.value,
                        color: 0xd4af37, // Золотой цвет
                        footer: {
                            text: 'Все ссылки кликабельны'
                        }
                    });
                });
            }
            
            // Отправляем запрос к Discord Webhook
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(discordData)
            });
            
            // Проверяем статус ответа
            if (!response.ok) {
                let errorMessage = `Ошибка Discord (${response.status})`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage += `: ${errorText}`;
                    }
                } catch (e) {
                    // Игнорируем ошибку чтения текста ошибки
                }
                throw new Error(errorMessage);
            }
            
            // Пытаемся получить JSON ответ
            let result = null;
            try {
                const responseText = await response.text();
                if (responseText && responseText.trim()) {
                    result = JSON.parse(responseText);
                } else {
                    result = {
                        success: true,
                        id: `thread-${Date.now()}`,
                        message: 'Сообщение отправлено',
                        buildId: discordConfig?.buildId || 'local'
                    };
                }
            } catch (jsonError) {
                console.log('Discord вернул не-JSON ответ');
                result = {
                    success: true,
                    id: `thread-${Date.now()}`,
                    message: 'Сообщение отправлено',
                    buildId: discordConfig?.buildId || 'local'
                };
            }
            
            console.log('Заявка успешно отправлена в Discord');
            return result;
            
        } catch (error) {
            console.error('Ошибка отправки в Discord:', error);
            
            // Если ошибка сети или Discord недоступен, пробуем сохранить локально
            if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('aborted')) {
                console.log('Discord недоступен, сохраняем локально');
                return {
                    success: true,
                    id: `local-save-${Date.now()}`,
                    message: 'Заявка сохранена локально (Discord недоступен)',
                    local: true
                };
            }
            
            throw error;
        }
    }
    
    // ===== ВАЛИДАЦИЯ ФОРМЫ =====
    const form = document.getElementById('attorneyForm');
    const submitButton = document.getElementById('submitButton');
    
    if (form && submitButton) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверяем обязательные поля
            const errors = [];
            
            // Проверка имени
            const fullName = document.getElementById('fullName').value.trim();
            if (!fullName) {
                errors.push('• Введите ваше полное имя');
            }
            
            // Проверка ID спецсвязи
            const specialCommId = document.getElementById('specialCommId').value;
            if (!/^\d{17,20}$/.test(specialCommId)) {
                errors.push('• ID спецсвязи должен содержать 17-20 цифр');
            }
            
            // Проверка ссылок на вызовы
            const callLinks = [];
            for (let i = 1; i <= 5; i++) {
                const input = document.querySelector(`input[name="callLink${i}"]`);
                if (input) {
                    const link = input.value.trim();
                    if (link) {
                        try {
                            new URL(link);
                            callLinks.push(link);
                        } catch (e) {
                            errors.push(`• Ссылка на вызов #${i} некорректна`);
                        }
                    } else {
                        errors.push(`• Заполните ссылку на вызов #${i}`);
                    }
                }
            }
            
            if (callLinks.length < 5) {
                errors.push('• Необходимо заполнить все 5 ссылок на вызовы');
            }
            
            // Проверка соглашения
            const confirmationCheckbox = document.getElementById('confirmation');
            if (!confirmationCheckbox || !confirmationCheckbox.checked) {
                errors.push('• Необходимо подтвердить согласие с правилами');
            }
            
            if (errors.length > 0) {
                showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
                
                // Показываем подробные ошибки
                const errorHtml = `
                    <div style="text-align: left; margin-top: 10px;">
                        <strong>Обнаружены ошибки:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            ${errors.map(error => `<li style="margin-bottom: 5px;">${error}</li>`).join('')}
                        </ul>
                    </div>
                `;
                
                // Создаем модальное окно с ошибками
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;
                
                modal.innerHTML = `
                    <div style="background-color: var(--color-gray); padding: 30px; border-radius: var(--border-radius); max-width: 500px; width: 90%;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                            <div style="font-size: 2rem; color: #ff6b6b;">⚠️</div>
                            <h3 style="margin: 0; color: #ff6b6b;">Ошибка отправки формы</h3>
                        </div>
                        ${errorHtml}
                        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                                class="button" 
                                style="margin-top: 20px; width: 100%; background-color: #e74c3c;">
                            Закрыть и исправить
                        </button>
                    </div>
                `;
                
                document.body.appendChild(modal);
                return;
            }
            
            // Блокируем кнопку отправки
            submitButton.disabled = true;
            submitButton.innerHTML = '⏳ Отправка в Discord...';
            
            // Собираем данные формы
            const formData = {
                fullName: fullName,
                specialCommId: specialCommId,
                position: 'attorney',
                timestamp: new Date().toISOString(),
                applicationId: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                configVersion: discordConfig?.version || 'test'
            };
            
            // Добавляем ссылки на вызовы
            for (let i = 1; i <= 5; i++) {
                const input = document.querySelector(`input[name="callLink${i}"]`);
                if (input) {
                    formData[`callLink${i}`] = input.value.trim();
                }
            }
            
            try {
                // Отправляем в Discord
                const discordResult = await sendToDiscord(formData);
                
                // Показываем успешное сообщение
                if (discordResult.local) {
                    showSuccessMessage(formData.applicationId, discordResult, true);
                } else {
                    showSuccessMessage(formData.applicationId, discordResult);
                }
                
                // Сохраняем данные в localStorage
                saveApplicationToStorage(formData, discordResult);
                
                // Очищаем форму
                form.reset();
                updateLinksCounter();
                
            } catch (error) {
                console.error('Ошибка отправки:', error);
                
                // Более информативное сообщение об ошибке
                let errorMessage = 'Ошибка отправки заявки. ';
                
                if (error.message.includes('429')) {
                    errorMessage += 'Слишком много запросов. Подождите немного и попробуйте снова.';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage += 'Проблема с доступом к Discord. Проверьте webhook URL.';
                } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                    errorMessage += 'Проблема с интернет-соединением. Проверьте подключение.';
                } else {
                    errorMessage += 'Пожалуйста, попробуйте еще раз.';
                }
                
                showNotification(errorMessage, 'error');
                
            } finally {
                // Всегда разблокируем кнопку
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '📤 Отправить заявку';
                }, 2000);
            }
        });
    }
    
    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    const saveDraftButton = document.getElementById('saveDraftButton');
    if (saveDraftButton) {
        saveDraftButton.addEventListener('click', function() {
            const draftData = {
                fullName: document.getElementById('fullName')?.value || '',
                specialCommId: document.getElementById('specialCommId')?.value || '',
                timestamp: new Date().toLocaleString()
            };
            
            // Сохраняем ссылки на вызовы
            for (let i = 1; i <= 5; i++) {
                const input = document.querySelector(`input[name="callLink${i}"]`);
                if (input) {
                    draftData[`callLink${i}`] = input.value;
                }
            }
            
            // Сохраняем соглашение
            const confirmationCheckbox = document.getElementById('confirmation');
            if (confirmationCheckbox) {
                draftData.confirmation = confirmationCheckbox.checked;
            }
            
            localStorage.setItem('attorneyDraft', JSON.stringify(draftData));
            localStorage.setItem('draftSaved', new Date().toLocaleString());
            
            // Показываем уведомление
            showNotification('Черновик сохранён!', 'success');
            console.log('Черновик сохранён:', draftData);
        });
    }
    
    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('attorneyDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                
                // Заполняем основные поля
                if (document.getElementById('fullName')) {
                    document.getElementById('fullName').value = draftData.fullName || '';
                }
                if (document.getElementById('specialCommId')) {
                    document.getElementById('specialCommId').value = draftData.specialCommId || '';
                }
                
                // Заполняем ссылки на вызовы
                for (let i = 1; i <= 5; i++) {
                    const link = draftData[`callLink${i}`];
                    const input = document.querySelector(`input[name="callLink${i}"]`);
                    if (link && input) {
                        input.value = link;
                        validateLink(input);
                    }
                }
                
                // Заполняем соглашение
                const confirmationCheckbox = document.getElementById('confirmation');
                if (confirmationCheckbox && draftData.confirmation !== undefined) {
                    confirmationCheckbox.checked = draftData.confirmation;
                }
                
                console.log('Черновик загружен');
                showNotification('Черновик загружен', 'info');
                
            } catch (error) {
                console.error('Ошибка загрузки черновика:', error);
            }
        }
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    function showSuccessMessage(applicationId, discordResult, isLocal = false) {
        const message = document.createElement('div');
        const backgroundColor = isLocal ? '#f39c12' : '#2ecc71';
        const icon = isLocal ? '💾' : '✅';
        const title = isLocal ? 'Сохранено локально!' : 'Заявка отправлена!';
        const description = isLocal ? 
            'Discord недоступен, заявка сохранена локально' : 
            'Ответ в течение 3-5 дней';
        const configInfo = discordConfig ? 
            ` (v${discordConfig.version}, ${discordConfig.buildDate || 'текущая сборка'})` : '';
        
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, ${backgroundColor}, ${isLocal ? '#e67e22' : '#27ae60'});
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.5s ease;
            max-width: 400px;
            backdrop-filter: blur(10px);
        `;
        
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${icon}</div>
                <div>
                    <h3 style="margin: 0 0 10px 0;">${title}${configInfo}</h3>
                    <p style="margin: 0; opacity: 0.9;">Номер заявки: ${applicationId}</p>
                    <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">
                        ${description}
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOut 0.5s ease';
            setTimeout(() => message.remove(), 500);
        }, 5000);
    }
    
    function showNotification(text, type = 'info') {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        
        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, ${colors[type]}, ${colors[type]}dd);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(10px);
        `;
        
        notification.innerHTML = `
            <div style="font-size: 1.5rem;">${icon[type]}</div>
            <div>${text}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function saveApplicationToStorage(formData, discordResult) {
        try {
            const applications = JSON.parse(localStorage.getItem('applications') || '[]');
            
            const application = {
                id: formData.applicationId,
                type: 'attorney_promotion_minimal',
                date: new Date().toLocaleString(),
                status: discordResult?.local ? 'local_saved' : 'pending',
                fullName: formData.fullName,
                specialCommId: formData.specialCommId,
                discordThreadId: discordResult?.id || null,
                callLinks: [],
                configVersion: formData.configVersion,
                buildId: discordResult?.buildId || 'local'
            };
            
            // Сохраняем ссылки на вызовы
            for (let i = 1; i <= 5; i++) {
                if (formData[`callLink${i}`]) {
                    application.callLinks.push(formData[`callLink${i}`]);
                }
            }
            
            applications.push(application);
            localStorage.setItem('applications', JSON.stringify(applications));
            localStorage.setItem('lastApplication', JSON.stringify(application));
            
            console.log('Заявка сохранена в хранилище:', application);
            
        } catch (error) {
            console.error('Ошибка сохранения в хранилище:', error);
        }
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    updateLinksCounter();
    loadDraft();
    
    // Анимация появления формы
    setTimeout(() => {
        document.querySelectorAll('.minimal-section').forEach((section, index) => {
            if (section) {
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    section.style.opacity = '1';
                    section.style.transform = 'translateY(0)';
                }, 100 * index);
            }
        });
    }, 500);
    
    console.log('Минимальная форма адвоката инициализирована');
    console.log('Режим Discord:', discordWebhookUrl ? '✅ Настроен' : '❌ Не настроен (тестовый)');
    console.log('Версия конфига:', discordConfig?.version || 'test');
});

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

