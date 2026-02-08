document.addEventListener('DOMContentLoaded', function() {
    console.log('Форма записи на устный экзамен загружена');

    let discordWebhookUrl = null;

    // Загрузка webhook из конфига
    if (typeof DISCORD_WEBHOOK_URL !== 'undefined' &&
        DISCORD_WEBHOOK_URL !== "{{DISCORD_WEBHOOK_PLACEHOLDER}}" &&
        DISCORD_WEBHOOK_URL.includes('discord.com')) {

        discordWebhookUrl = DISCORD_WEBHOOK_URL;
        console.log('✅ Discord Webhook загружен');
    } else {
        console.error('❌ Webhook не найден — проверь discord-config.js и GitHub Actions');
        alert('Ошибка: Webhook не настроен. Обратитесь к администратору.');
        return;
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

        const nameStatic = document.getElementById('nameStatic').value.trim();
        const discordId = document.getElementById('discordId').value.trim();
        const examDateTime = document.getElementById('examDateTime').value.trim();
        const preferredExaminer = document.getElementById('preferredExaminer').value.trim() || 'Не указан';

        // Валидация
        if (!nameStatic || !discordId || !examDateTime) {
            resultDiv.innerHTML = '<span style="color:#f87171;">Заполните все обязательные поля, сука!</span>';
            return;
        }

        if (!/^\d{17,20}$/.test(discordId)) {
            resultDiv.innerHTML = '<span style="color:#f87171;">ID Discord — хуйня, 17-20 цифр надо</span>';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Шлю в Discord...';
        resultDiv.innerHTML = '<span style="color:#86efac;">Отправляю, жди...</span>';

        // === ВОТ ЭТОТ PAYLOAD РАБОТАЕТ НА 100% ===
        const payload = {
            username: "Секретарь Адвокатуры",
            avatar_url: "https://i.imgur.com/7aaf811.png", // любой аватар, главное валидный URL
            content: `<@&ВАША_РОЛЬ_ЭКЗАМЕНАТОРОВ> Новая запись на устный экзамен!`, // ← замени на реальный ID роли
            embeds: [{
                title: "🗓️ Запись на устный экзамен",
                description: `**${nameStatic}** хочет пройти экзамен`,
                color: 0x60a5fa,
                fields: [
                    { name: "👤 Имя и статик", value: nameStatic, inline: true },
                    { name: "📱 Discord", value: `<@${discordId}>`, inline: true },
                    { name: "🕐 Время", value: examDateTime, inline: false },
                    { name: "🎓 Экзаменатор", value: preferredExaminer, inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "Коллегия адвокатов | Majestic RP" }
            }]
        };

        try {
            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                resultDiv.innerHTML = '<span style="color:#86efac;">Запись ушла в Discord! Жди ответа.</span>';
                form.reset();
            } else {
                const errorText = await response.text();
                console.error('Discord 400:', errorText);
                resultDiv.innerHTML = `<span style="color:#f87171;">Discord сказал нахуй (400). Проверь роль в content или webhook.</span>`;
            }
        } catch (err) {
            console.error('Сетевая ошибка:', err);
            resultDiv.innerHTML = '<span style="color:#f87171;">Нет интернета или webhook мёртвый.</span>';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '📅 Записаться на экзамен';

            // Очистка сообщения через 8 сек
            setTimeout(() => {
                resultDiv.innerHTML = '';
            }, 8000);
        }
    });

    // Анимация
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
    }, 300);

    console.log('Форма готова, webhook:', discordWebhookUrl ? 'живой' : 'пиздец');
});
