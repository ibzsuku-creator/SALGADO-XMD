const fs = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { handleMessages } = require('./handler');

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// sessions[id] = { sock, status: 'waiting_qr'|'waiting_code'|'connected'|'error', qr, code, number }
const sessions = {};

function sanitizeId(id) {
    return String(id).replace(/[^0-9a-zA-Z_]/g, '');
}

async function startSession(rawId, { usePairingCode = false, phoneNumber = null } = {}) {
    const id = sanitizeId(rawId);
    if (sessions[id] && sessions[id].sock && sessions[id].status === 'connected') {
        return sessions[id];
    }

    const authDir = path.join(SESSIONS_DIR, id);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: usePairingCode ? Browsers.ubuntu('Chrome') : Browsers.macOS('Safari'),
        markOnlineOnConnect: true
    });

    sessions[id] = { sock, status: usePairingCode ? 'requesting_code' : 'waiting_qr', qr: null, code: null, number: phoneNumber };

    // Demande du code de pairing (si un numéro est fourni)
    if (usePairingCode && phoneNumber && !state.creds.registered) {
        try {
            await new Promise(r => setTimeout(r, 1500)); // laisser le socket s'initialiser
            const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            sessions[id].code = code?.match(/.{1,4}/g)?.join('-') || code;
            sessions[id].status = 'waiting_code';
        } catch (e) {
            console.error('Erreur génération pairing code:', e.message);
            sessions[id].status = 'error';
            sessions[id].error = e.message;
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !usePairingCode) {
            sessions[id].qr = await QRCode.toDataURL(qr);
            sessions[id].status = 'waiting_qr';
        }

        if (connection === 'open') {
            sessions[id].status = 'connected';
            sessions[id].qr = null;
            sessions[id].code = null;
            console.log(`✅ [${id}] Bot SALGA-XMD connecté !`);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output?.statusCode
                : null;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log(`♻️ [${id}] Reconnexion...`);
                setTimeout(() => startSession(id, { usePairingCode, phoneNumber }), 3000);
            } else {
                console.log(`🚪 [${id}] Déconnecté (logout). Session supprimée.`);
                sessions[id].status = 'logged_out';
                try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) {}
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try { await handleMessages(sock, m); } catch (e) { console.error('handleMessages error:', e.message); }
    });

    return sessions[id];
}

function getSession(id) {
    return sessions[sanitizeId(id)];
}

// ── Relance automatiquement toutes les sessions déjà liées (dossier existant sur disque) ──
// À appeler une fois au démarrage du serveur, pour survivre à un redémarrage Render.
async function resumeAllSessions() {
    const ids = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const id of ids) {
        const credsPath = path.join(SESSIONS_DIR, id, 'creds.json');
        if (!fs.existsSync(credsPath)) continue; // dossier vide/non lié, on ignore

        console.log(`♻️ Reprise automatique de la session : ${id}`);
        try {
            await startSession(id, { usePairingCode: false });
        } catch (e) {
            console.error(`❌ Échec de reprise pour ${id}:`, e.message);
        }
    }
}

module.exports = { startSession, getSession, sessions, resumeAllSessions };

