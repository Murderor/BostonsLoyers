// discord-config.js - ШАБЛОН
// Этот файл будет заменен GitHub Actions на реальный конфиг

const DISCORD_WEBHOOK_URL = "{{DISCORD_WEBHOOK_PLACEHOLDER}}";

const DISCORD_CONFIG = {
    webhook: "{{DISCORD_WEBHOOK_PLACEHOLDER}}",
    version: "1.0",
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

console.log("⚠️ Discord Config: ТЕСТОВЫЙ РЕЖИМ");
console.log("👉 Запустите GitHub Actions для получения реального конфига");

// Экспортируем для использования в других файлах
if (typeof window !== 'undefined') {
    window.DISCORD_CONFIG = DISCORD_CONFIG;
    window.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
}
