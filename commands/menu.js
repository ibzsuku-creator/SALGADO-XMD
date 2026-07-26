const settings = require('../settings');

function getHeure() {
    return new Date().toLocaleTimeString('fr-FR', { timeZone: 'GMT', hour: '2-digit', minute: '2-digit' });
}

async function menuCommand(sock, chatId, message, senderId) {
    const caption = `╔══✦𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗✦═══>🥷
║»👾 *ʙᴏᴛ ɴᴀᴍᴇ* : ${settings.botName}
║»👾 *ᴜsᴇʀɴᴀᴍᴇ* : CENTRAL-HEX
║»👾 *ᴅᴇᴠᴇʟᴏᴘᴇʀ* : IB🥷
║»👾 *⏰ ʜᴇᴜʀᴇ* : ${getHeure()}
╚══════════════════>🥷
       𝐂𝐄𝐍𝐓𝐑𝐀-𝐇𝐄𝐗
╔══════𝗚𝗘𝗡𝗘𝗥𝗔𝗟══════>🥷
║❒ menu → Menu
║❒ mode public/private 
║❒ help → Aide
║❒ ping → Vitesse
║❒ waouh → Save média 
║❒ owner → Créateur
║❒ humm → Save média 
║❒ tagall → Mention all
║❒ save → Sauvegarde
║❒ gpt <question> → IA
║❒ sticker → Sticker
║❒ antilink → Anti-lien
║❒ kick → Éjecter un membre
║❒ antidelete on/off → suppr
╚═══════════════════>🥷

> 🥷 _by *IB- CENTRAL-HEX*_`;

    await sock.sendMessage(chatId, {
        image: { url: settings.menuImage },
        caption,
    }, { quoted: message });
}

module.exports = menuCommand;

