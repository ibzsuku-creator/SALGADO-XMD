const settings = require('../settings');

function formatUptime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = Math.floor(s % 60);
    return `${h}h ${m}m ${sc}s`;
}

async function pingCommand(sock, chatId, message) {
    const start = Date.now();
    await sock.sendMessage(chatId, { react: { text: '⏱️', key: message.key } });
    const ping = Date.now() - start;

    const caption = `╔══✦𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗✦═══>🥷
║»👾 *Statut* : En ligne ✅
║»👾 *Ping* : ${ping} ms
║»👾 *Uptime* : ${formatUptime(process.uptime())}
║»👾 *Mode* : ${settings.commandMode}
╚══════════════════>🥷

> 🥷 _by *IB- CENTRAL-HEX*_`;

    await sock.sendMessage(chatId, { text: caption }, { quoted: message });
}

module.exports = pingCommand;

