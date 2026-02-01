// JavaScript для формы младшего адвоката
document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма младшего адвоката загружена');
    
    // ===== ПРОВЕРКА И ЗАГРУЗКА КОНФИГА DISCORD =====
    let discordWebhookUrl = null;
    let discordConfig = null;
    
    // Проверяем, загружен ли конфиг из внешнего файла
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' && 
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        
        console.log('✅ Discord Config загружен для формы младшего адвоката');
        console.log('📅 Версия конфига:', discordConfig?.version || 'неизвестна');
        
    } else if (window.DISCORD_WEBHOOK_URL && 
               window.DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;
        
        console.log('✅ Discord Config загружен из window');
        
    } else {
        // Показываем предупреждение о тестовом режиме
        console.warn('⚠️ Discord вебхук не настроен для формы младшего адвоката. Тестовый режим.');
        
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
                <small>Для работы формы младшего адвоката необходимо:</small><br>
                1. Добавить секрет DISCORD_WEBHOOK_URL в GitHub Secrets<br>
                2. Запустить GitHub Actions workflow<br>
                <small style="opacity: 0.8;">Форма будет сохранять заявки локально до настройки</small>
            </div>
        `;
        
        const form = document.querySelector('.form-section') || document.body;
        form.prepend(warning);
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
            console.log('Discord недоступен для формы младшего адвоката:', error.name);
            return false;
        }
    }
    
    // ===== ЛОКАЛЬНАЯ БАЗА ВОПРОСОВ =====
    const questionsDatabase = [
        // ... (все вопросы остаются без изменений)
        {
            "id": 1,
            "question": "Какие принципы, закрепленные в Разделе I УК, являются вашими главными союзниками при построении защиты и оспаривании действий обвинения?",
            "category": "УК. Общая часть. Принципы"
        },
        // ... (все остальные вопросы)
    ];
    
    // ===== УПРАВЛЕНИЕ ФОТОГРАФИЯМИ =====
    const photoFields = {
        idCard: {
            uploadArea: document.getElementById('idCardUpload'),
            preview: document.getElementById('idCardPreview'),
            input: document.getElementById('idCard'),
            field: document.getElementById('idCardField'),
            file: null
        },
        statesRole: {
            uploadArea: document.getElementById('statesUpload'),
            preview: document.getElementById('statesPreview'),
            input: document.getElementById('statesRole'),
            field: document.getElementById('statesField'),
            file: null
        }
    };
    
    let uploadedPhotos = 0;
    const photoCountElement = document.getElementById('photoCount');
    
    // Обновление счетчика фото
    function updatePhotoCount() {
        uploadedPhotos = 0;
        Object.values(photoFields).forEach(field => {
            if (field.file) uploadedPhotos++;
        });
        photoCountElement.textContent = uploadedPhotos;
        
        // Подсветка заполненных полей
        Object.values(photoFields).forEach(field => {
            if (field.file) {
                field.field.classList.add('active');
            } else {
                field.field.classList.remove('active');
            }
        });
    }
    
    // Функция загрузки фото
    function loadPhoto(fieldId, file) {
        const field = photoFields[fieldId];
        if (!field) return;
        
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showNotification('Пожалуйста, загружайте только изображения!', 'error');
            return;
        }
        
        // Проверка размера (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Размер файла не должен превышать 5MB!', 'error');
            return;
        }
        
        // Удаляем старое фото, если есть
        if (field.file) {
            field.file = null;
        }
        
        field.file = file;
        
        // Показываем превью
        const reader = new FileReader();
        reader.onload = function(e) {
            field.preview.innerHTML = `<img src="${e.target.result}" alt="Превью">`;
            field.preview.style.display = 'block';
            field.uploadArea.querySelector('.upload-placeholder').style.display = 'none';
            field.uploadArea.querySelector('.upload-text').style.display = 'none';
            field.uploadArea.querySelector('.upload-hint').style.display = 'none';
        };
        reader.readAsDataURL(file);
        
        updatePhotoCount();
        console.log(`Фото загружено в поле ${fieldId}: ${file.name}`);
    }
    
    // Функция очистки фото
    window.clearPhoto = function(fieldId) {
        const field = photoFields[fieldId];
        if (!field) return;
        
        field.file = null;
        field.input.value = '';
        field.preview.innerHTML = '';
        field.preview.style.display = 'none';
        field.uploadArea.querySelector('.upload-placeholder').style.display = 'block';
        field.uploadArea.querySelector('.upload-text').style.display = 'block';
        field.uploadArea.querySelector('.upload-hint').style.display = 'block';
        field.field.classList.remove('active');
        
        updatePhotoCount();
    };
    
    // Очистка всех фото
    window.clearAllPhotos = function() {
        Object.keys(photoFields).forEach(fieldId => {
            clearPhoto(fieldId);
        });
        showNotification('Все фото очищены', 'info');
    };
    
    // Настройка drag & drop для всех полей
    Object.keys(photoFields).forEach(fieldId => {
        const field = photoFields[fieldId];
        
        // Клик по области загрузки
        field.uploadArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('photo-control')) return;
            field.input.click();
        });
        
        // Изменение input файла
        field.input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadPhoto(fieldId, file);
            }
        });
        
        // Drag & drop
        field.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            field.uploadArea.classList.add('dragover');
        });
        
        field.uploadArea.addEventListener('dragleave', () => {
            field.uploadArea.classList.remove('dragover');
        });
        
        field.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            field.uploadArea.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                loadPhoto(fieldId, file);
            }
        });
        
        // Вставка через Ctrl+V
        field.uploadArea.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        loadPhoto(fieldId, file);
                        showNotification('Фото вставлено из буфера обмена', 'success');
                        break;
                    }
                }
            }
        });
    });
    
    // ===== ЗАГРУЗКА СЛУЧАЙНЫХ ВОПРОСОВ =====
    function loadExamQuestions() {
        try {
            // Выбираем 10 случайных уникальных вопросов
            const selectedQuestions = [];
            const availableQuestions = [...questionsDatabase];
            
            // Перемешиваем вопросы
            for (let i = availableQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
            }
            
            // Берем первые 10
            for (let i = 0; i < Math.min(10, availableQuestions.length); i++) {
                selectedQuestions.push(availableQuestions[i]);
            }
            
            // Генерируем HTML для вопросов
            const examContainer = document.getElementById('examQuestions');
            examContainer.innerHTML = '';
            
            selectedQuestions.forEach((question, index) => {
                const questionElement = document.createElement('div');
                questionElement.className = 'exam-question';
                questionElement.innerHTML = `
                    <div>
                        <span class="question-number">${index + 1}</span>
                        <span class="question-category">${question.category}</span>
                    </div>
                    <div class="question-text">${question.question}</div>
                    <textarea 
                        name="answer_${question.id}" 
                        class="form-control" 
                        rows="4" 
                        placeholder="Введите ваш ответ здесь (минимум 50 символов)..."
                        required
                        minlength="50"
                        data-question-id="${question.id}"
                        oninput="updateAnswerCounter(this)"
                    ></textarea>
                    <div class="answer-counter" style="text-align: right; margin-top: 5px; color: #a0a8c0; font-size: 0.85rem;">
                        Символов: <span id="counter_${question.id}">0</span>/50
                    </div>
                `;
                
                examContainer.appendChild(questionElement);
            });
            
            // Инициализируем счетчики
            updateAllAnswerCounters();
            
            console.log(`Загружено ${selectedQuestions.length} случайных вопросов из базы (всего: ${questionsDatabase.length})`);
            
        } catch (error) {
            console.error('Ошибка загрузки вопросов:', error);
            document.getElementById('examQuestions').innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px; color: #ff6b6b;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                    <h3>Ошибка загрузки вопросов</h3>
                    <p>Пожалуйста, обновите страницу</p>
                    <button onclick="location.reload()" class="button" style="margin-top: 20px;">
                        Обновить страницу
                    </button>
                </div>
            `;
        }
    }
    
    // Функция обновления счетчика символов
    window.updateAnswerCounter = function(textarea) {
        const questionId = textarea.dataset.questionId;
        const counter = document.getElementById(`counter_${questionId}`);
        const length = textarea.value.length;
        
        if (counter) {
            counter.textContent = length;
            
            if (length < 50) {
                counter.style.color = '#ff6b6b';
                textarea.style.borderColor = '#ff6b6b';
            } else {
                counter.style.color = '#2ecc71';
                textarea.style.borderColor = '';
            }
        }
    };
    
    // Обновление всех счетчиков
    function updateAllAnswerCounters() {
        document.querySelectorAll('textarea[data-question-id]').forEach(textarea => {
            const length = textarea.value.length;
            const questionId = textarea.dataset.questionId;
            const counter = document.getElementById(`counter_${questionId}`);
            
            if (counter) {
                counter.textContent = length;
                if (length < 50) {
                    counter.style.color = '#ff6b6b';
                } else {
                    counter.style.color = '#2ecc71';
                }
            }
        });
    }
    
    // ===== ОТПРАВКА В DISCORD =====
    async function sendToDiscord(formData, photoFiles) {
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
            
            // Роли из конфига или дефолтные
            const discordRoles = discordConfig?.roles ? 
                `${discordConfig.roles.main}, ${discordConfig.roles.secondary}, ${discordConfig.roles.tertiary}` :
                '<@&1321503127987421316>, <@&1321503135302291516>, <@&1321503135302291516>';
            
            // Подготавливаем данные для Discord
            const discordData = {
                username: 'Секретарь Авокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: `Аккредитация: ${formData.fullName} (Младший адвокат)`,
                embeds: [
                    {
                        title: '📋 Новая заявка на аккредитацию',
                        description: `**Младший адвокат**\n${formData.fullName} подал заявку на аккредитацию\n${discordRoles}`,
                        color: 0xd4af37, // Золотой цвет
                        fields: [
                            {
                                name: '👤 Заявитель',
                                value: formData.fullName,
                                inline: true
                            },
                            {
                                name: '📞 ID спецсвязи',
                                value: `<@${formData.specialCommId}>`,
                                inline: true
                            },
                            {
                                name: '📋 ID заявки',
                                value: formData.applicationId,
                                inline: true
                            },
                            {
                                name: '🕐 Дата подачи',
                                value: new Date(formData.timestamp).toLocaleString('ru-RU'),
                                inline: true
                            },
                            {
                                name: '📷 Документы',
                                value: photoFiles.idCard ? '✅ Удостоверение\n' : '❌ Удостоверение\n' + 
                                       (photoFiles.statesRole ? '✅ STATES' : '❌ STATES'),
                                inline: true
                            },
                            {
                                name: '📊 Версия конфига',
                                value: discordConfig?.version || 'тестовая',
                                inline: true
                            }
                        ],
                        footer: {
                            text: `Адвокатское бюро Majestic RP | Автоматическая система | v${discordConfig?.version || '1.0'}`,
                            icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                        },
                        timestamp: new Date().toISOString()
                    }
                ],
                content: `📢 **Новая заявка!** <@${formData.specialCommId}> подал заявку на аккредитацию младшего адвоката.\n\n**📋 Ответы на вопросы:**`
            };
            
            // Форматируем ответы на вопросы
            let answersText = '';
            Object.keys(formData.answers).forEach((questionId, index) => {
                const question = questionsDatabase.find(q => q.id == questionId);
                const answer = formData.answers[questionId];
                
                if (question && answer) {
                    // Обрезаем длинные ответы
                    const shortAnswer = answer.length > 500 ? answer.substring(0, 500) + '...' : answer;
                    answersText += `\n\n**${index + 1}. ${question.question}**\n${shortAnswer}`;
                }
            });
            
            // Добавляем второе сообщение с ответами на вопросы
            discordData.embeds.push({
                title: '📝 Ответы на экзаменационные вопросы',
                description: answersText.length > 4000 ? answersText.substring(0, 4000) + '...' : answersText,
                color: 0x3498db,
                footer: {
                    text: 'Полные ответы доступны в прикрепленных файлах'
                }
            });
            
            // Подготавливаем FormData для отправки файлов
            const discordFormData = new FormData();
            
            // Добавляем JSON данные
            discordFormData.append('payload_json', JSON.stringify(discordData));
            
            // Добавляем фото, если есть
            let fileIndex = 0;
            if (photoFiles.idCard) {
                discordFormData.append(`files[${fileIndex}]`, photoFiles.idCard, 'удостоверение.jpg');
                fileIndex++;
            }
            if (photoFiles.statesRole) {
                discordFormData.append(`files[${fileIndex}]`, photoFiles.statesRole, 'states_role.jpg');
                fileIndex++;
            }
            
            // Добавляем текстовый файл с полными ответами
            const fullAnswersText = `ПОЛНЫЕ ОТВЕТЫ НА ВОПРОСЫ\nЗаявитель: ${formData.fullName}\nID: ${formData.applicationId}\nВерсия: ${formData.configVersion}\n\n` +
                                  Object.keys(formData.answers).map((questionId, index) => {
                                      const question = questionsDatabase.find(q => q.id == questionId);
                                      return `ВОПРОС ${index + 1} [${question?.category || 'Без категории'}]:\n${question?.question || 'Неизвестный вопрос'}\n\nОТВЕТ:\n${formData.answers[questionId]}\n\n────────────────────\n`;
                                  }).join('\n');
            
            const answersBlob = new Blob([fullAnswersText], { type: 'text/plain' });
            discordFormData.append(`files[${fileIndex}]`, answersBlob, 'полные_ответы.txt');
            
            // Отправляем запрос к Discord Webhook
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                body: discordFormData
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
            
            // Получаем ID созданной ветки
            const threadId = result.id;
            if (threadId) {
                // Отправляем второе сообщение с соглашениями
                const agreementsText = '✅ **Соглашения заявителя:**\n' +
                                    '• Подтверждена достоверность документов\n' +
                                    '• Согласен на проверку данных\n' +
                                    '• Готов оплатить взнос $25,000\n' +
                                    '• Ознакомлен с правилами бюро';
                
                await sendFollowupMessage(threadId, agreementsText);
            }
            
            console.log('Заявка успешно отправлена в Discord:', result);
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
    
    // Функция для отправки дополнительного сообщения
    async function sendFollowupMessage(threadId, content) {
        try {
            // Для отправки в существующую ветку нужно использовать thread_id параметр
            const followupData = {
                content: content,
                thread_id: threadId
            };
            
            const response = await fetch(discordWebhookUrl + '?wait=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(followupData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка отправки дополнительного сообщения:', error);
        }
    }
    
    // ===== ВАЛИДАЦИЯ ФОРМЫ =====
    const form = document.getElementById('juniorForm');
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
        
        // Проверка фото
        if (!photoFields.idCard.file) {
            errors.push('• Загрузите ксерокопию удостоверения личности');
        }
        
        if (!photoFields.statesRole.file) {
            errors.push('• Загрузите скриншот роли в STATES');
        }
        
        // Проверка ответов на вопросы
        const textareas = form.querySelectorAll('textarea[data-question-id]');
        let invalidAnswers = [];
        
        textareas.forEach((textarea, index) => {
            if (textarea.value.length < 50) {
                invalidAnswers.push(index + 1);
                textarea.style.borderColor = '#ff6b6b';
            }
        });
        
        if (invalidAnswers.length > 0) {
            errors.push(`• Ответы на вопросы №${invalidAnswers.join(', ')} должны содержать минимум 50 символов`);
        }
        
        // Проверка соглашений
        const requiredCheckboxes = ['confidentiality', 'agreement', 'rules'];
        requiredCheckboxes.forEach(id => {
            if (!document.getElementById(id).checked) {
                errors.push(`• Необходимо согласиться с "${document.querySelector(`label[for="${id}"]`).textContent.trim()}"`);
            }
        });
        
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
            position: 'junior_attorney',
            timestamp: new Date().toISOString(),
            applicationId: `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            configVersion: discordConfig?.version || 'test',
            answers: {}
        };
        
        // Добавляем ответы на вопросы
        textareas.forEach((textarea) => {
            const questionId = textarea.name.replace('answer_', '');
            formData.answers[questionId] = textarea.value;
        });
        
        try {
            // Отправляем в Discord
            const discordResult = await sendToDiscord(formData, {
                idCard: photoFields.idCard.file,
                statesRole: photoFields.statesRole.file
            });
            
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
            clearAllPhotos();
            updateAllAnswerCounters();
            
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
                submitButton.innerHTML = '📝 Отправить на аккредитацию';
            }, 2000);
        }
    });
    
    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    document.getElementById('saveDraftButton').addEventListener('click', function() {
        const draftData = {
            fullName: document.getElementById('fullName').value,
            specialCommId: document.getElementById('specialCommId').value,
            timestamp: new Date().toLocaleString(),
            answers: {}
        };
        
        // Сохраняем ответы на вопросы
        document.querySelectorAll('textarea[data-question-id]').forEach(textarea => {
            const questionId = textarea.dataset.questionId;
            draftData.answers[questionId] = textarea.value;
        });
        
        // Сохраняем соглашения
        draftData.confidentiality = document.getElementById('confidentiality').checked;
        draftData.agreement = document.getElementById('agreement').checked;
        draftData.rules = document.getElementById('rules').checked;
        
        localStorage.setItem('juniorDraft', JSON.stringify(draftData));
        localStorage.setItem('draftSaved', new Date().toLocaleString());
        
        // Показываем уведомление
        showNotification('Черновик сохранён! Вы можете вернуться к нему позже.', 'success');
        console.log('Черновик сохранён:', draftData);
    });
    
    // ===== ЗАГРУЗКА ЧЕРНОВИКА =====
    function loadDraft() {
        const draft = localStorage.getItem('juniorDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                
                // Заполняем поля
                document.getElementById('fullName').value = draftData.fullName || '';
                document.getElementById('specialCommId').value = draftData.specialCommId || '';
                
                // Заполняем ответы
                if (draftData.answers) {
                    Object.keys(draftData.answers).forEach(questionId => {
                        const textarea = document.querySelector(`textarea[data-question-id="${questionId}"]`);
                        if (textarea) {
                            textarea.value = draftData.answers[questionId];
                            updateAnswerCounter(textarea);
                        }
                    });
                }
                
                // Заполняем соглашения
                if (draftData.confidentiality !== undefined) {
                    document.getElementById('confidentiality').checked = draftData.confidentiality;
                }
                if (draftData.agreement !== undefined) {
                    document.getElementById('agreement').checked = draftData.agreement;
                }
                if (draftData.rules !== undefined) {
                    document.getElementById('rules').checked = draftData.rules;
                }
                
                console.log('Черновик загружен');
                showNotification('Черновик загружен из сохранения', 'info');
                
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
            'Ответ поступит в течение 24 часов';
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
        
        let discordInfo = '';
        if (discordResult && discordResult.id && !isLocal) {
            discordInfo = `<p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">
                Создана ветка в Discord: ${discordResult.id}
            </p>`;
        }
        
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2rem;">${icon}</div>
                <div>
                    <h3 style="margin: 0 0 10px 0;">${title}${configInfo}</h3>
                    <p style="margin: 0; opacity: 0.9;">Номер заявки: ${applicationId}</p>
                    <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">
                        ${description}
                    </p>
                    ${discordInfo}
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
                type: 'junior_attorney',
                date: new Date().toLocaleString(),
                status: discordResult?.local ? 'local_saved' : 'pending',
                fullName: formData.fullName,
                specialCommId: formData.specialCommId,
                discordThreadId: discordResult?.id || null,
                configVersion: formData.configVersion,
                buildId: discordResult?.buildId || 'local',
                hasPhotos: !!(photoFields.idCard.file || photoFields.statesRole.file)
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
    loadExamQuestions();
    updatePhotoCount();
    loadDraft();
    
    // Анимация появления формы
    setTimeout(() => {
        document.querySelectorAll('.form-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 100 * index);
        });
    }, 500);
    
    console.log('Форма полностью инициализирована');
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
