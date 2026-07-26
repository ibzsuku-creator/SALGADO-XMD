const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const settings = require('../settings');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../temp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { activé: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch { return { activé: false }; }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ── Commande : antidelete on/off/status ──
async function handleAntideleteCommand(sock, chatId, message, match, isOwnerOrSudo) {
    if (!isOwnerOrSudo) {
        return sock.sendMessage(chatId, { text: `❌ *Seul le propriétaire peut utiliser cette commande.*` }, { quoted: message });
    }

    const config = loadConfig();

    if (!match) {
        return sock.sendMessage(chatId, {
            text: `🥷 *𝗦𝗔𝗟𝗚𝗔-𝗫𝗠𝗗*\n\n💾 *ANTIDELETE*\nStatut : ${config.activé ? '🟢 Activé' : '🔴 Désactivé'}\n\n📌 antidelete on | antidelete off`
        }, { quoted: message });
    }

    if (match === 'on') config.activé = true;
    else if (match === 'off') config.activé = false;
    else return sock.sendMessage(chatId, { text: `❌ Usage : antidelete on | off` }, { quoted: message });

    saveConfig(config);
    return sock.sendMessage(chatId, { text: `✅ *Antidelete ${match === 'on' ? 'activé' : 'désactivé'}*` }, { quoted: message });
}

// ── Stocke temporairement les messages "normaux" (PAS les vues uniques) pour pouvoir
// les récupérer s'ils sont supprimés. Aucune capture automatique de vue unique ici. ──
async function storeMessage(sock, message) {
    try {
        const config = loadConfig();
        if (!config.activé) return;
        if (!message.key?.id) return;

        // ⛔ On ignore volontairement les vues uniques : pas de capture silencieuse.
        if (message.message?.viewOnceMessageV2 || message.message?.viewOnceMessage || message.message?.viewOnceMessageV2Extension) {
            return;
        }

        const messageId = message.key.id;
        const sender = message.key.participant || message.key.remoteJid;
        let content = '', mediaType = '', mediaPath = '';

        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const buffer = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        } else {
            return; // rien à stocker
        }

        messageStore.set(messageId, {
            content, mediaType, mediaPath, sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        // Auto-nettoyage après 24h pour ne pas accumuler indéfiniment
        setTimeout(() => {
            const entry = messageStore.get(messageId);
            if (entry?.mediaPath && fs.existsSync(entry.mediaPath)) {
                try { fs.unlinkSync(entry.mediaPath); } catch {}
            }
            messageStore.delete(messageId);
        }, 24 * 60 * 60 * 1000);

    } catch (err) {
        console.error('storeMessage error:', err.message);
    }
}

// ── Gère la suppression : renvoie le message original au propriétaire ──
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadConfig();
        if (!config.activé) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = settings.ownerNumber + '@s.whatsapp.net';

        if (deletedBy === ownerNumber || deletedBy.includes(sock.user?.id || '')) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const senderName = original.sender.split('@')[0];
        const groupName = original.group ? (await sock.groupMetadata(original.group)).subject : '';
        const time = new Date().toLocaleString('fr-FR', { hour12: false });

        let text = `🥷 *SALGA-XMD — MESSAGE SUPPRIMÉ*\n\n` +
            `🗑️ *Supprimé par :* @${deletedBy.split('@')[0]}\n` +
            `👤 *Expéditeur :* @${senderName}\n` +
            `🕒 *Heure :* ${time}\n`;
        if (groupName) text += `👥 *Groupe :* ${groupName}\n`;
        if (original.content) text += `\n💬 *Contenu :*\n${original.content}`;

        await sock.sendMessage(ownerNumber, { text, mentions: [deletedBy, original.sender] });

        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
            const caption = `🥷 Média supprimé (${original.mediaType}) — de @${senderName}`;
            try {
                if (original.mediaType === 'image') await sock.sendMessage(ownerNumber, { image: { url: original.mediaPath }, caption, mentions: [original.sender] });
                else if (original.mediaType === 'video') await sock.sendMessage(ownerNumber, { video: { url: original.mediaPath }, caption, mentions: [original.sender] });
                else if (original.mediaType === 'sticker') await sock.sendMessage(ownerNumber, { sticker: { url: original.mediaPath } });
                else if (original.mediaType === 'audio') await sock.sendMessage(ownerNumber, { audio: { url: original.mediaPath }, mimetype: 'audio/mpeg' });
            } catch (err) {
                console.error('Antidelete media send error:', err.message);
            }
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);
    } catch (err) {
        console.error('handleMessageRevocation error:', err.message);
    }
}

module.exports = { handleAntideleteCommand, handleMessageRevocation, storeMessage };

