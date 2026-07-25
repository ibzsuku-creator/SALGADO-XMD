<div align="center">

<img src="https://i.ibb.co/mVwPDPZG/file-000000002d5081f4a61a8a350d76d247.png" width="1000" alt="SALGA-XMD" />

# 🥷 SALGA-XMD

**Bot WhatsApp sans préfixe, multi-fonctions, connectable via une simple page web**

_Système CENTRAL-HEX_

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?logo=node.js)](https://nodejs.org)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp)](https://github.com/WhiskeySockets/Baileys)
[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)]()

</div>

---

## ✨ Présentation

**SALGA-XMD** est un bot WhatsApp conçu pour être simple à utiliser : **aucun préfixe** — tape directement le nom d'une commande (`menu`, `ping`, `gpt bonjour`...) et le bot répond.

Pas besoin de panel d'administration ni de terminal pour le connecter : une **page web intégrée** permet à n'importe qui de scanner un QR Code ou d'entrer son numéro pour recevoir un **code de pairing**, exactement comme WhatsApp Web.

| | |
|---|---|
| 🥷 **Nom** | SALGA-XMD |
| 👤 **Développeur** | IBRAHIMA SORY SACKO |
| 🏷️ **Système** | CENTRAL-HEX |
| 📞 **Contact** | +224 62 19 63 059 |
| ⚙️ **Préfixe** | Aucun |

---

## 📜 Commandes disponibles

| Commande | Description |
|---|---|
| `menu` | Menu |
| `mode public` / `mode private` | Accès |
| `help` | Aide |
| `ping` | Vitesse |
| `waouh` | Save média → MP |
| `owner` | Créateur |
| `humm` | Save média → MP |
| `tagall` | Mention all |
| `save` | Sauvegarde |
| `gpt <question>` | IA |
| `sticker` | Sticker |
| `antilink on` / `antilink off` | Anti-lien |
| `kick` | Éjecter un membre (mention ou reply) |
| `antidelete on` / `antidelete off` | Renvoie les messages supprimés au propriétaire |

---

## 🚀 Installation locale

```bash
npm install --legacy-peer-deps
npm start
```

Le serveur démarre sur `http://localhost:3000` (port modifiable via `.env`).

## 🔗 Connexion du bot

1. Ouvre la page web (`http://localhost:3000` ou ton domaine une fois déployé)
2. **Onglet Code Pair** → entre ton numéro WhatsApp au format international sans `+` (ex : `224621963059`) → un code s'affiche
   - WhatsApp → **⋮ → Appareils liés → Lier un appareil → Lier avec un numéro de téléphone** → colle le code
3. **Ou onglet QR Code** → scanne comme sur WhatsApp Web

Une fois lié, le bot se connecte automatiquement et reste actif tant que le serveur tourne.

> ⚠️ Le processus Node.js doit rester actif en permanence. Les sessions sont stockées dans `sessions/<id>/` — ne pas supprimer ce dossier sous peine de devoir re-générer un code.

---

## ☁️ Déploiement sur Render.com

### 1. Pousser le code sur GitHub
```bash
git init
git add .
git commit -m "Initial commit - SALGA-XMD"
git branch -M main
git remote add origin https://github.com/<ton-user>/salga-xmd.git
git push -u origin main
```

### 2. Créer le service Web sur Render
1. [render.com](https://render.com) → **New → Web Service** → connecte le dépôt `salga-xmd`
2. Render détecte `render.yaml` automatiquement, sinon configure :
   - **Build Command** : `npm install --legacy-peer-deps`
   - **Start Command** : `npm start`
3. **Ajoute un disque persistant** (onglet *Disks*) monté sur `/opt/render/project/src/sessions` — indispensable, sinon la session est effacée à chaque redéploiement
4. **Choisis un plan payant (Starter minimum)** — le plan gratuit met le service en veille après 15 min d'inactivité, ce qui coupe la connexion WhatsApp

### 3. Utilisation
Une fois déployé, ton URL Render (ex : `https://salga-xmd.onrender.com`) remplace `localhost:3000` — c'est ce lien à partager pour que n'importe qui puisse connecter son propre numéro.

---

## 🗂️ Structure du projet

```
salga-xmd/
├── server.js            # Serveur Express + routes de connexion
├── session-manager.js   # Gestion des sessions Baileys (QR + pairing)
├── handler.js           # Dispatch des commandes (sans préfixe)
├── settings.js          # Configuration du bot
├── commands/             # Toutes les commandes
├── lib/                  # Fonctions utilitaires (antilink, isAdmin, index)
├── public/index.html     # Page web de connexion
└── data/                 # Fichiers de configuration (mode, antilink...)
```

---

<div align="center">

🥷 **by IB- CENTRAL-HEX**

</div>
