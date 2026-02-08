document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма младшего адвоката загружена');

    // =============================================
    //   Проверка и загрузка конфига Discord
    // =============================================
    let discordWebhookUrl = null;
    let discordConfig = null;

    // 1. Проверяем глобальную переменную из discord-config.js
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' &&
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        typeof DISCORD_WEBHOOK_URL === 'string' &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {

        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;

        console.log('✅ Discord Config загружен из глобальной переменной');
        console.log('📅 Версия конфига:', discordConfig?.version || 'неизвестна');

    // 2. Проверяем window (на всякий случай)
    } else if (window.DISCORD_WEBHOOK_URL &&
               typeof window.DISCORD_WEBHOOK_URL === 'string' &&
               window.DISCORD_WEBHOOK_URL.includes('discord.com')) {

        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;

        console.log('✅ Discord Config загружен из window');

    // 3. Тестовый режим / предупреждение
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
                2. Запустить GitHub Actions workflow
            </div>
        `;

        const container = document.querySelector('.form-container') || document.body;
        container.prepend(warning);
    }

    // =============================================
    //   Управление фотографиями (исправленная версия)
    // =============================================
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
        uploadedPhotos = Object.values(photoFields).filter(f => !!f.file).length;
        if (photoCountElement) photoCountElement.textContent = uploadedPhotos;

        Object.values(photoFields).forEach(field => {
            field.field?.classList.toggle('active', !!field.file);
        });
    }

    function loadPhoto(fieldId, file) {
        const field = photoFields[fieldId];
        if (!field) return;

        if (!file.type.startsWith('image/')) {
            alert('Только изображения!');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Макс. размер 5 МБ');
            return;
        }

        field.file = file;

        const reader = new FileReader();
        reader.onload = e => {
            field.preview.innerHTML = `<img src="${e.target.result}" alt="Превью">`;
            field.preview.style.display = 'block';

            field.uploadArea.querySelectorAll('.upload-placeholder, .upload-text, .upload-hint')
                .forEach(el => el.style.display = 'none');
        };
        reader.readAsDataURL(file);

        updatePhotoCount();
    }

    window.clearPhoto = function(fieldId) {
        const field = photoFields[fieldId];
        if (!field) return;

        field.file = null;
        field.input.value = '';
        field.preview.innerHTML = '';
        field.preview.style.display = 'none';

        field.uploadArea.querySelectorAll('.upload-placeholder, .upload-text, .upload-hint')
            .forEach(el => el.style.display = 'block');

        field.field?.classList.remove('active');
        updatePhotoCount();
    };

    window.clearAllPhotos = function() {
        Object.keys(photoFields).forEach(clearPhoto);
    };

    // Привязка событий к полям загрузки
    Object.keys(photoFields).forEach(fieldId => {
        const field = photoFields[fieldId];
        if (!field?.uploadArea || !field?.input) return;

        // Клик по области (игнорируем кнопку очистки)
        field.uploadArea.addEventListener('click', e => {
            if (e.target.closest('.photo-controls')) return;
            field.input.click();
        });

        // Выбор файла
        field.input.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (file) loadPhoto(fieldId, file);
        });

        // Drag & Drop
        ['dragover', 'dragenter'].forEach(ev => {
            field.uploadArea.addEventListener(ev, e => {
                e.preventDefault();
                field.uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(ev => {
            field.uploadArea.addEventListener(ev, e => {
                e.preventDefault();
                field.uploadArea.classList.remove('dragover');
            });
        });

        field.uploadArea.addEventListener('drop', e => {
            const file = e.dataTransfer?.files?.[0];
            if (file) loadPhoto(fieldId, file);
        });

        // Paste (Ctrl+V)
        field.uploadArea.addEventListener('paste', e => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    loadPhoto(fieldId, item.getAsFile());
                    break;
                }
            }
        });
    });

    // =============================================
    //   Инициализация после загрузки
    // =============================================
    updatePhotoCount();

    // Анимация появления секций
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
    console.log('Discord webhook:', discordWebhookUrl ? '✅ настроен' : '⚠️ тестовый режим');
});