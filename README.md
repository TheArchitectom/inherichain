# Inherichain 🔐

**Digital Crypto Inheritance** — Your Keys. Your Rules. Your Legacy.

Ensure your cryptocurrency reaches your loved ones with client-side encryption, no custody, no KYC.

![Inherichain](https://img.shields.io/badge/Status-MVP-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-06b6d4)

---

## Features

- 🔒 **Client-Side Encryption** — Your data is encrypted in your browser using AES-256-GCM. We never see your secrets.
- ⛓️ **Multi-Chain Support** — Track Bitcoin, Ethereum, Solana, Chainlink, Quant, Bittensor, Kaspa, and more.
- ⏰ **Dead Man's Switch** — Automatic release to beneficiaries after configurable inactivity period.
- 👁️ **Zero Knowledge** — No KYC, no accounts, no tracking. Complete privacy.
- 👨‍👩‍👧 **Simple Beneficiary Access** — Non-crypto-native family members can easily claim inheritance.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Locally

```bash
npm start
```

Opens [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
```

Creates optimized build in the `build` folder.

---

## Deploy to Netlify

### Option A: Git Integration (Recommended)

1. Push this repo to GitHub
2. Log into [Netlify](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repo
5. Build settings are auto-detected:
   - Build command: `npm run build`
   - Publish directory: `build`
6. Click Deploy

### Option B: Manual Deploy

1. Run `npm run build`
2. Drag the `build` folder to Netlify

---

## How It Works

### For Vault Owners

1. **Create a Vault** — Set up your master password (shared offline with beneficiaries)
2. **Add Beneficiaries** — Name, wallet address, email
3. **Track Wallets** — Add all your wallet addresses (view-only)
4. **Store Secrets** — Seed phrases, passwords, exchange logins (encrypted client-side)
5. **Configure Dead Man's Switch** — Set check-in frequency and grace period
6. **Check In Regularly** — Prove you're still active
7. **Export Encrypted Vault** — Share the encrypted JSON with beneficiaries

### For Beneficiaries

1. **Receive Encrypted Vault** — JSON file from vault owner
2. **Receive Master Password** — Shared offline by vault owner
3. **Wait for Inactivity** — Vault becomes claimable after owner misses check-ins
4. **Decrypt Vault** — Enter password to reveal wallet addresses and recovery secrets

---

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR BROWSER                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. You enter seed phrases / passwords              │   │
│  │  2. Encrypted locally with AES-256-GCM              │   │
│  │  3. Only encrypted data leaves your device          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**What an attacker would need:**
1. ✅ Your encrypted vault file → Useless without password
2. ❌ Your master password → Shared offline, never transmitted

---

## Tech Stack

- **React 18** — UI framework
- **Web Crypto API** — AES-256-GCM encryption
- **Canvas API** — Neural nebula background animation
- **Netlify** — Hosting

---

## Roadmap

- [ ] Email notifications for check-in reminders
- [ ] On-chain vault hash for immutability
- [ ] Multi-signature beneficiary requirements
- [ ] Mobile app (React Native)
- [ ] Hardware wallet integration

---

## Disclaimer

⚠️ **Important:** Inherichain is a software tool only. It does not custody, control, or have access to your cryptocurrency, private keys, or digital assets. 

This service is provided "as-is" without warranties. It does not constitute legal, financial, tax, or estate planning advice. Use at your own risk.

See full disclaimer in the application.

---

## License

MIT © Inherichain

---

## Contact

Built by [OuterMoon AI](https://outermoonai.com)
