require('dotenv').config();
const express = require('express');
const path = require('path');
const { startSession, getSession } = require('./session-manager');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ── Page d'accueil ──
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Demander un code de pairing pour un numéro ──
app.post('/api/pair', async (req, res) => {
    try {
        const { number } = req.body;
        const cleanNumber = String(number || '').replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 8) {
            return res.status(400).json({ error: 'Numéro invalide. Utilise le format international sans + (ex: 224621963059).' });
        }

        const sessionId = `num_${cleanNumber}`;
        await startSession(sessionId, { usePairingCode: true, phoneNumber: cleanNumber });

        // Attendre que le code soit généré (max 15s)
        let tries = 0;
        while (tries < 30) {
            const s = getSession(sessionId);
            if (s?.status === 'waiting_code' && s.code) {
                return res.json({ sessionId, code: s.code });
            }
            if (s?.status === 'error') {
                return res.status(500).json({ error: s.error || 'Erreur génération du code.' });
            }
            if (s?.status === 'connected') {
                return res.json({ sessionId, connected: true });
            }
            await new Promise(r => setTimeout(r, 500));
            tries++;
        }
        return res.status(504).json({ error: 'Le code met trop de temps à être généré, réessaie.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ── Démarrer une session en mode QR ──
app.post('/api/qr', async (req, res) => {
    try {
        const sessionId = `qr_${Date.now()}`;
        await startSession(sessionId, { usePairingCode: false });
        res.json({ sessionId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── Vérifier l'état d'une session (QR image + statut de connexion) ──
app.get('/api/status/:sessionId', (req, res) => {
    const s = getSession(req.params.sessionId);
    if (!s) return res.status(404).json({ error: 'Session introuvable' });
    res.json({
        status: s.status,
        qr: s.qr || null,
        code: s.code || null
    });
});

app.listen(PORT, () => {
    console.log(`🥷 SALGA-XMD — serveur de connexion lancé sur http://localhost:${PORT}`);
});

