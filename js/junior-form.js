document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма младшего адвоката загружена');

    let discordWebhookUrl = null;
    let discordConfig = null;

    // Загрузка конфига
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' &&
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {
        
        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        console.log('✅ Discord Webhook загружен');
    } else {
        console.error('❌ Webhook не найден');
        alert('Ошибка конфигурации Discord. Обратитесь к администратору.');
        return;
    }

    // =============================================
    //   Фото (оставляем как было, но с проверкой)
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
        uploadedPhotos = Object.values(photoFields).filter(f => f.file).length;
        photoCountElement.textContent = uploadedPhotos;
        Object.values(photoFields).forEach(f => f.field.classList.toggle('active', !!f.file));
    }

    function loadPhoto(fieldId, file) {
        const field = photoFields[fieldId];
        if (!field || !file.type.startsWith('image/') || file.size > 5*1024*1024) return;

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
        field.field.classList.remove('active');
        updatePhotoCount();
    };

    window.clearAllPhotos = function() {
        Object.keys(photoFields).forEach(clearPhoto);
    };

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

    // =============================================
    //   Отправка формы
    // =============================================
    const form = document.getElementById('juniorForm');
    const submitButton = document.getElementById('submitButton');
    const resultDiv = document.createElement('div');
    resultDiv.id = 'formResult';
    resultDiv.style.marginTop = '20px';
    resultDiv.style.textAlign = 'center';
    resultDiv.style.minHeight = '24px';
    resultDiv.style.fontWeight = '500';
    form.appendChild(resultDiv);

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName')?.value?.trim();
        const specialCommId = document.getElementById('specialCommId')?.value?.trim();

        const errors = [];
        if (!fullName) errors.push('Введите полное имя');
        if (!/^\d{17,20}$/.test(specialCommId)) errors.push('Некорректный Discord ID');
        if (!photoFields.idCard.file) errors.push('Загрузите удостоверение личности');
        if (!photoFields.statesRole.file) errors.push('Загрузите скриншот роли в STATES');

        ['confidentiality', 'agreement', 'rules'].forEach(id => {
            if (!document.getElementById(id)?.checked) {
                errors.push(`Необходимо согласиться с пунктом "${document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || id}"`);
            }
        });

        if (errors.length > 0) {
            resultDiv.innerHTML = '<span style="color:#f87171;">' + errors.join('<br>') + '</span>';
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = 'Отправка...';
        resultDiv.innerHTML = '<span style="color:#86efac;">Отправляем заявку...</span>';

        // =============================================
        //   Красивый embed + создание ветки
        // =============================================
        const payload = {
            username: "Секретарь Коллегии адвокатов",
            avatar_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png",
            
            // Обязательно для форум-канала
            thread_name: `Аккредитация младшего адвоката — ${fullName}`,
            
            // Упоминаем роли
            content: "<@&1321503127987421316> <@&1371785937180426270> <@&1321503135302291516>\nНовая заявка на аккредитацию младшего адвоката",
            
            embeds: [{
                title: "📋 Заявка на аккредитацию: Младший адвокат",
                description: `**${fullName}** подал заявку на вступление`,
                color: 0xd4af37,  // золотой акцент
                fields: [
                    { name: "👤 Заявитель", value: fullName, inline: true },
                    { name: "📱 Discord ID", value: `<@${specialCommId}>`, inline: true },
                    { name: "🕐 Дата подачи", value: new Date().toLocaleString('ru-RU'), inline: true },
                    { name: "📷 Документы", value: "✅ Удостоверение личности\n✅ Роль в STATES", inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: "Коллегия государственных адвокатов | Majestic RP | Boston",
                    icon_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png"
                }
            }]
        };

        try {
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                resultDiv.innerHTML = '<span style="color:#86efac;">Заявка успешно отправлена! Ожидайте проверки в Discord.</span>';
                form.reset();
                clearAllPhotos();
                updatePhotoCount();
            } else {
                const errorText = await response.text();
                console.error('Discord ошибка:', errorText);
                resultDiv.innerHTML = '<span style="color:#f87171;">Ошибка отправки (код ' + response.status + ')</span>';
            }
        } catch (err) {
            console.error('Сетевая ошибка:', err);
            resultDiv.innerHTML = '<span style="color:#f87171;">Не удалось отправить заявку. Проверьте соединение.</span>';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '📝 Отправить на аккредитацию';
            setTimeout(() => resultDiv.innerHTML = '', 10000);
        }
    });

    // Инициализация
    updatePhotoCount();

    // Анимация
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

    console.log('Форма младшего адвоката готова');
});
