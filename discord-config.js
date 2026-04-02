// ⚠️ ВНИМАНИЕ: Этот файл создан автоматически GitHub Actions
// ⚠️ Не добавляйте его в git!
// ⚠️ Реальные данные находятся только здесь

// ВАЖНО: объявляем как глобальные переменные
var DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1467445185297387723/TGBXdJ1zQwVn5UKjM0CRvKj0xnTTIeWcAyCDlMsp87AALfcm0NN7XItbblI10FE4bDYW";
var DISCORD_CLIENT_ID = "1472490639445852201";

var DISCORD_CONFIG = {
    webhook: "https://discord.com/api/webhooks/1467445185297387723/TGBXdJ1zQwVn5UKjM0CRvKj0xnTTIeWcAyCDlMsp87AALfcm0NN7XItbblI10FE4bDYW",
    clientId: "1472490639445852201",
    version: "1.2",
    buildDate: "2026-04-02 21:43:05",
    buildId: "23923382090",
    commitHash: "064e89e51ebc7505134cbb086042181b7a30454e",
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
console.log("🆔 Client ID: " + (DISCORD_CLIENT_ID ? "✅ Настроен" : "❌ Отсутствует"));

// Экспортируем в глобальную область видимости
if (typeof window !== 'undefined') {
    window.DISCORD_CONFIG = DISCORD_CONFIG;
    window.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
    window.DISCORD_CLIENT_ID = DISCORD_CLIENT_ID;
}

// Для прямого доступа (если не через window)
if (typeof globalThis !== 'undefined') {
    globalThis.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
    globalThis.DISCORD_CONFIG = DISCORD_CONFIG;
    globalThis.DISCORD_CLIENT_ID = DISCORD_CLIENT_ID;
}
