/**
 * Форма повышения до Адвоката с Discord OAuth2 авторизацией
 * Замена поля ручного ввода ID на кнопку входа через Discord
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Форма адвоката с Discord OAuth2 загружена');

    // ===== КОНФИГУРАЦИЯ DISCORD OAuth2 =====
    const CLIENT_ID = typeof DISCORD_CLIENT_ID !== 'undefined' ? DISCORD_CLIENT_ID : null;
    const REDIRECT_URI = window.location.href.split('?')[0].split('#')[0];
    const DISCORD_API = 'https://discord.com/api/v10';

    // ===== СОСТОЯНИЕ АВТОРИЗАЦИИ =====
    let discordUser = null;

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

    if (!CLIENT_ID) {
        console.error('❌ Не задан DISCORD_CLIENT_ID в discord-config.js');
        const statusEl = document.getElementById('discordStatus');
        if (statusEl) {
            statusEl.textContent = '❌ Ошибка: client_id не настроен';
            statusEl.classList.add('error');
        }
        return;
    }

    console.log('✅ Discord Client ID загружен:', CLIENT_ID.substring(0, 10) + '...');
    console.log('🔁 Redirect URI:', REDIRECT_URI);

    // ===== ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ =====
    const loginBtn = document.getElementById('discordLoginBtn');
    const userInfoDiv = document.getElementById('discordUserInfo');
    const discordUsernameSpan = document.getElementById('discordUsername');
    const discordIdSpan = document.getElementById('discordIdDisplay');
    const discordAvatar = document.getElementById('discordAvatar');
    const discordStatus = document.getElementById('discordStatus');
    const discordIdHidden = document.getElementById('specialCommId'); // скрытое поле для ID
    const submitBtn = document.getElementById('submitButton');
    const form = document.getElementById('attorneyForm');
    const saveDraftButton = document.getElementById('saveDraftButton');

    if (!loginBtn || !userInfoDiv || !discordUsernameSpan || !discordIdSpan || !discordStatus || !discordIdHidden || !submitBtn || !form) {
        console.error('❌ Не найдены необходимые элементы формы');
        return;
    }

    // ===== OAuth2 PKCE ФУНКЦИИ =====
    function generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return base64URLEncode(array);
    }

    function base64URLEncode(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    async function generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return base64URLEncode(new Uint8Array(digest));
    }

    function redirectToDiscord() {
        const verifier = generateCodeVerifier();
        localStorage.setItem('discord_verifier', verifier);
        
        generateCodeChallenge(verifier).then(challenge => {
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                response_type: 'code',
                scope: 'identify',
                code_challenge: challenge,
                code_challenge_method: 'S256',
                prompt: 'consent'
            });
            
            const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
            console.log('🔐 Перенаправление на Discord...');
            window.location.href = authUrl;
        }).catch(error => {
            console.error('❌ Ошибка генерации challenge:', error);
            discordStatus.textContent = '❌ Ошибка при подготовке авторизации';
            discordStatus.classList.add('error');
        });
    }

    async function exchangeCode(code, verifier) {
        const body = new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier
        });

        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Token exchange failed: ${err}`);
        }

        const data = await response.json();
        return data.access_token;
    }

    async function fetchUser(accessToken) {
        const response = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        return await response.json();
    }

    // Обработка callback
    async function handleDiscordCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
            console.error('❌ Discord error:', error);
            discordStatus.textContent = `❌ Ошибка авторизации: ${error}`;
            discordStatus.classList.add('error');
            return;
        }

        if (code) {
            const verifier = localStorage.getItem('discord_verifier');
            if (!verifier) {
                discordStatus.textContent = '❌ Ошибка: не найден верификатор';
                discordStatus.classList.add('error');
                return;
            }

            try {
                discordStatus.textContent = '🔄 Получение токена...';
                discordStatus.classList.remove('error', 'success');
                
                const accessToken = await exchangeCode(code, verifier);
                const user = await fetchUser(accessToken);
                discordUser = { 
                    id: user.id, 
                    username: user.username, 
                    avatar: user.avatar,
                    global_name: user.global_name
                };

                localStorage.setItem('discord_user', JSON.stringify(discordUser));
                window.history.replaceState({}, document.title, window.location.pathname);

                updateUIAfterLogin();
                discordStatus.textContent = `✅ Авторизован как ${discordUser.username}`;
                discordStatus.classList.add('success');
            } catch (err) {
                console.error('❌ Ошибка авторизации:', err);
                discordStatus.textContent = '❌ Ошибка авторизации. Попробуйте снова.';
                discordStatus.classList.add('error');
            } finally {
                localStorage.removeItem('discord_verifier');
            }
        }
    }

    function updateUIAfterLogin() {
        if (discordUser) {
            userInfoDiv.style.display = 'block';
            discordUsernameSpan.textContent = discordUser.username;
            discordIdSpan.textContent = `ID: ${discordUser.id}`;
            discordIdHidden.value = discordUser.id; // Заполняем скрытое поле
            
            if (discordUser.avatar) {
                const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
                discordAvatar.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                discordAvatar.textContent = discordUser.username.charAt(0).toUpperCase();
            }
            
            loginBtn.disabled = true;
            discordStatus.textContent = `✅ Авторизован как ${discordUser.username}`;
            discordStatus.classList.add('success');
        }
    }

    function loadStoredUser() {
        const stored = localStorage.getItem('discord_user');
        if (stored) {
            try {
                discordUser = JSON.parse(stored);
                updateUIAfterLogin();
                console.log('✅ Загружен сохранённый пользователь:', discordUser.username);
            } catch (e) {
                console.warn('⚠️ Ошибка загрузки сохранённого пользователя');
                localStorage.removeItem('discord_user');
            }
        }
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

    // ===== ФОРМАТИРОВАНИЕ ИМЕНИ ДЛЯ ВЕТКИ =====
    function formatThreadName(fullName) {
        const cleanName = fullName.trim().replace(/\s+/g, ' ');
        const maxNameLength = 50;
        const shortName = cleanName.length > maxNameLength 
            ? cleanName.substring(0, maxNameLength) + '...' 
            : cleanName;
        
        return `📋 ${shortName} | Повышение до Адвоката`;
    }

    // Транслитерация для безопасного названия ветки
    function transliterate(text) {
        const rus = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
        const eng = "abvgdeejziyklmnoprstufhzcssyyeiya";
        let result = "";
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toLowerCase();
            const index = rus.indexOf(char);
            if (index !== -1) {
                result += eng[index];
            } else {
                result += text[i];
            }
        }
        return result;
    }

    // ===== ОТПРАВКА В DISCORD С ИЗОБРАЖЕНИЯМИ =====
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
            
            // Создаём безопасное название для ветки
            const cleanName = formData.fullName.trim().replace(/\s+/g, ' ');
            const latinName = transliterate(cleanName);
            const safeName = latinName.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
            const threadName = `📋 ${safeName} | Повышение до Адвоката`.trim();

            // Роли из конфига или дефолтные
            const discordRoles = discordConfig?.roles ? 
                `${discordConfig.roles.main}, ${discordConfig.roles.secondary}, ${discordConfig.roles.tertiary}` :
                '<@&1321503127987421316>, <@&1321503135302291516>, <@&1371785937180426270>';

            // Основной embed
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
            
            // Добавляем payload_json с embed и названием ветки
            const payload = {
                username: 'Секретарь Адвокатуры',
                avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                thread_name: threadName,
                embeds: [mainEmbed],
                content: `📢 **Новая заявка на повышение!** <@${formData.specialCommId}> подает заявку на повышение до Адвоката.\n\n**Скриншоты вызовов прикреплены к сообщению.**\n**Ссылка на экзамен:** ${formData.examLink}`,
                allowed_mentions: {
                    users: [formData.specialCommId]
                }
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
                    if (errorText) {
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage += `: ${errorJson.message || errorText}`;
                        } catch {
                            errorMessage += `: ${errorText}`;
                        }
                    }
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

            console.log('✅ Заявка успешно отправлена в Discord, создана ветка:', threadName);
            return { ...result, message: `Ветка создана: ${threadName}` };

        } catch (error) {
            console.error('❌ Ошибка отправки в Discord:', error);
            
            // Пробуем отправить без создания ветки как запасной вариант
            if (error.message.includes('thread') || error.message.includes('ветк')) {
                try {
                    console.log('Пробуем отправить без создания ветки...');
                    
                    const formDataToSend = new FormData();
                    for (let i = 0; i < files.length; i++) {
                        formDataToSend.append(`files[${i}]`, files[i], `call_${i+1}.png`);
                    }
                    
                    const payload = {
                        username: 'Секретарь Адвокатуры',
                        avatar_url: 'https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png',
                        embeds: [mainEmbed],
                        content: `📢 **Новая заявка на повышение!** <@${formData.specialCommId}> подает заявку на повышение до Адвоката.\n\n⚠️ **Не удалось создать ветку. Заявка отправлена в основной канал.**\n\n**Скриншоты вызовов прикреплены к сообщению.**\n**Ссылка на экзамен:** ${formData.examLink}`,
                        allowed_mentions: {
                            users: [formData.specialCommId]
                        }
                    };
                    
                    formDataToSend.append('payload_json', JSON.stringify(payload));
                    
                    const fallbackResponse = await fetch(discordWebhookUrl, {
                        method: 'POST',
                        body: formDataToSend
                    });
                    
                    if (!fallbackResponse.ok) {
                        throw new Error('Не удалось отправить даже в основной канал');
                    }
                    
                    return {
                        success: true,
                        id: `channel-${Date.now()}`,
                        message: 'Заявка отправлена в основной канал (ветка не создана)',
                        local: false
                    };
                } catch (fallbackError) {
                    console.error('Запасной вариант тоже не сработал:', fallbackError);
                }
            }
            
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
    if (form && submitBtn) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка авторизации Discord
            if (!discordUser || !discordUser.id) {
                discordStatus.textContent = '❌ Необходимо авторизоваться через Discord';
                discordStatus.classList.add('error');
                
                const warningDiv = document.createElement('div');
                warningDiv.className = 'discord-warning';
                warningDiv.innerHTML = '⚠️ Для отправки формы необходимо авторизоваться через Discord';
                form.parentNode.insertBefore(warningDiv, form);
                
                setTimeout(() => warningDiv.remove(), 5000);
                return;
            }

            const errors = [];

            // Проверка имени
            const fullName = document.getElementById('fullName').value.trim();
            if (!fullName) errors.push('• Введите ваше полное имя');

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
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Отправка в Discord...';

            // Собираем данные
            const formData = {
                fullName,
                specialCommId: discordUser.id, // Используем ID из авторизации
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
                
                // Скрыть все превью, но сохранить авторизацию
                for (let i = 1; i <= 3; i++) {
                    const preview = document.getElementById(`preview${i}`);
                    if (preview) {
                        preview.style.display = 'none';
                        preview.querySelector('img').src = '#';
                    }
                }
                updateImagesCounter();
                
                // Сбрасываем статус экзамена, но НЕ сбрасываем авторизацию
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
                } else if (error.message.includes('thread')) {
                    errorMessage += 'Проблема с созданием ветки. Заявка отправлена в основной канал.';
                } else {
                    errorMessage += 'Пожалуйста, попробуйте еще раз.';
                }
                showNotification(errorMessage, 'error');
            } finally {
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '📤 Отправить заявку';
                }, 2000);
            }
        });
    }

    // ===== СОХРАНЕНИЕ ЧЕРНОВИКА =====
    if (saveDraftButton) {
        saveDraftButton.addEventListener('click', function() {
            const draftData = {
                fullName: document.getElementById('fullName')?.value || '',
                specialCommId: discordUser?.id || '', // Сохраняем ID из авторизации
                examLink: document.getElementById('examLink')?.value || '',
                timestamp: new Date().toLocaleString()
            };
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
                if (draftData.specialCommId && !discordUser) {
                    // Если есть ID в черновике, но пользователь не авторизован
                    discordIdHidden.value = draftData.specialCommId;
                }
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
        const threadCreated = !isLocal && discordResult.message ? 'Ветка создана' : '';
        const description = isLocal ? 
            'Discord недоступен, заявка сохранена локально' : 
            `Ответ в течение 3-5 дней. ${threadCreated}`;
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
                    ${discordResult.message ? `<p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">${discordResult.message}</p>` : ''}
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
                buildId: discordResult?.buildId || 'local',
                threadCreated: !discordResult?.local && !discordResult?.message?.includes('ветка не создана')
            };
            applications.push(application);
            localStorage.setItem('applications', JSON.stringify(applications));
            localStorage.setItem('lastApplication', JSON.stringify(application));
            console.log('Заявка сохранена в хранилище:', application);
        } catch (error) {
            console.error('Ошибка сохранения в хранилище:', error);
        }
    }

    // ===== ОБРАБОТЧИКИ =====
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        redirectToDiscord();
    });

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    updateImagesCounter();
    loadStoredUser();
    loadDraft();
    handleDiscordCallback();

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

    console.log('✅ Форма адвоката с Discord OAuth2 инициализирована');
});