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
            resultDiv.innerHTML = '<span style="color:#f87171;">Пожалуйста, заполните все обязательные поля</span>';
            return;
        }

        if (!/^\d{17,20}$/.test(discordId)) {
            resultDiv.innerHTML = '<span style="color:#f87171;">ID Discord должен содержать 17–20 цифр</span>';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Отправка...';
        resultDiv.innerHTML = '<span style="color:#86efac;">Отправляем заявку в Discord...</span>';

        // Красивый embed + упоминание всех ролей
        const payload = {
            username: "Секретарь Коллегии адвокатов",
            avatar_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png",
            
            // Создаём новую ветку с понятным названием
            thread_name: `Запись на экзамен — ${nameStatic}`,
            
            // Упоминаем все три роли
            content: "<@&1321503127987421316> <@&1371785937180426270> <@&1321503135302291516>\nНовая заявка на устный экзамен",
            
            embeds: [{
                title: "🗓️ Новая запись на устный экзамен",
                description: `**${nameStatic}** подал заявку на прохождение устного экзамена`,
                color: 0x60a5fa,          // красивый голубой #60a5fa
                fields: [
                    {
                        name: "👤 Имя и статик",
                        value: nameStatic || "—",
                        inline: true
                    },
                    {
                        name: "📱 Discord",
                        value: `<@${discordId}>`,
                        inline: true
                    },
                    {
                        name: "🕒 Удобное время",
                        value: examDateTime || "—",
                        inline: false
                    },
                    {
                        name: "🎓 Предпочтительный экзаменатор",
                        value: preferredExaminer,
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: "Коллегия государственных адвокатов • Majestic RP | Boston",
                    icon_url: "https://i.pinimg.com/originals/7a/af/81/7aaf811aa403514a33e1d468e7405f9a.png"
                }
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
                resultDiv.innerHTML = '<span style="color:#86efac;">Заявка успешно отправлена! Ожидайте ответа в Discord.</span>';
                form.reset();
            } else {
                const errorText = await response.text();
                console.error('Discord ошибка:', errorText);
                resultDiv.innerHTML = '<span style="color:#f87171;">Ошибка отправки (код ' + response.status + '). Попробуйте позже.</span>';
            }
        } catch (err) {
            console.error('Сетевая ошибка:', err);
            resultDiv.innerHTML = '<span style="color:#f87171;">Не удалось отправить заявку. Проверьте соединение.</span>';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '📅 Записаться на экзамен';

            // Очистка сообщения через 8 секунд
            setTimeout(() => {
                resultDiv.innerHTML = '';
            }, 8000);
        }
    });

    // Анимация появления секций
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

    console.log('Форма готова, webhook:', discordWebhookUrl ? 'живой' : 'не настроен');
});
