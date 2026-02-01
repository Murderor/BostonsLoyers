// ⚠️ ВНИМАНИЕ: Этот файл создан автоматически GitHub Actions
// ⚠️ Не добавляйте его в git!
// ⚠️ Реальный вебхук находится только здесь

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1465718072823513274/7G5O9bao4TWMYzwcggviBuax6t8i-sMavDqT3s9Sbfq7MohsOn_m_PaCdh5BcQOpajht";
const DISCORD_CONFIG = {
    webhook: "https://discord.com/api/webhooks/1465718072823513274/7G5O9bao4TWMYzwcggviBuax6t8i-sMavDqT3s9Sbfq7MohsOn_m_PaCdh5BcQOpajht",
    version: "1.0",
    buildDate: "$(date '+%Y-%m-%d %H:%M:%S')",
    buildId: "21560713594",
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

console.log("✅ Discord Config загружен (версия " + DISCORD_CONFIG.version + ")");
console.log("📅 Сборка: " + DISCORD_CONFIG.buildDate);

if (typeof window !== 'undefined') {
    window.DISCORD_CONFIG = DISCORD_CONFIG;
    window.DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL;
}
