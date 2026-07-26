const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        // userMessage est déjà nettoyé du mot "antilink" par le handler → "on" / "off" / "set delete"...
        const args = userMessage.toLowerCase().trim().split(' ');
        const action = args[0];

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: `❌ *L'anti-lien ne fonctionne que dans les groupes !*`
            }, { quoted: message });
        }

        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Seuls les admins peuvent gérer l'anti-lien.*`
            }, { quoted: message });
        }

        if (!action) {
            const existing = await getAntilink(chatId, 'on');
            const current = existing?.enabled ? '🟢 Activé' : '🔴 Désactivé';
            return await sock.sendMessage(chatId, {
                text: `╔══✦𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗✦═══>🥷
║»👾 *ANTI-LIEN*
╚══════════════════>🥷

📊 *Statut :* ${current}

📌 *Commandes :*
║❒ antilink on
║❒ antilink off
║❒ antilink set delete
║❒ antilink set kick
║❒ antilink set warn

> 🥷 _by *IB- CENTRAL-HEX*_`
            }, { quoted: message });
        }

        switch (action) {
            case 'on': {
                const existing = await getAntilink(chatId, 'on');
                if (existing?.enabled) {
                    return await sock.sendMessage(chatId, { text: `⚠️ *Anti-Lien est déjà activé !*` }, { quoted: message });
                }
                await setAntilink(chatId, 'on', 'delete');
                return await sock.sendMessage(chatId, { text: `🔗 *Anti-Lien :* 🟢 Activé\n_Tous les liens seront supprimés._` }, { quoted: message });
            }
            case 'off': {
                await removeAntilink(chatId, 'on');
                return await sock.sendMessage(chatId, { text: `🔗 *Anti-Lien :* 🔴 Désactivé` }, { quoted: message });
            }
            case 'set': {
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { text: `❌ *Action invalide !*\nChoisis : delete | kick | warn` }, { quoted: message });
                }
                await setAntilink(chatId, 'on', setAction);
                return await sock.sendMessage(chatId, { text: `✅ *Action anti-lien :* ${setAction}` }, { quoted: message });
            }
            default:
                return await sock.sendMessage(chatId, { text: `❌ *Commande inconnue.*\nUsage : antilink on | off | set delete/kick/warn` }, { quoted: message });
        }
    } catch (e) {
        console.error('❌ [antilink]', e.message);
        await sock.sendMessage(chatId, { text: `❌ *Erreur :* ${e.message}` }, { quoted: message });
    }
}

module.exports = { handleAntilinkCommand };

