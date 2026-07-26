const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.botOwner}\nTEL;waid=${settings.ownerNumber}:${settings.ownerNumber}\nEND:VCARD`;

    const caption = `╔══✦𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗✦═══>🥷
║»👾 LE BOT A ÉTÉ CRÉÉ PAR
║»👾 *${settings.botOwner}*
║»👾 DANS LE SYSTÈME
║»👾 *${settings.system}*
╚══════════════════>🥷

📞 *Contact :* +${settings.ownerNumber}
🤖 *Bot :* ${settings.botName}
📦 *Version :* v${settings.version}

> 🥷 _by *IB- CENTRAL-HEX*_`;

    await sock.sendMessage(chatId, {
        contacts: {
            displayName: settings.botOwner,
            contacts: [{ vcard }]
        }
    }, { quoted: message });

    await sock.sendMessage(chatId, {
        image: { url: settings.menuImage },
        caption
    }, { quoted: message });
}

module.exports = ownerCommand;

