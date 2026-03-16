document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма юриста с Discord OAuth2');

    // --- Конфигурация ---
    const CLIENT_ID = typeof DISCORD_CLIENT_ID !== 'undefined' ? DISCORD_CLIENT_ID : null;
    const REDIRECT_URI = window.location.href.split('?')[0].split('#')[0]; // текущая страница без query/hash
    const DISCORD_API = 'https://discord.com/api/v10';

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

    // --- Состояние авторизации ---
    let discordUser = null;

    // --- Webhook из конфига ---
    let discordWebhookUrl = null;
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' &&
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        console.log('✅ Discord Webhook загружен');
    } else {
        console.error('❌ Webhook не найден');
        const statusEl = document.getElementById('discordStatus');
        if (statusEl) {
            statusEl.textContent = '❌ Ошибка: webhook не настроен';
            statusEl.classList.add('error');
        }
        return;
    }

    // --- Элементы ---
    const loginBtn = document.getElementById('discordLoginBtn');
    const userInfoDiv = document.getElementById('discordUserInfo');
    const discordUsernameSpan = document.getElementById('discordUsername');
    const discordIdSpan = document.getElementById('discordIdDisplay');
    const discordAvatar = document.getElementById('discordAvatar');
    const discordStatus = document.getElementById('discordStatus');
    const submitBtn = document.getElementById('submitButton');
    const form = document.getElementById('juniorForm');

    if (!loginBtn || !userInfoDiv || !discordUsernameSpan || !discordIdSpan || !discordStatus || !submitBtn || !form) {
        console.error('❌ Не найдены необходимые элементы формы');
        return;
    }

    // --- Фото (без изменений) ---
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

    function updatePhotoCount() {
        uploadedPhotos = Object.values(photoFields).filter(f => f.file).length;
        if (photoCountElement) photoCountElement.textContent = uploadedPhotos;
        Object.values(photoFields).forEach(f => {
            if (f.field) f.field.classList.toggle('active', !!f.file);
        });
    }

    window.clearPhoto = function(fieldId) {
        const field = photoFields[fieldId];
        if (!field) return;
        field.file = null;
        if (field.input) field.input.value = '';
        if (field.preview) {
            field.preview.innerHTML = '';
            field.preview.style.display = 'none';
        }
        if (field.uploadArea) {
            field.uploadArea.querySelectorAll('.upload-placeholder, .upload-text, .upload-hint')
                .forEach(el => el.style.display = 'block');
        }
        if (field.field) field.field.classList.remove('active');
        updatePhotoCount();
    };

    window.clearAllPhotos = function() {
        Object.keys(photoFields).forEach(clearPhoto);
    };

    // Инициализация загрузки фото
    Object.keys(photoFields).forEach(fieldId => {
        const field = photoFields[fieldId];
        if (!field?.uploadArea || !field?.input) return;

        field.uploadArea.addEventListener('click', e => {
            if (e.target.closest('.photo-controls')) return;
            field.input.click();
        });

        field.input.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (file) loadPhoto(fieldId, file);
        });

        field.uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            field.uploadArea.classList.add('dragover');
        });

        field.uploadArea.addEventListener('dragleave', () => field.uploadArea.classList.remove('dragover'));

        field.uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            field.uploadArea.classList.remove('dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) loadPhoto(fieldId, file);
        });

        field.uploadArea.addEventListener('paste', e => {
            const items = e.clipboardData?.items;
            if (items) {
                for (let item of items) {
                    if (item.type.startsWith('image/')) {
                        loadPhoto(fieldId, item.getAsFile());
                        break;
                    }
                }
            }
        });
    });

    function loadPhoto(fieldId, file) {
        const field = photoFields[fieldId];
        if (!field || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            alert('Файл должен быть изображением до 5MB');
            return;
        }
        field.file = file;
        const reader = new FileReader();
        reader.onload = e => {
            if (field.preview) {
                field.preview.innerHTML = `<img src="${e.target.result}" alt="Превью">`;
                field.preview.style.display = 'block';
            }
            if (field.uploadArea) {
                field.uploadArea.querySelectorAll('.upload-placeholder, .upload-text, .upload-hint')
                    .forEach(el => el.style.display = 'none');
            }
        };
        reader.readAsDataURL(file);
        updatePhotoCount();
    }

    // --- OAuth2 PKCE функции ---
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

    // Обработка callback (код в URL)
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
                    discriminator: user.discriminator
                };

                // Сохраняем в localStorage для перезагрузки
                localStorage.setItem('discord_user', JSON.stringify(discordUser));

                // Очищаем URL от параметров
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
            
            // Обновляем аватар (если есть)
            if (discordUser.avatar) {
                const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
                discordAvatar.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                discordAvatar.textContent = discordUser.username.charAt(0).toUpperCase();
            }
            
            loginBtn.disabled = true;
            submitBtn.disabled = false;
        }
    }

    // Проверка сохранённой авторизации при загрузке
    function loadStoredUser() {
        const stored = localStorage.getItem('discord_user');
        if (stored) {
            try {
                discordUser = JSON.parse(stored);
                updateUIAfterLogin();
                discordStatus.textContent = `✅ Авторизован как ${discordUser.username}`;
                discordStatus.classList.add('success');
                console.log('✅ Загружен сохранённый пользователь:', discordUser.username);
            } catch (e) {
                console.warn('⚠️ Ошибка загрузки сохранённого пользователя');
                localStorage.removeItem('discord_user');
            }
        }
    }

    // --- Обработчики событий ---
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Нажата кнопка входа через Discord');
        redirectToDiscord();
    });

    // --- Обработка отправки формы ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Проверки
        const fullName = document.getElementById('fullName')?.value?.trim();
        if (!fullName) {
            alert('Введите полное имя');
            return;
        }

        if (!discordUser || !discordUser.id) {
            alert('Необходимо авторизоваться через Discord');
            return;
        }

        if (!photoFields.idCard.file) {
            alert('Загрузите удостоверение личности');
            return;
        }
        if (!photoFields.statesRole.file) {
            alert('Загрузите скриншот роли в STATES');
            return;
        }

        // Проверка чекбоксов
        const confidentiality = document.getElementById('confidentiality');
        const agreement = document.getElementById('agreement');
        const rules = document.getElementById('rules');
        
        if (!confidentiality || !confidentiality.checked) {
            alert('Необходимо подтвердить достоверность документов');
            return;
        }
        if (!agreement || !agreement.checked) {
            alert('Необходимо согласие на проверку данных');
            return;
        }
        if (!rules || !rules.checked) {
            alert('Необходимо ознакомиться с правилами');
            return;
        }

        // Блокируем кнопку
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        // Формируем FormData
        const formData = new FormData();

        const payload = {
            username: "Секретарь Коллегии адвокатов",
            avatar_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png",
            thread_name: `Аккредитация юриста — ${fullName}`,
            content: "<@&1321503127987421316> <@&1371785937180426270> <@&1321503135302291516>\nНовая заявка на аккредитацию юриста",
            embeds: [{
                title: "📋 Заявка на аккредитацию: Юрист",
                description: `**${fullName}** подал(а) заявку на должность юриста`,
                color: 0xd4af37,
                fields: [
                    { name: "👤 Заявитель", value: fullName, inline: true },
                    { name: "📱 Discord", value: `<@${discordUser.id}>`, inline: true },
                    { name: "🕐 Дата подачи", value: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }), inline: true },
                    { name: "📷 Документы", value: "✅ Удостоверение личности\n✅ Роль в STATES", inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: "Коллегия государственных адвокатов | Majestic RP | Boston",
                    icon_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png"
                }
            }]
        };

        formData.append('payload_json', JSON.stringify(payload));

        if (photoFields.idCard.file) {
            formData.append('files[0]', photoFields.idCard.file, 'udostoverenie.jpg');
        }
        if (photoFields.statesRole.file) {
            formData.append('files[1]', photoFields.statesRole.file, 'states_role.jpg');
        }

        try {
            console.log('📤 Отправка формы...');
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                console.log('✅ Форма успешно отправлена');
                
                // Показываем сообщение об успехе
                const successMsg = document.createElement('div');
                successMsg.innerHTML = '<span style="color:#86efac; font-weight:600;">✅ Заявка успешно отправлена!</span>';
                successMsg.style.marginTop = '20px';
                successMsg.style.textAlign = 'center';
                successMsg.style.padding = '15px';
                successMsg.style.backgroundColor = 'rgba(134, 239, 172, 0.1)';
                successMsg.style.borderRadius = 'var(--border-radius)';
                form.appendChild(successMsg);
                
                setTimeout(() => successMsg.remove(), 7000);

                // Сбрасываем форму, но оставляем авторизацию
                form.reset();
                clearAllPhotos();
                
                // Обновляем счётчик фото
                updatePhotoCount();
            } else {
                const errorText = await response.text();
                console.error('❌ Discord ошибка:', response.status, errorText);
                alert(`Ошибка отправки (код ${response.status}). Попробуйте позже.`);
            }
        } catch (err) {
            console.error('❌ Сетевая ошибка:', err);
            alert('Не удалось отправить заявку. Проверьте подключение к интернету.');
        } finally {
            submitBtn.disabled = !discordUser; // Восстанавливаем состояние (если пользователь авторизован)
            submitBtn.textContent = '📝 Отправить на аккредитацию';
        }
    });

    // --- Инициализация ---
    updatePhotoCount();
    loadStoredUser();
    
    // Обрабатываем callback от Discord (если есть code в URL)
    handleDiscordCallback();

    // Анимация секций
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

    console.log('✅ Форма юриста с Discord OAuth2 готова');
});