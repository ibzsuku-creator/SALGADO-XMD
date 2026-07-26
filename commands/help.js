const settings = require('../settings');

async function helpCommand(sock, chatId, message) {
    const caption = `╔══✦𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗✦═══>🥷
║»👾 *ᴀɪᴅᴇ ᴅᴜ ʙᴏᴛ*
╚══════════════════>🥷

Ce bot fonctionne *sans préfixe* : tape juste le nom de la commande directement.

Exemple : écris simplement *menu* ou *ping*, sans point devant.

Tape *menu* pour voir la liste complète des commandes disponibles.

📞 *Support :* +${settings.ownerNumber}

> 🥷 _by *IB- CENTRAL-HEX*_`;

    await sock.sendMessage(chatId, {
        image: { url: settings.menuImage },
        caption
    }, { quoted: message });
}

module.exports = helpCommand;

