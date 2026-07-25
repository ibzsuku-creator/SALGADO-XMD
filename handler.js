const settings = require('./settings');
const isAdmin = require('./lib/isAdmin');
const { Antilink } = require('./lib/antilink');

const menuCommand = require('./commands/menu');
const helpCommand = require('./commands/help');
const pingCommand = require('./commands/ping');
const waouhCommand = require('./commands/waouh');
const ownerCommand = require('./commands/owner');
const hummCommand = require('./commands/humm');
const tagAllCommand = require('./commands/tagall');
const saveCommand = require('./commands/save');
const gptCommand = require('./commands/gpt');
const stickerCommand = require('./commands/sticker');
const { handleAntilinkCommand } = require('./commands/antilink');
const { modeCommand, readMode } = require('./commands/mode');
const kickCommand = require('./commands/kick');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');

function getText(message) {
    return (
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        ''
    ).trim();
}

// Déballe un message cité et renvoie le média SEULEMENT s'il s'agit d'une "vue unique" (view once).
// Retourne null pour tout le reste (média normal, texte, pas de citation, etc.)
function extractViewOnceMedia(quotedMessage) {
    if (!quotedMessage) return null;

    // Formats d'enveloppe "vue unique" (selon la version du client WhatsApp qui a envoyé le média)
    const unwrapped =
        quotedMessage.viewOnceMessageV2?.message ||
        quotedMessage.viewOnceMessageV2Extension?.message ||
        quotedMessage.viewOnceMessage?.message ||
        quotedMessage;

    if (unwrapped.imageMessage && (unwrapped.imageMessage.viewOnce || quotedMessage.viewOnceMessageV2 || quotedMessage.viewOnceMessage)) {
        return { type: 'image', content: unwrapped.imageMessage };
    }
    if (unwrapped.videoMessage && (unwrapped.videoMessage.viewOnce || quotedMessage.viewOnceMessageV2 || quotedMessage.viewOnceMessage)) {
        return { type: 'video', content: unwrapped.videoMessage };
    }
    return null;
}

async function handleMessages(sock, { messages, type }) {
    let chatId = null;
    try {
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message?.message) return;

        chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwnerOrSudo = message.key.fromMe || senderId.split('@')[0] === settings.ownerNumber;

        // ── Antidelete : stocke le message (si activé) + gère les révocations ──
        try { await storeMessage(sock, message); } catch (e) { console.error('storeMessage error:', e.message); }
        if (message.message?.protocolMessage?.type === 0) {
            try { await handleMessageRevocation(sock, message); } catch (e) { console.error('Revocation error:', e.message); }
            return;
        }

        // ── Anti-lien (toujours actif dans les groupes, quel que soit le mode) ──
        if (isGroup) {
            try { await Antilink(message, sock); } catch (e) { console.error('Antilink error:', e.message); }
        }

        const rawText = getText(message);
        if (!rawText) return;

        // ── Sans préfixe : le premier mot EST la commande ──
        const parts = rawText.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const rest = parts.slice(1).join(' ');

        // ── Mode public/private : hors "owner"/"mode", tout le reste est bloqué si privé et non-owner ──
        const modeData = readMode();
        const isPublic = modeData.isPublic !== false;
        if (!isPublic && !isOwnerOrSudo) return; // silence, pas d'erreur, comportement volontaire

        console.log(`📝 Commande reçue [${isGroup ? 'groupe' : 'privé'}] : ${cmd}`);

        switch (cmd) {
            case 'menu':
                return await menuCommand(sock, chatId, message, senderId);

            case 'help':
                return await helpCommand(sock, chatId, message);

            case 'ping':
                return await pingCommand(sock, chatId, message);

            case 'waouh': {
                // Ne réagit QUE si le message est exactement "waouh" (rien d'autre)
                // ET qu'il répond à un média envoyé en "vue unique". Sinon : silence total.
                if (rawText.trim().toLowerCase() !== 'waouh') return;
                const quotedInfo = message.message?.extendedTextMessage?.contextInfo;
                const viewOnce = extractViewOnceMedia(quotedInfo?.quotedMessage);
                if (!viewOnce) return;
                return await waouhCommand(sock, chatId, senderId, viewOnce, message);
            }

            case 'owner':
                return await ownerCommand(sock, chatId, message);

            case 'humm': {
                // Ne réagit QUE si le message est exactement "humm" (rien d'autre)
                // ET qu'il répond à un média envoyé en "vue unique". Sinon : silence total.
                if (rawText.trim().toLowerCase() !== 'humm') return;
                const quotedInfo = message.message?.extendedTextMessage?.contextInfo;
                const viewOnce = extractViewOnceMedia(quotedInfo?.quotedMessage);
                if (!viewOnce) return;
                return await hummCommand(sock, chatId, senderId, viewOnce, message);
            }

            case 'tagall':
                return await tagAllCommand(sock, chatId, senderId, message);

            case 'save': {
                const quotedInfo = message.message?.extendedTextMessage?.contextInfo;
                const replyMessage = quotedInfo?.quotedMessage;
                return await saveCommand(sock, chatId, senderId, replyMessage, message);
            }

            case 'gpt':
                return await gptCommand(sock, chatId, message);

            case 'sticker':
                return await stickerCommand(sock, chatId, message);

            case 'antilink': {
                const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
                return await handleAntilinkCommand(sock, chatId, rest, senderId, isSenderAdmin || isOwnerOrSudo, message);
            }

            case 'mode':
                return await modeCommand(sock, chatId, rest, message, isOwnerOrSudo);

            case 'kick': {
                const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                return await kickCommand(sock, chatId, senderId, mentionedJids, message);
            }

            case 'antidelete':
                return await handleAntideleteCommand(sock, chatId, message, rest.toLowerCase().trim(), isOwnerOrSudo);

            default:
                return; // commande inconnue → silence, pas de spam
        }
    } catch (error) {
        console.error('❌ Erreur handler:', error.message);
        if (chatId) {
            try {
                await sock.sendMessage(chatId, { text: '❌ Une erreur est survenue lors du traitement de la commande.' });
            } catch (e2) { console.error('Impossible d\'envoyer le message d\'erreur:', e2.message); }
        }
    }
}

module.exports = { handleMessages };

