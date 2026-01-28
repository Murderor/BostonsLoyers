// JavaScript для формы вопроса
document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма вопроса загружена');
    
    // ===== НАСТРОЙКИ DISCORD =====
    const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1465718072823513274/7G5O9bao4TWMYzwcggviBuax6t8i-sMavDqT3s9Sbfq7MohsOn_m_PaCdh5BcQOpajht';
    
    // Категории вопросов для отображения
    const categoryLabels = {
        'consultation': 'Юридическая консультация',
        'procedure': 'Процедурные вопросы',
        'cooperation': 'Сотрудничество с адвокатурой',
        'complaint': 'Жалоба на адвоката',
        'vacancy': 'Вопросы по вакансиям',
        'other': 'Другое'
    };
    
    // ===== СЧЁТЧИК СИМВОЛОВ =====
    window.updateCharCounter = function(textarea) {
        const maxLength = 2000;
        const currentLength = textarea.value.length;
        const remaining = maxLength - currentLength;
        const counter = document.getElementById('charCounter');
        
        counter.textContent = `Осталось символов: ${remaining}`;
        
        // Меняем цвет в зависимости от количества символов
        if (remaining < 100) {
            counter.className = 'char-counter warning';
        } else if (remaining < 0) {
            counter.className = 'char-counter error';
        } else {
            counter.className = 'char-counter';
        }
    };
    
    window.resetCharCounter = function() {
        const counter = document.getElementById('charCounter');
        counter.textContent = 'Осталось символов: 2000';
        counter.className = 'char-counter';
    };
    
    // ===== ОТПРАВКА В DISCORD =====
    async function sendToDiscord(formData) {
        try {
            showNotification('Отправка вопроса в Discord...', 'info');
            
            // Обрезаем длинный текст вопроса
            let questionText = formData.questionText;
            if (questionText.length > 1000) {
                questionText = questionText.substring(0, 1000) + '...';
            }
            
            // Создаем embed сообщение
            const embed = {
                title: '❓ Новый вопрос адвокатуре',
                description: `**Категория:** ${categoryLabels[formData.questionCategory] || 'Не указана'}`,
                color: 0x3498db, // Синий цвет для вопросов
                fields: [
                    {
                        name: '👤 От кого',
                        value: formData.fullName,
                        inline: true
                    },
                    {
                        name: '📞 ID для ответа',
                        value: `<@${formData.specialCommId}>`,
                        inline: true
                    },
                    {
                        name: '📋 Номер вопроса',
                        value: formData.questionId,
                        inline: true
                    },
                    {
                        name: '📅 Дата вопроса',
                        value: new Date(formData.timestamp).toLocaleString('ru-RU'),
                        inline: true
                    },
                    {
                        name: '📁 Категория',
                        value: categoryLabels[formData.questionCategory] || 'Не указана',
                        inline: true
                    },
                    {
                        name: '⏱️ Срочность',
                        value: 'Обычный вопрос',
                        inline: true
                    },
                    {
                        name: '📝 Вопрос',
                        value: questionText || 'Текст вопроса не указан',
                        inline: false
                    },
                    {
                        name: '📝 Статус',
                        value: '⏳ Ожидает ответа',
                        inline: true
                    }
                ],
                footer: {
                    text: 'Адвокатское бюро Majestic RP | Форма вопросов',
                    icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                timestamp: new Date().toISOString()
            };
            
            // Если текст вопроса длинный, создаем второй embed
            const embeds = [embed];
            
            if (formData.questionText.length > 1000) {
                const secondPart = formData.questionText.substring(1000);
                if (secondPart.length > 0) {
                    const secondEmbed = {
                        title: '📝 Вопрос (продолжение)',
                        description: secondPart.substring(0, 4000) + (secondPart.length > 4000 ? '...' : ''),
                        color: 0x2ecc71,
                        footer: {
                            text: 'Продолжение вопроса'
                        }
                    };
                    embeds.push(secondEmbed);
                }
            }
            
            // Подготавливаем данные для Discord
            const discordData = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: `Вопрос от ${formData.fullName}`,
                embeds: embeds,
                content: `❓ **Новый вопрос адвокатуре!** <@${formData.specialCommId}> задал(а) вопрос.\n\n**Категория:** ${categoryLabels[formData.questionCategory] || 'Не указана'}\n**Требуется ответ в течение 24 часов.**`
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
                        id: `question-thread-${Date.now()}`,
                        message: 'Вопрос отправлен'
                    };
                }
            } catch (jsonError) {
                console.log('Discord вернул не-JSON ответ');
                result = {
                    success: true,
                    id: `question-thread-${Date.now()}`,
                    message: 'Вопрос отправлен'
                };
            }
            
            console.log('Вопрос успешно отправлен в Discord');
            return result;
            
        } catch (error) {
            console.error('Ошибка отправки в Discord:', error);
            
            // Если ошибка сети, сохраняем локально
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                console.log('Discord недоступен, сохраняем локально');
                return {
                    success: true,
                    id: `local-save-${Date.now()}`,
                    message: 'Вопрос сохранён локально (Discord недоступен)',
                    local: true
                };
            }
            
            throw error;
        }
    }
    
    // ===== ВАЛИДАЦИЯ ФОРМЫ =====
    const form = document.getElementById('questionForm');
    const submitButton = document.getElementById('submitButton');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Проверяем обязательные поля
        const errors = [];
        
        // Проверка имени
        const fullName = document.getElementById('fullName').value.trim();
        if (!fullName) {
            errors.push('• Введите ваше имя');
        } else if (fullName.length < 2) {
            errors.push('• Имя должно содержать минимум 2 символа');
        }
        
        // Проверка ID спецсвязи
        const specialCommId = document.getElementById('specialCommId').value;
        if (!/^\d{17,20}$/.test(specialCommId)) {
            errors.push('• ID Discord должен содержать 17-20 цифр');
        }
        
        // Проверка категории
        const questionCategory = document.getElementById('questionCategory').value;
        if (!questionCategory) {
            errors.push('• Выберите категорию вопроса');
        }
        
        // Проверка текста вопроса
        const questionText = document.getElementById('questionText').value.trim();
        if (!questionText) {
            errors.push('• Опишите ваш вопрос');
        } else if (questionText.length < 10) {
            errors.push('• Вопрос должен содержать минимум 10 символов');
        } else if (questionText.length > 2000) {
            errors.push('• Вопрос не должен превышать 2000 символов');
        }
        
        // Проверка чекбокса согласия
        const confirmationCheckbox = document.getElementById('confirmation');
        if (!confirmationCheckbox.checked) {
            errors.push('• Необходимо подтвердить согласие на обработку данных');
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
            questionCategory: questionCategory,
            questionText: questionText,
            timestamp: new Date().toISOString(),
            questionId: `Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        };
        
        try {
            // Отправляем в Discord
            const discordResult = await sendToDiscord(formData);
            
            // Показываем успешное сообщение
            if (discordResult.local) {
                showSuccessMessage(formData.questionId, discordResult, true);
            } else {
                showSuccessMessage(formData.questionId, discordResult);
            }
            
            // Сохраняем данные в localStorage
            saveQuestionToStorage(formData, discordResult);
            
            // Очищаем форму
            form.reset();
            resetCharCounter();
            
        } catch (error) {
            console.error('Ошибка отправки:', error);
            
            // Показываем сообщение об ошибке
            let errorMessage = 'Ошибка отправки вопроса. ';
            
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
                submitButton.innerHTML = '📤 Отправить вопрос';
            }, 2000);
        }
    });
    
    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    document.getElementById('saveDraftButton').addEventListener('click', function() {
        const draftData = {
            fullName: document.getElementById('fullName').value,
            specialCommId: document.getElementById('specialCommId').value,
            questionCategory: document.getElementById('questionCategory').value,
            questionText: document.getElementById('questionText').value,
            confirmed: document.getElementById('confirmation').checked,
            timestamp: new Date().toLocaleString()
        };
        
        localStorage.setItem('questionDraft', JSON.stringify(draftData));
        localStorage.setItem('questionDraftSaved', new Date().toLocaleString());
        
        showNotification('Черновик вопроса сохранён!', 'success');
        console.log('Черновик вопроса сохранён:', draftData);
    });
    
    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('questionDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                
                // Заполняем основные поля
                document.getElementById('fullName').value = draftData.fullName || '';
                document.getElementById('specialCommId').value = draftData.specialCommId || '';
                document.getElementById('questionCategory').value = draftData.questionCategory || '';
                document.getElementById('questionText').value = draftData.questionText || '';
                
                // Обновляем счётчик символов
                updateCharCounter(document.getElementById('questionText'));
                
                // Заполняем чекбокс
                if (draftData.confirmed !== undefined) {
                    document.getElementById('confirmation').checked = draftData.confirmed;
                }
                
                console.log('Черновик вопроса загружен');
                showNotification('Черновик загружен', 'info');
                
            } catch (error) {
                console.error('Ошибка загрузки черновика:', error);
            }
        }
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    function showSuccessMessage(questionId, discordResult, isLocal = false) {
        const message = document.createElement('div');
        const backgroundColor = isLocal ? '#f39c12' : '#2ecc71';
        const icon = isLocal ? '💾' : '✅';
        const title = isLocal ? 'Вопрос сохранён!' : 'Вопрос отправлен!';
        const description = isLocal ? 
            'Вопрос сохранён локально (Discord недоступен)' : 
            'Ответим в течение 24 часов';
        
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
                    <p style="margin: 0; opacity: 0.9;">Номер вопроса: ${questionId}</p>
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
    
    function saveQuestionToStorage(formData, discordResult) {
        const questions = JSON.parse(localStorage.getItem('questions') || '[]');
        
        const question = {
            id: formData.questionId,
            type: 'question',
            date: new Date().toLocaleString(),
            status: discordResult?.local ? 'local_saved' : 'awaiting_response',
            fullName: formData.fullName,
            specialCommId: formData.specialCommId,
            category: formData.questionCategory,
            categoryLabel: categoryLabels[formData.questionCategory],
            questionText: formData.questionText.substring(0, 100) + (formData.questionText.length > 100 ? '...' : ''),
            discordThreadId: discordResult?.id || null,
            responseTime: '24 часа'
        };
        
        questions.push(question);
        localStorage.setItem('questions', JSON.stringify(questions));
        localStorage.setItem('lastQuestion', JSON.stringify(question));
        
        console.log('Вопрос сохранён в хранилище:', question);
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
    
    console.log('Форма вопроса инициализирована');
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