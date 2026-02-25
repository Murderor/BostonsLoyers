document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма адвоката с загрузкой изображений загружена');

    // ===== ПРОВЕРКА И ЗАГРУЗКА КОНФИГА DISCORD =====
    let discordWebhookUrl = null;
    let discordConfig = null;

    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' && 
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        console.log('✅ Discord Config загружен');
    } else if (window.DISCORD_WEBHOOK_URL && window.DISCORD_WEBHOOK_URL.includes('discord.com')) {
        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;
        console.log('✅ Discord Config загружен из window');
    } else {
        console.warn('⚠️ Discord вебхук не настроен. Тестовый режим.');
        showNotification('⚠️ Discord вебхук не настроен. Заявки будут сохраняться локально.', 'warning');
    }

    // ===== ОБРАБОТКА ВЫБОРА ИЗОБРАЖЕНИЯ =====
    window.handleImageSelect = function(input, index) {
        const file = input.files[0];
        const previewDiv = document.getElementById(`preview${index}`);
        const previewImg = previewDiv.querySelector('img');
        
        if (file) {
            // Проверка типа файла
            if (!file.type.startsWith('image/')) {
                showNotification('Файл должен быть изображением', 'error');
                input.value = '';
                previewDiv.style.display = 'none';
                updateImagesCounter();
                return;
            }
            // Проверка размера (8 МБ)
            if (file.size > 8 * 1024 * 1024) {
                showNotification('Размер файла не должен превышать 8 МБ', 'error');
                input.value = '';
                previewDiv.style.display = 'none';
                updateImagesCounter();
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewDiv.style.display = 'flex';
                updateImagesCounter();
            };
            reader.readAsDataURL(file);
        } else {
            previewDiv.style.display = 'none';
            previewImg.src = '#';
            updateImagesCounter();
        }
    };

    window.removeImage = function(index) {
        const input = document.getElementById(`callImage${index}`);
        const previewDiv = document.getElementById(`preview${index}`);
        if (input) {
            input.value = '';
            previewDiv.style.display = 'none';
            previewDiv.querySelector('img').src = '#';
            updateImagesCounter();
        }
    };

    // ===== ОБНОВЛЕНИЕ СЧЁТЧИКА ИЗОБРАЖЕНИЙ =====
    function updateImagesCounter() {
        let filledCount = 0;
        for (let i = 1; i <= 3; i++) {
            const input = document.getElementById(`callImage${i}`);
            if (input && input.files.length > 0) filledCount++;
        }
        
        const counterElement = document.getElementById('imagesCount');
        if (counterElement) counterElement.textContent = filledCount;
        
        const statsCounter = document.querySelector('.stats-counter');
        if (statsCounter) {
            statsCounter.style.border = filledCount === 3 ? '1px solid var(--color-accent)' : '';
            statsCounter.style.backgroundColor = filledCount === 3 ? 'rgba(212, 175, 55, 0.1)' : '';
        }
    }

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

    // ===== ОТПРАВКА В DISCORD (С ФАЙЛАМИ) =====
    async function sendToDiscord(formData, files) {
        const isDiscordAvailable = discordWebhookUrl ? await checkDiscordAvailability() : false;
        
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
            
            // Подготовка embed
            const discordRoles = discordConfig?.roles ? 
                `${discordConfig.roles.main}, ${discordConfig.roles.secondary}, ${discordConfig.roles.tertiary}` :
                '<@&1321503127987421316>, <@&1321503135302291516>, <@&1371785937180426270>';

            const mainEmbed = {
                title: '📈 Заявка на повышение до Адвоката',
                description: `**Заявитель:** ${formData.fullName}\n**Повышение с должности:** Младший адвокат → Адвокат\n\n${discordRoles}`,
                color: 0x3498db,
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
                        name: '🖼️ Скриншоты вызовов',
                        value: 'Прикреплены к сообщению (3 файла)',
                        inline: true
                    },
                    {
                        name: '🎓 Подтверждение устного экзамена',
                        value: formData.examLink ? `[Ссылка на результат](${formData.examLink})` : 'Не указано',
                        inline: false
                    }
                ],
                footer: {
                    text: `Адвокатское бюро Majestic RP | Форма повышения | v${discordConfig?.version || '1.0'}`,
                    icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                timestamp: new Date().toISOString()
            };

            // Создаём FormData для multipart-запроса
            const formDataToSend = new FormData();
            
            // Добавляем файлы
            for (let i = 0; i < files.length; i++) {
                formDataToSend.append(`files[${i}]`, files[i], `call_${i+1}.png`);
            }
            
            // Добавляем payload_json с embed
            const payload = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                content: `📢 **Новая заявка на повышение!** <@${formData.specialCommId}> подает заявку на повышение до Адвоката.\n\n**Скриншоты вызовов прикреплены к сообщению.**`,
                embeds: [mainEmbed]
            };
            formDataToSend.append('payload_json', JSON.stringify(payload));

            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                body: formDataToSend
            });

            if (!response.ok) {
                let errorMessage = `Ошибка Discord (${response.status})`;
                try {
                    const errorText = await response.text();
                    if (errorText) errorMessage += `: ${errorText}`;
                } catch (e) {}
                throw new Error(errorMessage);
            }

            let result = null;
            try {
                const responseText = await response.text();
                result = responseText ? JSON.parse(responseText) : { success: true, id: `thread-${Date.now()}` };
            } catch {
                result = { success: true, id: `thread-${Date.now()}` };
            }

            console.log('Заявка успешно отправлена в Discord');
            return result;

        } catch (error) {
            console.error('Ошибка отправки в Discord:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
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

    // ===== ВАЛИДАЦИЯ ФОРМЫ ПЕРЕД ОТПРАВКОЙ =====
    const form = document.getElementById('attorneyForm');
    const submitButton = document.getElementById('submitButton');

    if (form && submitButton) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const errors = [];

            // Проверка имени
            const fullName = document.getElementById('fullName').value.trim();
            if (!fullName) errors.push('• Введите ваше полное имя');

            // Проверка ID спецсвязи
            const specialCommId = document.getElementById('specialCommId').value;
            if (!/^\d{17,20}$/.test(specialCommId)) {
                errors.push('• ID спецсвязи должен содержать 17-20 цифр');
            }

            // Проверка изображений (3 шт.)
            const imageFiles = [];
            for (let i = 1; i <= 3; i++) {
                const input = document.getElementById(`callImage${i}`);
                if (!input || !input.files || input.files.length === 0) {
                    errors.push(`• Загрузите скриншот для вызова #${i}`);
                } else {
                    const file = input.files[0];
                    if (!file.type.startsWith('image/')) {
                        errors.push(`• Файл для вызова #${i} должен быть изображением`);
                    } else if (file.size > 8 * 1024 * 1024) {
                        errors.push(`• Файл для вызова #${i} превышает 8 МБ`);
                    } else {
                        imageFiles.push(file);
                    }
                }
            }

            // Проверка ссылки на экзамен
            const examLink = document.getElementById('examLink')?.value.trim();
            if (!examLink) {
                errors.push('• Вставьте ссылку на подтверждение устного экзамена');
            } else {
                try {
                    new URL(examLink);
                } catch {
                    errors.push('• Ссылка на экзамен некорректна');
                }
            }

            // Проверка соглашения
            const confirmationCheckbox = document.getElementById('confirmation');
            if (!confirmationCheckbox || !confirmationCheckbox.checked) {
                errors.push('• Необходимо подтвердить согласие с правилами');
            }

            if (errors.length > 0) {
                showNotification('Пожалуйста, исправьте ошибки в форме:\n' + errors.join('\n'), 'error');
                return;
            }

            // Блокируем кнопку
            submitButton.disabled = true;
            submitButton.innerHTML = '⏳ Отправка в Discord...';

            // Собираем данные
            const formData = {
                fullName,
                specialCommId,
                examLink,
                timestamp: new Date().toISOString(),
                applicationId: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                configVersion: discordConfig?.version || 'test'
            };

            try {
                const discordResult = await sendToDiscord(formData, imageFiles);
                
                if (discordResult.local) {
                    showSuccessMessage(formData.applicationId, discordResult, true);
                } else {
                    showSuccessMessage(formData.applicationId, discordResult);
                }

                saveApplicationToStorage(formData, discordResult);
                form.reset();
                // Скрыть все превью
                for (let i = 1; i <= 3; i++) {
                    document.getElementById(`preview${i}`).style.display = 'none';
                }
                updateImagesCounter();
                document.getElementById('examFilled').innerHTML = '❌ не заполнено';
                document.getElementById('examFilled').style.color = '#e74c3c';
                document.getElementById('examValidation').className = 'link-validation';

            } catch (error) {
                console.error('Ошибка отправки:', error);
                let errorMessage = 'Ошибка отправки заявки. ';
                if (error.message.includes('429')) {
                    errorMessage += 'Слишком много запросов. Подождите немного.';
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    errorMessage += 'Проблема с доступом к Discord. Проверьте webhook URL.';
                } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                    errorMessage += 'Проблема с интернет-соединением.';
                } else {
                    errorMessage += 'Пожалуйста, попробуйте еще раз.';
                }
                showNotification(errorMessage, 'error');
            } finally {
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
                examLink: document.getElementById('examLink')?.value || '',
                timestamp: new Date().toLocaleString()
            };
            // Файлы не сохраняем в черновике
            const confirmation = document.getElementById('confirmation');
            if (confirmation) draftData.confirmation = confirmation.checked;
            
            localStorage.setItem('attorneyDraft', JSON.stringify(draftData));
            localStorage.setItem('draftSaved', new Date().toLocaleString());
            showNotification('Черновик сохранён (без скриншотов)!', 'success');
        });
    }

    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('attorneyDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                document.getElementById('fullName').value = draftData.fullName || '';
                document.getElementById('specialCommId').value = draftData.specialCommId || '';
                document.getElementById('examLink').value = draftData.examLink || '';
                if (draftData.examLink) validateExamLink(document.getElementById('examLink'));
                
                const confirmation = document.getElementById('confirmation');
                if (confirmation && draftData.confirmation !== undefined) {
                    confirmation.checked = draftData.confirmation;
                }
                showNotification('Черновик загружен (скриншоты нужно выбрать заново)', 'info');
            } catch (error) {
                console.error('Ошибка загрузки черновика:', error);
            }
        }
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    window.validateExamLink = function(input) {
        const validation = document.getElementById('examValidation');
        const examStatus = document.getElementById('examFilled');
        const url = input.value.trim();
        
        if (!url) {
            validation.className = 'link-validation';
            examStatus.innerHTML = '❌ не заполнено';
            examStatus.style.color = '#e74c3c';
            return;
        }
        
        try {
            new URL(url);
            validation.textContent = '✅ Корректная ссылка';
            validation.className = 'link-validation valid';
            examStatus.innerHTML = '✅ заполнено';
            examStatus.style.color = '#2ecc71';
        } catch (e) {
            validation.textContent = '❌ Некорректная ссылка';
            validation.className = 'link-validation invalid';
            examStatus.innerHTML = '❌ ошибка в ссылке';
            examStatus.style.color = '#e74c3c';
        }
    };

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
                    <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">${description}</p>
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
        const colors = { success: '#2ecc71', error: '#e74c3c', info: '#3498db', warning: '#f39c12' };
        const icon = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        
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
        
        notification.innerHTML = `<div style="font-size: 1.5rem;">${icon[type]}</div><div>${text}</div>`;
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
                type: 'attorney_promotion',
                date: new Date().toLocaleString(),
                status: discordResult?.local ? 'local_saved' : 'pending',
                fullName: formData.fullName,
                specialCommId: formData.specialCommId,
                discordThreadId: discordResult?.id || null,
                examLink: formData.examLink,
                configVersion: formData.configVersion,
                buildId: discordResult?.buildId || 'local'
            };
            applications.push(application);
            localStorage.setItem('applications', JSON.stringify(applications));
            localStorage.setItem('lastApplication', JSON.stringify(application));
            console.log('Заявка сохранена в хранилище:', application);
        } catch (error) {
            console.error('Ошибка сохранения в хранилище:', error);
        }
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    updateImagesCounter();
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

    console.log('Форма адвоката с изображениями инициализирована');
});

// CSS анимации (добавьте в head, если ещё нет)
if (!document.getElementById('dynamicFormStyles')) {
    const style = document.createElement('style');
    style.id = 'dynamicFormStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}