// JavaScript для формы старшего адвоката
document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма старшего адвоката загружена');
    
    // ===== НАСТРОЙКИ DISCORD =====
    const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1466132348943990886/uhgl4fKd8meIi5nTIiwT4Ig-JEyHil-vCdakZW5yaaPOBKHQ5n3R4uqjfGK_jrUyWrAl';
    
    // ===== ОТПРАВКА В DISCORD =====
    async function sendToDiscord(formData) {
        try {
            showNotification('Отправка заявки в Discord...', 'info');
            
            // Создаем embed сообщение
            const embed = {
                title: '📈 Заявка на повышение до Старшего адвоката',
                description: `**Заявитель:** ${formData.fullName}\n**Подтверждены обязанности:** ✅ Да\n<@&1321503127987421316>, <@&1321503135302291516>, <@&1371785937180426270>`,
                color: 0xd4af37, // Золотой цвет для старшего адвоката
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
                        name: '🎯 Тип заявки',
                        value: 'Повышение до Старшего адвоката',
                        inline: false
                    },
                    {
                        name: '✅ Подтверждение',
                        value: 'Заявитель ознакомлен с обязанностями и готов их выполнять',
                        inline: false
                    },
                    {
                        name: '📝 Статус',
                        value: '⏳ Ожидает собеседования',
                        inline: true
                    }
                ],
                footer: {
                    text: 'Адвокатское бюро Majestic RP | Старший адвокат',
                    icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                timestamp: new Date().toISOString()
            };
            
            // Подготавливаем данные для Discord
            const discordData = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: `Заявка на повышение -> : ${formData.fullName}`,
                embeds: [embed],
                content: `📢 **Заявка на повышение до Старшего адвоката!** <@${formData.specialCommId}> подает заявку на повышение.\n\n**Обязанности подтверждены ✅ Требуется собеседование.**`
            };
            
            // Отправляем запрос к Discord Webhook
            const response = await fetch(DISCORD_WEBHOOK_URL, {
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
            
            // Получаем результат
            let result = null;
            try {
                const responseText = await response.text();
                if (responseText && responseText.trim()) {
                    result = JSON.parse(responseText);
                } else {
                    result = {
                        success: true,
                        id: `senior-thread-${Date.now()}`,
                        message: 'Сообщение отправлено'
                    };
                }
            } catch (jsonError) {
                console.log('Discord вернул не-JSON ответ');
                result = {
                    success: true,
                    id: `senior-thread-${Date.now()}`,
                    message: 'Сообщение отправлено'
                };
            }
            
            console.log('Заявка успешно отправлена в Discord');
            return result;
            
        } catch (error) {
            console.error('Ошибка отправки в Discord:', error);
            
            // Если ошибка сети, сохраняем локально
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
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
    const form = document.getElementById('seniorAttorneyForm');
    const submitButton = document.getElementById('submitButton');
    
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
        
        // Проверка чекбокса согласия
        const confirmationCheckbox = document.getElementById('confirmation');
        if (!confirmationCheckbox.checked) {
            errors.push('• Необходимо подтвердить ознакомление с обязанностями');
        }
        
        // Если есть ошибки, показываем их
        if (errors.length > 0) {
            showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
            
            // Показываем подробные ошибки
            const modal = document.createElement('div');
            modal.className = 'notification-modal';
            
            modal.innerHTML = `
                <div class="notification-content">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                        <div style="font-size: 2rem; color: #ff6b6b;">⚠️</div>
                        <h3 style="margin: 0; color: #ff6b6b;">Ошибка отправки формы</h3>
                    </div>
                    <div style="text-align: left; margin-top: 10px;">
                        <strong>Обнаружены ошибки:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            ${errors.map(error => `<li style="margin-bottom: 5px;">${error}</li>`).join('')}
                        </ul>
                    </div>
                    <button onclick="this.closest('.notification-modal').remove()" 
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
        submitButton.innerHTML = '⏳ Отправка...';
        
        // Собираем данные формы
        const formData = {
            fullName: fullName,
            specialCommId: specialCommId,
            position: 'senior_attorney',
            timestamp: new Date().toISOString(),
            applicationId: `SENIOR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            confirmedDuties: true
        };
        
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
            
        } catch (error) {
            console.error('Ошибка отправки:', error);
            
            // Показываем сообщение об ошибке
            let errorMessage = 'Ошибка отправки заявки. ';
            
            if (error.message.includes('429')) {
                errorMessage += 'Слишком много запросов. Подождите немного.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage += 'Проблема с доступом к Discord.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                errorMessage += 'Проблема с интернет-соединением.';
            } else {
                errorMessage += 'Пожалуйста, попробуйте еще раз.';
            }
            
            showNotification(errorMessage, 'error');
            
        } finally {
            // Всегда разблокируем кнопку
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = '🚀 Отправить заявку на повышение';
            }, 2000);
        }
    });
    
    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    document.getElementById('saveDraftButton').addEventListener('click', function() {
        const draftData = {
            fullName: document.getElementById('fullName').value,
            specialCommId: document.getElementById('specialCommId').value,
            confirmedDuties: document.getElementById('confirmation').checked,
            timestamp: new Date().toLocaleString()
        };
        
        localStorage.setItem('seniorAttorneyDraft', JSON.stringify(draftData));
        localStorage.setItem('seniorDraftSaved', new Date().toLocaleString());
        
        showNotification('Черновик сохранён!', 'success');
        console.log('Черновик сохранён:', draftData);
    });
    
    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('seniorAttorneyDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                
                // Заполняем основные поля
                document.getElementById('fullName').value = draftData.fullName || '';
                document.getElementById('specialCommId').value = draftData.specialCommId || '';
                
                // Заполняем чекбокс
                if (draftData.confirmedDuties !== undefined) {
                    document.getElementById('confirmation').checked = draftData.confirmedDuties;
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
            'Заявка сохранена локально (Discord недоступен)' : 
            'С вами свяжутся для собеседования в течение 3-7 дней';
        
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
        `;
        
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${icon}</div>
                <div>
                    <h3 style="margin: 0 0 10px 0;">${title}</h3>
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
        const applications = JSON.parse(localStorage.getItem('applications') || '[]');
        
        const application = {
            id: formData.applicationId,
            type: 'senior_attorney_promotion',
            date: new Date().toLocaleString(),
            status: discordResult?.local ? 'local_saved' : 'pending_interview',
            fullName: formData.fullName,
            specialCommId: formData.specialCommId,
            confirmedDuties: formData.confirmedDuties,
            discordThreadId: discordResult?.id || null,
            notes: 'Требуется собеседование, обязанности подтверждены'
        };
        
        applications.push(application);
        localStorage.setItem('applications', JSON.stringify(applications));
        localStorage.setItem('lastSeniorApplication', JSON.stringify(application));
        
        console.log('Заявка сохранена в хранилище:', application);
    }
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
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
    
    console.log('Форма старшего адвоката инициализирована');
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