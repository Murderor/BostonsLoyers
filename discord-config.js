// ⚠️ ВНИМАНИЕ: Этот файл создан автоматически GitHub Actions
// ⚠️ Не добавляйте его в git!
// ⚠️ Реальный вебхук находится только здесь

// ВАЖНО: объявляем как глобальную переменную
var DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1467445185297387723/TGBXdJ1zQwVn5UKjM0CRvKj0xnTTIeWcAyCDlMsp87AALfcm0NN7XItbblI10FE4bDYW";

var DISCORD_CONFIG = {
    webhook: "https://discord.com/api/webhooks/1467445185297387723/TGBXdJ1zQwVn5UKjM0CRvKj0xnTTIeWcAyCDlMsp87AALfcm0NN7XItbblI10FE4bDYW",
    version: "1.1",
    buildDate: "2026-02-21 17:16:35",
    buildId: "22260916843",
    commitHash: "07ad58657ed3225b394c5e2fc04b752153a29607",
    roles: {
        main: "<@&1321503127987421316>",
        secondary: "<@&1321503135302291516>",
        tertiary: "<@&1371785937180426270>"
    },
    embeds: {
        questionColor: 0x3498db,
        successColor: 0x2ecc71,
        errorColor: 0xe74c3c,
        warningColor: 0xf39c12
    }
};

console.log("🎯 Discord Config v" + DISCORD_CONFIG.version + " ЗАГРУЖЕН");
console.log("📅 Сборка: " + DISCORD_CONFIG.buildDate);
console.log("🔗 Вебхук: " + (DISCORD_WEBHOOK_URL ? "✅ Настроен" : "❌ Отсутствует"));

// Экспортируем в глобальную область видимости
if (typeof window !== 'undefined') {
    window.DISCORD_CONFIG = DISCORD_CONFIG;
    window.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
}

// Для прямого доступа (если не через window)
if (typeof globalThis !== 'undefined') {
    globalThis.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
    globalThis.DISCORD_CONFIG = DISCORD_CONFIG;
}
