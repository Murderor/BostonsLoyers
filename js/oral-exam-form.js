document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма записи на устный экзамен загружена');

    let discordWebhookUrl = null;
    let discordConfig = null;

    // Проверка конфига (как в junior-form.js)
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' &&
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {

        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        discordConfig = typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : null;
        console.log('✅ Discord Webhook загружен');

    } else if (window.DISCORD_WEBHOOK_URL && window.DISCORD_WEBHOOK_URL.includes('discord.com')) {
        discordWebhookUrl = window.DISCORD_WEBHOOK_URL;
        discordConfig = window.DISCORD_CONFIG || null;
        console.log('✅ Discord Webhook из window');
    } else {
        console.warn('⚠️ Discord webhook не настроен. Тестовый режим.');
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 15px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 4px 15px rgba(255,152,0,0.3); border-left: 5px solid #ff5722;">
                <strong>⚠️ Внимание:</strong> Discord webhook не настроен.<br>
                <small>Добавьте секрет DISCORD_WEBHOOK_URL в GitHub Secrets и запустите workflow</small>
            </div>
        `;
        document.querySelector('.form-container')?.prepend(warning);
    }

    // Flatpickr
    flatpickr("#examDateTime", {
        enableTime: true,
        dateFormat: "d.m.Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: "ru",
        minuteIncrement: 15,
        defaultHour: 18,
        defaultMinute: 0
    });

    const form = document.getElementById('examSignupForm');
    const submitButton = document.getElementById('submitButton');
    const resultDiv = document.getElementById('formResult');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Валидация
        const nameStatic = document.getElementById('nameStatic').value.trim();
        const discordId = document.getElementById('discordId').value.trim();
        const examDateTime = document.getElementById('examDateTime').value.trim();
        const preferredExaminer = document.getElementById('preferredExaminer').value.trim();

        if (!nameStatic) return alert('Укажите имя и статик');
        if (!/^\d{17,20}$/.test(discordId)) return alert('ID Discord — 17–20 цифр');
        if (!examDateTime) return alert('Выберите дату и время');

        submitButton.disabled = true;
        submitButton.innerHTML = '⏳ Отправка...';
        resultDiv.innerHTML = '<span style="color:#86efac;">Отправка в Discord...</span>';

        try {
            const payload = {
                username: "Секретарь Адвокатуры",
                avatar_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png",
                embeds: [{
                    title: "🗓️ Новая запись на устный экзамен",
                    description: `**${nameStatic}** хочет пройти устный экзамен\n<@${discordId}>`,
                    color: 0x60a5fa, // голубой акцент
                    fields: [
                        { name: "Имя и статик", value: nameStatic, inline: true },
                        { name: "Discord", value: `<@${discordId}>`, inline: true },
                        { name: "Удобное время", value: examDateTime, inline: false },
                        { name: "Предпочтительный экзаменатор", value: preferredExaminer || "Не указан", inline: false }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Majestic RP | Коллегия адвокатов ${discordConfig?.version ? 'v' + discordConfig.version : ''}`,
                        icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
                    }
                }],
                content: `<@&РОЛЬ_ЭКЗАМЕНАТОРОВ> Новая запись на экзамен!` // ← замени на нужную роль
            };

            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Discord ответил ${response.status}`);
            }

            resultDiv.innerHTML = '<span style="color:#86efac;">Запись отправлена! Ожидайте в Discord.</span>';
            form.reset();

        } catch (err) {
            console.error(err);
            resultDiv.innerHTML = '<span style="color:#f87171;">Ошибка отправки: ' + err.message + '</span>';
        } finally {
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = '📅 Записаться на экзамен';
                resultDiv.innerHTML = '';
            }, 6000);
        }
    });

    // Анимация появления
    setTimeout(() => {
        document.querySelectorAll('.form-section').forEach((s, i) => {
            s.style.opacity = '0';
            s.style.transform = 'translateY(20px)';
            setTimeout(() => {
                s.style.transition = 'all 0.5s ease';
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
            }, 100 * i);
        });
    }, 500);

    console.log('Форма инициализирована. Discord:', discordWebhookUrl ? 'OK' : 'не настроен');
});