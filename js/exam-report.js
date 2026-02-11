// JavaScript для формы отчёта по устному экзамену

document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма отчёта по устному экзамену загружена');

    // ===== ПРОВЕРКА DISCORD WEBHOOK =====
    let discordWebhookUrl = null;
    let discordConfig = null;
    
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' && 
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        
        console.log('✅ Discord Config загружен');
        console.log('📅 Версия конфига:', discordConfig?.version || 'неизвестна');
        
    } else if (window.DISCORD_WEBHOOK_URL && 
               window.DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;
        
        console.log('✅ Discord Config загружен из window');
        
    } else {
        console.warn('⚠️ Discord вебхук не настроен. Тестовый режим.');
        
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
                <small>Для работы формы необходимо:</small><br>
                1. Добавить секрет DISCORD_WEBHOOK_URL в GitHub Secrets<br>
                2. Запустить GitHub Actions workflow<br>
                <small style="opacity: 0.8;">Форма будет сохранять отчёты локально до настройки</small>
            </div>
        `;
        
        const form = document.querySelector('.minimal-section') || document.body;
        form.prepend(warning);
    }
    
    // ===== ОБНОВЛЕНИЕ ИТОГОВОГО БАЛЛА =====
    window.updateTotalScore = function() {
        const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
        let total = 0;
        
        categories.forEach(category => {
            const input = document.querySelector(`input[name="${category}"]`);
            if (input) {
                total += Number(input.value) || 0;
            }
        });
        
        const totalElement = document.getElementById('totalScore');
        if (totalElement) {
            totalElement.textContent = total;
        }
        
        const totalContainer = document.querySelector('.total-score');
        if (totalContainer) {
            if (total >= 40) {
                totalContainer.style.border = '1px solid var(--color-accent)';
                totalContainer.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            } else {
                totalContainer.style.border = '';
                totalContainer.style.backgroundColor = '';
            }
        }
    };
    
    // ===== ПРОВЕРКА ДОСТУПНОСТИ DISCORD =====
    async function checkDiscordAvailability() {
        if (!discordWebhookUrl) return false;
        
        try {
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
            console.log('Discord недоступен:', error.name);
            return false;
        }
    }
    
    // ===== ОТПРАВКА В DISCORD =====
    async function sendToDiscord(formData) {
        const isDiscordAvailable = discordWebhookUrl ? await checkDiscordAvailability() : false;
        
        if (!isDiscordAvailable) {
            console.log('Discord недоступен, сохраняем локально');
            return {
                success: true,
                id: `local-save-${Date.now()}`,
                message: 'Отчёт сохранён локально',
                local: true
            };
        }
        
        try {
            showNotification('Отправка отчёта в Discord...', 'info');
            
            let scoresText = '';
            const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
            const categoryNames = {
                basicLevel: 'Базовый уровень',
                constitution: 'Конституция штата San-Andreas',
                proceduralCode: 'Процессуальный кодекс',
                criminalCode: 'Уголовный кодекс',
                advocacyLaw: 'Закон О коллегии адвокатов штата San-Andreas'
            };
            
            categories.forEach(key => {
                const score = formData[key];
                scoresText += `**${categoryNames[key]}:** ${score}/10\n`;
            });
            
            scoresText += `\n**Итоговый балл:** ${formData.totalScore}/50`;
            
            const roles = discordConfig?.roles ? 
                `${discordConfig.roles.main}, ${discordConfig.roles.secondary}, ${discordConfig.roles.tertiary}` :
                '<@&1321503127987421316>, <@&1321503135302291516>, <@&1371785937180426270>';
            
            const mainEmbed = {
                title: '📝 Отчёт по устному экзамену',
                description: `**Экзаменатор:** ${formData.examinerName} (<@${formData.examinerId}>)\n**Кандидат:** ${formData.candidateName} (<@${formData.candidateId}>)\n\n${roles}`,
                color: 0x3498db,
                fields: [
                    {
                        name: '👤 Экзаменатор',
                        value: `${formData.examinerName} (ID: ${formData.examinerId})`,
                        inline: true
                    },
                    {
                        name: '🧑‍🎓 Кандидат',
                        value: `${formData.candidateName} (ID: ${formData.candidateId})`,
                        inline: true
                    },
                    {
                        name: '📋 Номер отчёта',
                        value: formData.reportId,
                        inline: true
                    },
                    {
                        name: '📅 Дата',
                        value: new Date(formData.timestamp).toLocaleString('ru-RU'),
                        inline: true
                    },
                    {
                        name: '📊 Баллы по категориям',
                        value: scoresText,
                        inline: false
                    }
                ],
                footer: {
                    text: `Адвокатское бюро Majestic RP | Форма отчёта | v${discordConfig?.version || '1.0'}`,
                    icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                timestamp: new Date().toISOString()
            };
            
            const discordData = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: `Отчёт экзамена: Кандидат ${formData.candidateName}`,
                embeds: [mainEmbed],
                content: `📢 **Новый отчёт по экзамену!** Экзаменатор ${formData.examinerName} провёл экзамен для кандидата ${formData.candidateName}.`
            };
            
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(discordData)
            });
            
            if (!response.ok) {
                let errorMessage = `Ошибка Discord (${response.status})`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage += `: ${errorText}`;
                    }
                } catch (e) {
                    // ignore
                }
                throw new Error(errorMessage);
            }
            
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
            
            console.log('Отчёт успешно отправлен в Discord');
            return result;
            
        } catch (error) {
            console.error('Ошибка отправки в Discord:', error);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('aborted')) {
                console.log('Discord недоступен, сохраняем локально');
                return {
                    success: true,
                    id: `local-save-${Date.now()}`,
                    message: 'Отчёт сохранён локально (Discord недоступен)',
                    local: true
                };
            }
            
            throw error;
        }
    }
    
    // ===== ОТПРАВКА В GOOGLE APPS SCRIPT =====
    async function sendToGAS(formData) {
        try {
            // Замени на свой реальный URL веб-приложения GAS
            const GAS_URL = 'https://script.google.com/macros/s/AKfycbxzSoMh9FVZfDZMOAQDu3i4BxIs_oiuYpQphy2FxYpVCNX-8opQkQ-Y6if_Z1dC2nBA/exec';
            
            const response = await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', // Для GAS без CORS-проблем
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            // no-cors не даёт читать ответ, но если не упало — считаем OK
            console.log('Отчёт успешно отправлен в Google Таблицу');
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка отправки в GAS:', error);
            return { success: false, message: 'Не удалось зафиксировать в таблице' };
        }
    }
    
    // ===== ВАЛИДАЦИЯ ФОРМЫ =====
    const form = document.getElementById('examReportForm');
    const submitButton = document.getElementById('submitButton');
    
    if (form && submitButton) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const errors = [];
            
            // Имя экзаменатора
            const examinerName = document.getElementById('examinerName').value.trim();
            if (!examinerName) {
                errors.push('Введите имя экзаменатора');
            }
            
            // ID экзаменатора
            const examinerId = document.getElementById('examinerId').value.trim();
            if (!/^\d{17,20}$/.test(examinerId)) {
                errors.push('ID экзаменатора должен содержать 17-20 цифр');
            }
            
            // Имя кандидата
            const candidateName = document.getElementById('candidateName').value.trim();
            if (!candidateName) {
                errors.push('Введите имя кандидата');
            }
            
            // ID кандидата
            const candidateId = document.getElementById('candidateId').value.trim();
            if (!/^\d{17,20}$/.test(candidateId)) {
                errors.push('ID кандидата должен содержать 17-20 цифр');
            }
            
            // Баллы
            const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
            categories.forEach(category => {
                const value = Number(document.querySelector(`input[name="${category}"]`).value);
                if (isNaN(value) || value < 0 || value > 20) {
                    errors.push(`Балл для "${category}" должен быть от 0 до 10`);
                }
            });
            
            // Пароль
            const password = document.getElementById('secretPassword').value.trim();
            if (!password) {
                errors.push('Введите пароль подтверждения');
            }
            
            // Чекбокс
            const confirmationCheckbox = document.getElementById('confirmation');
            if (!confirmationCheckbox.checked) {
                errors.push('Подтвердите согласие с правилами');
            }
            
            if (errors.length > 0) {
                showNotification('Пожалуйста, исправьте ошибки:\n' + errors.join('\n'), 'error');
                return;
            }
            
            submitButton.disabled = true;
            submitButton.innerHTML = '⏳ Отправка...';
            
            const formData = {
                examinerName: examinerName,
                examinerId: examinerId,
                candidateName: candidateName,
                candidateId: candidateId,
                password: password, // Отправляем в GAS для проверки
                totalScore: 0,
                timestamp: new Date().toISOString(),
                reportId: `EXAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                configVersion: discordConfig?.version || 'test'
            };
            
            categories.forEach(category => {
                formData[category] = Number(document.querySelector(`input[name="${category}"]`).value);
                formData.totalScore += formData[category];
            });
            
            try {
                // Сначала отправляем в GAS для фиксации и проверки пароля
                const gasResult = await sendToGAS(formData);
                
                if (!gasResult.success) {
                    throw new Error(gasResult.message || 'Ошибка в GAS');
                }
                
                // Затем в Discord (если настроен)
                const discordResult = await sendToDiscord(formData);
                
                showSuccessMessage(formData.reportId, discordResult, discordResult.local);
                
                saveApplicationToStorage(formData, discordResult);
                
                form.reset();
                updateTotalScore();
                
            } catch (error) {
                console.error('Ошибка отправки:', error);
                
                let errorMessage = 'Ошибка отправки отчёта. ';
                
                if (error.message.includes('429')) {
                    errorMessage += 'Слишком много запросов. Подождите.';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage += 'Проблема с доступом.';
                } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                    errorMessage += 'Проблема с интернет-соединением.';
                } else {
                    errorMessage += 'Попробуйте еще раз.';
                }
                
                showNotification(errorMessage, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = '📤 Отправить отчёт';
            }
        });
    }
    
    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    const saveDraftButton = document.getElementById('saveDraftButton');
    if (saveDraftButton) {
        saveDraftButton.addEventListener('click', function() {
            const draftData = {
                examinerName: document.getElementById('examinerName')?.value || '',
                examinerId: document.getElementById('examinerId')?.value || '',
                candidateName: document.getElementById('candidateName')?.value || '',
                candidateId: document.getElementById('candidateId')?.value || '',
                secretPassword: document.getElementById('secretPassword')?.value || '',
                timestamp: new Date().toLocaleString()
            };
            
            const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
            categories.forEach(category => {
                draftData[category] = document.querySelector(`input[name="${category}"]`)?.value || '';
            });
            
            const confirmationCheckbox = document.getElementById('confirmation');
            if (confirmationCheckbox) {
                draftData.confirmation = confirmationCheckbox.checked;
            }
            
            localStorage.setItem('examReportDraft', JSON.stringify(draftData));
            localStorage.setItem('draftSaved', new Date().toLocaleString());
            
            showNotification('Черновик сохранён!', 'success');
            console.log('Черновик сохранён:', draftData);
        });
    }
    
    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('examReportDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                
                document.getElementById('examinerName').value = draftData.examinerName || '';
                document.getElementById('examinerId').value = draftData.examinerId || '';
                document.getElementById('candidateName').value = draftData.candidateName || '';
                document.getElementById('candidateId').value = draftData.candidateId || '';
                document.getElementById('secretPassword').value = draftData.secretPassword || '';
                
                const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
                categories.forEach(category => {
                    const input = document.querySelector(`input[name="${category}"]`);
                    if (input) input.value = draftData[category] || '';
                });
                
                const confirmationCheckbox = document.getElementById('confirmation');
                if (confirmationCheckbox) confirmationCheckbox.checked = draftData.confirmation || false;
                
                updateTotalScore();
                
                console.log('Черновик загружен');
                showNotification('Черновик загружен', 'info');
                
            } catch (error) {
                console.error('Ошибка загрузки черновика:', error);
            }
        }
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    function showSuccessMessage(reportId, discordResult, isLocal = false) {
        const message = document.createElement('div');
        const backgroundColor = isLocal ? '#f39c12' : '#2ecc71';
        const icon = isLocal ? '💾' : '✅';
        const title = isLocal ? 'Сохранено локально!' : 'Отчёт отправлен!';
        const description = isLocal ? 
            'Discord недоступен, отчёт сохранён локально' : 
            'Отчёт сохранён в архиве';
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
                    <p style="margin: 0; opacity: 0.9;">Номер отчёта: ${reportId}</p>
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
            const applications = JSON.parse(localStorage.getItem('examReports') || '[]');
            
            const application = {
                id: formData.reportId,
                type: 'exam_report',
                date: new Date().toLocaleString(),
                status: discordResult?.local ? 'local_saved' : 'pending',
                examinerName: formData.examinerName,
                examinerId: formData.examinerId,
                candidateName: formData.candidateName,
                candidateId: formData.candidateId,
                totalScore: formData.totalScore,
                discordThreadId: discordResult?.id || null,
                configVersion: formData.configVersion,
                buildId: discordResult?.buildId || 'local'
            };
            
            // Добавляем баллы
            const categories = ['basicLevel', 'constitution', 'proceduralCode', 'criminalCode', 'advocacyLaw'];
            categories.forEach(category => {
                application[category] = formData[category];
            });
            
            applications.push(application);
            localStorage.setItem('examReports', JSON.stringify(applications));
            localStorage.setItem('lastExamReport', JSON.stringify(application));
            
            console.log('Отчёт сохранён в хранилище:', application);
            
        } catch (error) {
            console.error('Ошибка сохранения в хранилище:', error);
        }
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    updateTotalScore();
    loadDraft();
    
    // Анимация появления формы
    setTimeout(() => {
        document.querySelectorAll('.minimal-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 100 * index);
        });
    }, 500);
    
    console.log('Форма отчёта инициализирована');
    console.log('Режим Discord:', discordWebhookUrl ? '✅ Настроен' : '❌ Не настроен (тестовый)');
    console.log('Версия конфига:', discordConfig?.version || 'test');
});

// ===== АНИМАЦИИ =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);