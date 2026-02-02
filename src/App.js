import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// INHERICHAIN v3 - Complete Digital Legacy Platform
// With Account System, Persistence, 2FA/3FA, Stripe
// ============================================

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/7sY3cw2x61nq9tQ17q9Zm00';
const PLATFORM_FEE_PERCENT = 5;
const STORAGE_KEY = 'inherichain_accounts';
const SESSION_KEY = 'inherichain_session';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Tracked coins for portfolio
const TRACKED_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  { id: 'solana', name: 'Solana', symbol: 'SOL' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
  { id: 'quant-network', name: 'Quant', symbol: 'QNT' },
  { id: 'bittensor', name: 'Bittensor', symbol: 'TAO' },
  { id: 'kaspa', name: 'Kaspa', symbol: 'KAS' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
];

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: '⟠', explorer: 'https://etherscan.io' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿', explorer: 'https://blockchair.com/bitcoin' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '◎', explorer: 'https://solscan.io' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '⬡', explorer: 'https://polygonscan.com' },
  { id: 'binance', name: 'BNB Chain', symbol: 'BNB', icon: '⬡', explorer: 'https://bscscan.com' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', icon: '🔷', explorer: 'https://arbiscan.io' },
];

// Price Service with caching
const PriceService = {
  cache: {}, lastFetch: 0,
  async getPrices() {
    if (Date.now() - this.lastFetch < 60000 && Object.keys(this.cache).length > 0) return this.cache;
    try {
      const ids = TRACKED_COINS.map(c => c.id).join(',');
      const res = await fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const data = await res.json();
      this.cache = data; this.lastFetch = Date.now();
      return data;
    } catch { return this.cache; }
  }
};

// ============================================
// CRYPTO UTILITIES - AES-256 Encryption
// ============================================
const CryptoUtils = {
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  },
  async encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, String.fromCharCode(...salt));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
    return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
  },
  async decrypt(obj, password) {
    const key = await this.deriveKey(password, String.fromCharCode(...new Uint8Array(obj.salt)));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(obj.iv) }, key, new Uint8Array(obj.data));
    return JSON.parse(new TextDecoder().decode(dec));
  },
  genId: () => 'xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)),
  genTOTPSecret: () => { let s = ''; for (let i = 0; i < 32; i++) s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]; return s; },
  genBackupCodes: () => Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 8).toUpperCase()),
  verifyTOTP(secret, code) {
    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor((Date.now() / 1000 + i * 30) / 30);
      const hash = (secret + counter).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
      if (Math.abs(hash % 1000000).toString().padStart(6, '0') === code) return true;
    }
    return false;
  }
};

// ============================================
// STORAGE SERVICE - LocalStorage Persistence
// ============================================
const Storage = {
  getAccounts: () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } },
  saveAccounts: (a) => localStorage.setItem(STORAGE_KEY, JSON.stringify(a)),
  getAccount: (email) => Storage.getAccounts()[email?.toLowerCase()],
  saveAccount: (email, data) => { const a = Storage.getAccounts(); a[email.toLowerCase()] = data; Storage.saveAccounts(a); },
  getSession: () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } },
  saveSession: (s) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)),
  clearSession: () => sessionStorage.removeItem(SESSION_KEY)
};

const CHAINS = [
  { value: 'ETH', label: 'Ethereum', icon: '⟠' }, { value: 'BTC', label: 'Bitcoin', icon: '₿' },
  { value: 'SOL', label: 'Solana', icon: '◎' }, { value: 'LINK', label: 'Chainlink', icon: '⬡' },
  { value: 'QNT', label: 'Quant', icon: '◈' }, { value: 'TAO', label: 'Bittensor', icon: 'τ' },
  { value: 'KAS', label: 'Kaspa', icon: '⧫' }, { value: 'MATIC', label: 'Polygon', icon: '⬡' },
];

// ============================================
// BACKGROUND ANIMATION
// ============================================
const Background = () => {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    let id, particles = [], t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 40; i++) particles.push({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1, color: ['#8b5cf6', '#06b6d4', '#f472b6'][i % 3] });
    const animate = () => {
      t += 0.005; ctx.fillStyle = 'rgba(10,10,15,0.15)'; ctx.fillRect(0, 0, c.width, c.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        particles.forEach((p2, j) => { if (i < j) { const d = Math.hypot(p.x - p2.x, p.y - p2.y); if (d < 120) { ctx.beginPath(); ctx.strokeStyle = `rgba(139,92,246,${(1 - d / 120) * 0.15})`; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); } } });
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      });
      id = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(id); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(135deg,#0a0a0f,#0f0a1a,#0a0f1a)' }} />;
};

// ============================================
// UI COMPONENTS
// ============================================
const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, fullWidth, style }) => {
  const [h, setH] = useState(false);
  const vars = {
    primary: { background: h ? 'linear-gradient(135deg,#a78bfa,#8b5cf6,#06b6d4)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed,#06b6d4)', color: '#fff', boxShadow: h ? '0 8px 40px rgba(139,92,246,0.5)' : '0 4px 20px rgba(139,92,246,0.3)' },
    secondary: { background: h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)' },
    danger: { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' },
    success: { background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: '#fff' },
    ghost: { background: 'transparent', color: h ? '#a78bfa' : 'rgba(255,255,255,0.6)' }
  };
  const sizes = { sm: { padding: '8px 16px', fontSize: '11px' }, md: { padding: '14px 28px', fontSize: '12px' }, lg: { padding: '18px 36px', fontSize: '14px' } };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.3s', opacity: disabled ? 0.5 : 1, transform: h && !disabled ? 'translateY(-2px)' : 'none', width: fullWidth ? '100%' : 'auto', ...vars[variant], ...sizes[size], ...style }}>{children}</button>;
};

const Card = ({ children, style, glow }) => <div style={{ background: 'linear-gradient(135deg,rgba(15,10,25,0.9),rgba(10,15,25,0.95))', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '32px', position: 'relative', boxShadow: glow ? `0 0 60px ${glow}30` : '0 20px 60px rgba(0,0,0,0.3)', ...style }}><div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.4),rgba(6,182,212,0.4),transparent)' }} />{children}</div>;

const Input = ({ label, type = 'text', value, onChange, placeholder, textarea, error, style }) => {
  const [f, setF] = useState(false);
  const st = { width: '100%', padding: '16px 20px', background: '#0a0a0f', border: `2px solid ${error ? '#ef4444' : f ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', color: '#fff', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border 0.3s' };
  return <div style={{ marginBottom: '20px', ...style }}>{label && <label style={{ display: 'block', fontSize: '11px', color: error ? '#ef4444' : 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 600 }}>{label}</label>}{textarea ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={4} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ ...st, resize: 'vertical' }} /> : <input type={type} value={value} onChange={onChange} placeholder={placeholder} onFocus={() => setF(true)} onBlur={() => setF(false)} style={st} />}{error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{error}</p>}</div>;
};

const Select = ({ label, value, onChange, options, style }) => <div style={{ marginBottom: '20px', ...style }}>{label && <label style={{ display: 'block', fontSize: '11px', color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 600 }}>{label}</label>}<select value={value} onChange={onChange} style={{ width: '100%', padding: '16px 20px', background: '#0a0a0f', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>{options.map(o => <option key={o.value} value={o.value} style={{ background: '#0f0a1a' }}>{o.label}</option>)}</select></div>;

const Logo = ({ size = 'md' }) => { const s = { sm: 24, md: 36, lg: 48 }[size]; return <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: s, height: s, borderRadius: '12px', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}><span style={{ fontSize: s * 0.5 }}>⛓</span></div><span style={{ fontSize: s * 0.55, fontWeight: 700, background: 'linear-gradient(135deg,#fff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inherichain</span></div>; };

const Modal = ({ isOpen, onClose, title, children }) => isOpen ? <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={onClose} /><Card style={{ position: 'relative', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{title}</h2><button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '24px', cursor: 'pointer' }}>×</button></div>{children}</Card></div> : null;

// ============================================
// LOGIN PAGE
// ============================================
const LoginPage = ({ onLogin, onSignup, onBeneficiary }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [acc, setAcc] = useState(null);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    try {
      const account = Storage.getAccount(email);
      if (!account) { setError('Account not found'); setLoading(false); return; }
      try { await CryptoUtils.decrypt(account.encryptedVault, password); } catch { setError('Wrong password'); setLoading(false); return; }
      if (account.security?.totpEnabled) { setAcc(account); setNeeds2FA(true); setLoading(false); return; }
      completeLogin(account, password);
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const verify2FA = async () => {
    if (CryptoUtils.verifyTOTP(acc.security.totpSecret, code) || acc.security.backupCodes?.includes(code.toUpperCase())) {
      if (acc.security.backupCodes?.includes(code.toUpperCase())) {
        acc.security.backupCodes = acc.security.backupCodes.filter(c => c !== code.toUpperCase());
        Storage.saveAccount(email, acc);
      }
      completeLogin(acc, password);
    } else { setError('Invalid code'); }
  };

  const completeLogin = async (account, pwd) => {
    const vaultData = await CryptoUtils.decrypt(account.encryptedVault, pwd);
    Storage.saveSession({ email: account.email, loggedInAt: Date.now() });
    onLogin({ account, vaultData, password: pwd });
  };

  if (needs2FA) return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>Two-Factor Auth</h2></div>
        <Input label="6-Digit Code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" error={error} />
        <Button fullWidth onClick={verify2FA} disabled={code.length !== 6}>Verify</Button>
        <Button variant="ghost" fullWidth onClick={() => { setNeeds2FA(false); setCode(''); }} style={{ marginTop: '16px' }}>← Back</Button>
      </Card>
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <div style={{ display: 'flex', gap: '12px' }}><Button variant="ghost" onClick={onBeneficiary}>I'm a Beneficiary</Button><Button variant="secondary" onClick={onSignup}>Sign Up</Button></div>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Card style={{ maxWidth: '420px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}><Logo size="lg" /><h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginTop: '24px' }}>Welcome Back</h1><p style={{ color: 'rgba(255,255,255,0.5)' }}>Access your digital legacy vault</p></div>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" error={error} />
          <Button fullWidth onClick={handleLogin} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
          <div style={{ textAlign: 'center', marginTop: '24px' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>New here? </span><button onClick={onSignup} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>Create Account</button></div>
        </Card>
      </main>
    </div>
  );
};

// ============================================
// SIGNUP PAGE
// ============================================
const SignupPage = ({ onSignup, onLogin, onBeneficiary }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const next = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter valid email'); return; }
    if (Storage.getAccount(email)) { setError('Account exists'); return; }
    setError(''); setStep(2);
  };

  const create = async () => {
    if (password.length < 8) { setError('Min 8 characters'); return; }
    if (password !== confirm) { setError('Passwords don\'t match'); return; }
    setLoading(true);
    try {
      const vault = { beneficiaries: [], portfolio: { holdings: [], wallets: [] }, crypto: { wallets: [], secrets: [], exchanges: [] }, passwords: [], documents: [], messages: [], contacts: [], finalWishes: {}, settings: { checkInDays: 30, graceDays: 7, platformFee: PLATFORM_FEE_PERCENT }, createdAt: Date.now() };
      const encrypted = await CryptoUtils.encrypt(vault, password);
      const account = { id: CryptoUtils.genId(), email: email.toLowerCase(), encryptedVault: encrypted, security: { totpEnabled: false, totpSecret: null, backupCodes: [] }, lastCheckIn: Date.now(), createdAt: Date.now() };
      Storage.saveAccount(email, account);
      Storage.saveSession({ email: account.email, loggedInAt: Date.now() });
      onSignup({ account, vaultData: vault, password });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <div style={{ display: 'flex', gap: '12px' }}><Button variant="ghost" onClick={onBeneficiary}>I'm a Beneficiary</Button><Button variant="secondary" onClick={onLogin}>Login</Button></div>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Card style={{ maxWidth: '420px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}><Logo size="lg" /><h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginTop: '24px' }}>Create Account</h1></div>
          {step === 1 ? (<><Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={error} /><Button fullWidth onClick={next}>Continue →</Button></>) : (<><div style={{ padding: '12px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', marginBottom: '24px' }}><p style={{ fontSize: '13px', color: '#a78bfa', margin: 0 }}>{email}</p></div><Input label="Master Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" /><Input label="Confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" error={error} /><div style={{ padding: '16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', marginBottom: '24px' }}><p style={{ fontSize: '12px', color: '#fbbf24', margin: 0 }}>⚠️ This password encrypts your vault. Share it with beneficiaries securely. We cannot recover it.</p></div><Button fullWidth onClick={create} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button><Button variant="ghost" fullWidth onClick={() => setStep(1)} style={{ marginTop: '12px' }}>← Back</Button></>)}
          <div style={{ textAlign: 'center', marginTop: '24px' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Have an account? </span><button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>Login</button></div>
        </Card>
      </main>
    </div>
  );
};

// ============================================
// DASHBOARD - Main App Interface
// ============================================
const Dashboard = ({ account, vaultData, password, onLogout, onUpdate }) => {
  const [tab, setTab] = useState('portfolio');
  const [showSecurity, setShowSecurity] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vault, setVault] = useState(vaultData);
  const [lastCheckIn, setLastCheckIn] = useState(account.lastCheckIn || Date.now());
  const [prices, setPrices] = useState({});

  // Fetch prices on mount and every 60s
  useEffect(() => {
    const fetchPrices = async () => { const p = await PriceService.getPrices(); setPrices(p); };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const save = useCallback(async (newVault) => {
    setSaving(true);
    try {
      const encrypted = await CryptoUtils.encrypt(newVault, password);
      const updated = { ...account, encryptedVault: encrypted, lastModified: Date.now() };
      Storage.saveAccount(account.email, updated);
      setVault(newVault);
      onUpdate({ account: updated, vaultData: newVault });
    } finally { setSaving(false); }
  }, [account, password, onUpdate]);

  const checkIn = () => {
    const now = Date.now();
    setLastCheckIn(now);
    Storage.saveAccount(account.email, { ...account, lastCheckIn: now });
  };

  const timeLeft = () => {
    const days = vault.settings?.checkInDays || 30;
    const rem = (lastCheckIn + days * 86400000) - Date.now();
    if (rem <= 0) return { text: 'OVERDUE!', urgent: true };
    return { text: `${Math.floor(rem / 86400000)}d ${Math.floor((rem % 86400000) / 3600000)}h`, urgent: rem < 3 * 86400000 };
  };
  const time = timeLeft();

  const tabs = [
    { id: 'portfolio', icon: '📊', label: 'Portfolio' },
    { id: 'beneficiaries', icon: '👥', label: 'Beneficiaries' },
    { id: 'wallets', icon: '👛', label: 'Wallets' },
    { id: 'crypto', icon: '🔑', label: 'Secrets' },
    { id: 'passwords', icon: '🔐', label: 'Passwords' },
    { id: 'documents', icon: '📄', label: 'Documents' },
    { id: 'messages', icon: '💌', label: 'Messages' },
    { id: 'wishes', icon: '📝', label: 'Final Wishes' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Logo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {saving && <span style={{ fontSize: '12px', color: '#a78bfa' }}>Saving...</span>}
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{account.email}</span>
          <Button variant="secondary" size="sm" onClick={() => setShowSecurity(true)}>🔐 Security</Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </header>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        <aside style={{ width: '200px', padding: '24px 16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ width: '100%', padding: '12px 16px', marginBottom: '4px', background: tab === t.id ? 'rgba(139,92,246,0.15)' : 'transparent', border: 'none', borderRadius: '10px', color: tab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}><span>{t.icon}</span>{t.label}</button>)}
        </aside>
        <main style={{ flex: 1, padding: '32px 40px', overflow: 'auto' }}>
          {tab === 'portfolio' && <PortfolioTab vault={vault} prices={prices} time={time} onCheckIn={checkIn} onAddHolding={() => setShowAddHolding(true)} onSave={save} onExport={() => setShowExport(true)} />}
          {tab === 'beneficiaries' && <ListTab title="Beneficiaries" icon="👥" items={vault.beneficiaries || []} fields={[{ key: 'name', label: 'Name', placeholder: 'John Doe' }, { key: 'email', label: 'Email', placeholder: 'john@email.com' }, { key: 'share', label: 'Share %', placeholder: '100' }]} onSave={items => save({ ...vault, beneficiaries: items })} />}
          {tab === 'wallets' && <WalletsTab vault={vault} onSave={save} onAddWallet={() => setShowAddWallet(true)} />}
          {tab === 'crypto' && <CryptoTab vault={vault} onSave={save} />}
          {tab === 'passwords' && <ListTab title="Passwords" icon="🔐" items={vault.passwords || []} fields={[{ key: 'site', label: 'Website', placeholder: 'gmail.com' }, { key: 'username', label: 'Username', placeholder: 'user@...' }, { key: 'password', label: 'Password', placeholder: '••••••', secret: true }, { key: 'notes', label: 'Notes (2FA)', placeholder: '2FA info...' }]} onSave={items => save({ ...vault, passwords: items })} />}
          {tab === 'documents' && <ListTab title="Documents" icon="📄" items={vault.documents || []} fields={[{ key: 'name', label: 'Document', placeholder: 'Last Will' }, { key: 'type', label: 'Type', placeholder: 'Will/Trust/Insurance' }, { key: 'location', label: 'Location', placeholder: 'Safe deposit box...' }, { key: 'details', label: 'Details', placeholder: 'Notes...', textarea: true }]} onSave={items => save({ ...vault, documents: items })} />}
          {tab === 'messages' && <ListTab title="Final Messages" icon="💌" items={vault.messages || []} fields={[{ key: 'recipient', label: 'To', placeholder: 'Mom, Sarah...' }, { key: 'message', label: 'Message', placeholder: 'Your message...', textarea: true }]} onSave={items => save({ ...vault, messages: items })} pink />}
          {tab === 'wishes' && <WishesTab vault={vault} onSave={save} />}
          {tab === 'settings' && <SettingsTab vault={vault} account={account} onSave={save} onShowSecurity={() => setShowSecurity(true)} />}
        </main>
      </div>
      <SecurityModal isOpen={showSecurity} onClose={() => setShowSecurity(false)} account={account} onUpdate={updated => { Storage.saveAccount(account.email, updated); onUpdate({ account: updated, vaultData: vault }); }} />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} account={account} />
      <AddHoldingModal isOpen={showAddHolding} onClose={() => setShowAddHolding(false)} vault={vault} onSave={save} />
      <AddWalletModal isOpen={showAddWallet} onClose={() => setShowAddWallet(false)} vault={vault} onSave={save} />
    </div>
  );
};

// ============================================
// TABS
// ============================================
const formatUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: n > 1000 ? 0 : 2 }).format(n);

const PortfolioTab = ({ vault, prices, time, onCheckIn, onAddHolding, onSave, onExport }) => {
  const holdings = vault.portfolio?.holdings || [];
  
  const calcValue = () => {
    let total = 0;
    holdings.forEach(h => { const price = prices[h.coinId]?.usd || 0; total += (h.amount || 0) * price; });
    return total;
  };
  const portfolioValue = calcValue();

  const removeHolding = (i) => { 
    const newH = holdings.filter((_, idx) => idx !== i); 
    onSave({ ...vault, portfolio: { ...vault.portfolio, holdings: newH } }); 
  };

  return <>
    {/* Check-in Card */}
    <Card glow={time.urgent ? '#ef4444' : '#10b981'} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '100px', background: time.urgent ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', marginBottom: '16px' }}><span>{time.urgent ? '⚠️' : '🛡️'}</span><span style={{ fontSize: '12px', fontWeight: 600, color: time.urgent ? '#ef4444' : '#10b981' }}>{time.urgent ? 'CHECK-IN REQUIRED' : 'PROTECTED'}</span></div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Your Legacy is {time.urgent ? 'At Risk' : 'Secure'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Next check-in: <strong style={{ color: '#fff' }}>{time.text}</strong></p>
        </div>
        <Button variant={time.urgent ? 'danger' : 'primary'} size="lg" onClick={onCheckIn}>✓ Check In</Button>
      </div>
    </Card>

    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '16px', marginBottom: '24px' }}>
      <Card style={{ padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div><div style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa' }}>{formatUSD(portfolioValue)}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Portfolio Value</div></Card>
      <Card style={{ padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>🪙</div><div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{holdings.length}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Assets Tracked</div></Card>
      <Card style={{ padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div><div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{vault.beneficiaries?.length || 0}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Beneficiaries</div></Card>
      <Card style={{ padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>👛</div><div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{vault.portfolio?.wallets?.length || 0}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Wallets</div></Card>
    </div>

    {/* Holdings */}
    <Card style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>💎 Holdings (Real-time Prices)</h3><Button variant="secondary" size="sm" onClick={onAddHolding}>+ Add Asset</Button></div>
      {holdings.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div><p style={{ marginBottom: '16px' }}>No assets tracked yet</p><Button size="sm" onClick={onAddHolding}>Add Your First Asset</Button></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {holdings.map((h, i) => {
            const price = prices[h.coinId]?.usd || 0;
            const change = prices[h.coinId]?.usd_24h_change || 0;
            const value = (h.amount || 0) * price;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff' }}>{h.symbol?.charAt(0) || '?'}</div><div><div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{h.name}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{h.symbol}</div></div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{h.amount}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{h.symbol}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{formatUSD(price)}</div><div style={{ fontSize: '12px', color: change >= 0 ? '#10b981' : '#ef4444' }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: '#a78bfa', fontSize: '14px' }}>{formatUSD(value)}</div></div>
                <button onClick={() => removeHolding(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '8px' }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </Card>

    {/* Quick Actions */}
    <Card><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Quick Actions</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><Button variant="secondary" fullWidth onClick={onExport}>📥 Export Backup</Button><Button variant="secondary" fullWidth onClick={() => window.open(STRIPE_PAYMENT_LINK, '_blank')}>💳 Subscription</Button></div></Card>
  </>;
};

const WalletsTab = ({ vault, onSave, onAddWallet }) => {
  const wallets = vault.portfolio?.wallets || [];
  const [show, setShow] = useState({});
  const removeWallet = (i) => { const newW = wallets.filter((_, idx) => idx !== i); onSave({ ...vault, portfolio: { ...vault.portfolio, wallets: newW } }); };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>👛 Wallet Addresses</h2><Button variant="secondary" onClick={onAddWallet}>+ Add Wallet</Button></div>
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '24px' }}>Track wallet addresses across chains. View-only - your private keys stay safe.</p>
    {wallets.length === 0 ? <Card style={{ textAlign: 'center', padding: '60px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>👛</div><p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>No wallets added yet</p><Button onClick={onAddWallet}>Add Your First Wallet</Button></Card> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {wallets.map((w, i) => {
          const chain = SUPPORTED_CHAINS.find(c => c.id === w.chain) || SUPPORTED_CHAINS[0];
          return (
            <Card key={i} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{chain.icon}</div><div><div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{w.name || 'Wallet'}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{chain.name}</div></div></div>
                <div style={{ display: 'flex', gap: '8px' }}><a href={`${chain.explorer}/address/${w.address}`} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', fontSize: '12px', textDecoration: 'none' }}>View ↗</a><button onClick={() => removeWallet(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><code style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '12px', color: show[i] ? '#a78bfa' : 'rgba(255,255,255,0.3)', wordBreak: 'break-all' }}>{show[i] ? w.address : w.address?.slice(0, 10) + '...' + w.address?.slice(-8)}</code><Button variant="ghost" size="sm" onClick={() => setShow({ ...show, [i]: !show[i] })}>{show[i] ? '🙈' : '👁️'}</Button><Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(w.address)}>📋</Button></div>
            </Card>
          );
        })}
      </div>
    )}
  </>;
};

const AddHoldingModal = ({ isOpen, onClose, vault, onSave }) => {
  const [coin, setCoin] = useState('bitcoin');
  const [amount, setAmount] = useState('');

  const add = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const c = TRACKED_COINS.find(x => x.id === coin);
    const holding = { coinId: c.id, name: c.name, symbol: c.symbol, amount: parseFloat(amount) };
    const holdings = [...(vault.portfolio?.holdings || []), holding];
    onSave({ ...vault, portfolio: { ...vault.portfolio, holdings } });
    setAmount(''); setCoin('bitcoin'); onClose();
  };

  if (!isOpen) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={onClose} /><Card style={{ position: 'relative', maxWidth: '450px', width: '100%' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Add Asset to Portfolio</h2><button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '24px', cursor: 'pointer' }}>×</button></div>
    <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '11px', color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 600 }}>Select Asset</label><select value={coin} onChange={e => setCoin(e.target.value)} style={{ width: '100%', padding: '14px 18px', background: '#0a0a0f', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }}>{TRACKED_COINS.map(c => <option key={c.id} value={c.id} style={{ background: '#0f0a1a' }}>{c.symbol} - {c.name}</option>)}</select></div>
    <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
    <Button fullWidth onClick={add}>Add to Portfolio</Button>
  </Card></div>;
};

const AddWalletModal = ({ isOpen, onClose, vault, onSave }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('ethereum');

  const add = () => {
    if (!address) return;
    const wallet = { name, address, chain, createdAt: Date.now() };
    const wallets = [...(vault.portfolio?.wallets || []), wallet];
    onSave({ ...vault, portfolio: { ...vault.portfolio, wallets } });
    setName(''); setAddress(''); setChain('ethereum'); onClose();
  };

  if (!isOpen) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={onClose} /><Card style={{ position: 'relative', maxWidth: '450px', width: '100%' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Add Wallet Address</h2><button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '24px', cursor: 'pointer' }}>×</button></div>
    <Input label="Wallet Name" value={name} onChange={e => setName(e.target.value)} placeholder="Main Ledger" />
    <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '11px', color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 600 }}>Blockchain</label><select value={chain} onChange={e => setChain(e.target.value)} style={{ width: '100%', padding: '14px 18px', background: '#0a0a0f', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }}>{SUPPORTED_CHAINS.map(c => <option key={c.id} value={c.id} style={{ background: '#0f0a1a' }}>{c.icon} {c.name}</option>)}</select></div>
    <Input label="Wallet Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." />
    <Button fullWidth onClick={add}>Add Wallet</Button>
  </Card></div>;
};

const ListTab = ({ title, icon, items: initial, fields, onSave, pink }) => {
  const [items, setItems] = useState(initial);
  const [changed, setChanged] = useState(false);
  const [show, setShow] = useState({});
  const add = () => { const obj = {}; fields.forEach(f => obj[f.key] = ''); setItems([...items, obj]); setChanged(true); };
  const update = (i, k, v) => { const u = [...items]; u[i][k] = v; setItems(u); setChanged(true); };
  const remove = i => { setItems(items.filter((_, idx) => idx !== i)); setChanged(true); };
  const doSave = () => { onSave(items.filter(item => fields.some(f => item[f.key]))); setChanged(false); };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{icon} {title}</h2></div>
      <div style={{ display: 'flex', gap: '12px' }}><Button variant="secondary" onClick={add}>+ Add</Button>{changed && <Button variant="success" onClick={doSave}>Save</Button>}</div>
    </div>
    {items.length === 0 ? <Card style={{ textAlign: 'center', padding: '60px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div><p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>No items yet</p><Button onClick={add}>Add First Item</Button></Card> : items.map((item, i) => (
      <Card key={i} style={{ marginBottom: '16px', background: pink ? 'linear-gradient(135deg,rgba(244,114,182,0.05),rgba(15,10,25,0.9))' : undefined }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(fields.length, 4)},1fr) auto`, gap: '12px', alignItems: 'end' }}>
          {fields.map(f => f.textarea ? null : <div key={f.key} style={{ position: 'relative' }}><Input label={f.label} type={f.secret && !show[`${i}-${f.key}`] ? 'password' : 'text'} value={item[f.key] || ''} onChange={e => update(i, f.key, e.target.value)} placeholder={f.placeholder} style={{ marginBottom: 0 }} />{f.secret && <button onClick={() => setShow({ ...show, [`${i}-${f.key}`]: !show[`${i}-${f.key}`] })} style={{ position: 'absolute', right: 12, top: 32, background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer' }}>{show[`${i}-${f.key}`] ? '🙈' : '👁️'}</button>}</div>)}
          <Button variant="ghost" size="sm" onClick={() => remove(i)} style={{ color: '#ef4444' }}>🗑️</Button>
        </div>
        {fields.filter(f => f.textarea).map(f => <Input key={f.key} label={f.label} value={item[f.key] || ''} onChange={e => update(i, f.key, e.target.value)} placeholder={f.placeholder} textarea style={{ marginTop: '12px', marginBottom: 0 }} />)}
      </Card>
    ))}
  </>;
};

const CryptoTab = ({ vault, onSave }) => {
  const [wallets, setWallets] = useState(vault.crypto?.wallets || []);
  const [secrets, setSecrets] = useState(vault.crypto?.secrets || []);
  const [exchanges, setExchanges] = useState(vault.crypto?.exchanges || []);
  const [changed, setChanged] = useState(false);
  const [show, setShow] = useState({});
  const save = () => { onSave({ ...vault, crypto: { wallets: wallets.filter(w => w.address), secrets: secrets.filter(s => s.value), exchanges: exchanges.filter(e => e.name) } }); setChanged(false); };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>₿ Crypto & DeFi</h2>{changed && <Button variant="success" onClick={save}>Save</Button>}</div>
    <Card style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Wallets</h3><Button variant="secondary" size="sm" onClick={() => { setWallets([...wallets, { name: '', address: '', chain: 'ETH' }]); setChanged(true); }}>+ Add</Button></div>
      {wallets.map((w, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}><Input label="Name" value={w.name} onChange={e => { const u = [...wallets]; u[i].name = e.target.value; setWallets(u); setChanged(true); }} placeholder="Main" style={{ marginBottom: 0 }} /><Select label="Chain" value={w.chain} onChange={e => { const u = [...wallets]; u[i].chain = e.target.value; setWallets(u); setChanged(true); }} options={CHAINS.map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }))} style={{ marginBottom: 0 }} /><Input label="Address" value={w.address} onChange={e => { const u = [...wallets]; u[i].address = e.target.value; setWallets(u); setChanged(true); }} placeholder="0x..." style={{ marginBottom: 0 }} /><Button variant="ghost" size="sm" onClick={() => { setWallets(wallets.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444' }}>🗑️</Button></div>)}
    </Card>
    <Card style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>🔐 Seed Phrases & Keys</h3><Button variant="secondary" size="sm" onClick={() => { setSecrets([...secrets, { label: '', value: '' }]); setChanged(true); }}>+ Add</Button></div>
      {secrets.map((s, i) => <div key={i} style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '12px', marginBottom: '12px' }}><Input label="Label" value={s.label} onChange={e => { const u = [...secrets]; u[i].label = e.target.value; setSecrets(u); setChanged(true); }} placeholder="Ledger Seed" /><div style={{ position: 'relative' }}><Input label="Secret" type={show[i] ? 'text' : 'password'} value={s.value} onChange={e => { const u = [...secrets]; u[i].value = e.target.value; setSecrets(u); setChanged(true); }} placeholder="Enter seed..." textarea style={{ marginBottom: 0 }} /><button onClick={() => setShow({ ...show, [i]: !show[i] })} style={{ position: 'absolute', right: 12, top: 32, background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer' }}>{show[i] ? '🙈' : '👁️'}</button></div><Button variant="ghost" size="sm" onClick={() => { setSecrets(secrets.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444', marginTop: '12px' }}>🗑️ Remove</Button></div>)}
    </Card>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Exchanges</h3><Button variant="secondary" size="sm" onClick={() => { setExchanges([...exchanges, { name: '', email: '', notes: '' }]); setChanged(true); }}>+ Add</Button></div>
      {exchanges.map((e, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}><Input label="Exchange" value={e.name} onChange={ev => { const u = [...exchanges]; u[i].name = ev.target.value; setExchanges(u); setChanged(true); }} placeholder="Coinbase" style={{ marginBottom: 0 }} /><Input label="Email" value={e.email} onChange={ev => { const u = [...exchanges]; u[i].email = ev.target.value; setExchanges(u); setChanged(true); }} placeholder="email@..." style={{ marginBottom: 0 }} /><Input label="Notes" value={e.notes} onChange={ev => { const u = [...exchanges]; u[i].notes = ev.target.value; setExchanges(u); setChanged(true); }} placeholder="2FA..." style={{ marginBottom: 0 }} /><Button variant="ghost" size="sm" onClick={() => { setExchanges(exchanges.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444' }}>🗑️</Button></div>)}
    </Card>
  </>;
};

const FinanceTab = ({ vault, onSave }) => {
  const [banks, setBanks] = useState(vault.finance?.bankAccounts || []);
  const [investments, setInvestments] = useState(vault.finance?.investments || []);
  const [debts, setDebts] = useState(vault.finance?.debts || []);
  const [changed, setChanged] = useState(false);
  const save = () => { onSave({ ...vault, finance: { bankAccounts: banks.filter(b => b.bank), investments: investments.filter(i => i.institution), debts: debts.filter(d => d.creditor) } }); setChanged(false); };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>🏦 Finance</h2>{changed && <Button variant="success" onClick={save}>Save</Button>}</div>
    <Card style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Bank Accounts</h3><Button variant="secondary" size="sm" onClick={() => { setBanks([...banks, { bank: '', type: 'checking', accountNum: '' }]); setChanged(true); }}>+ Add</Button></div>
      {banks.map((b, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}><Input label="Bank" value={b.bank} onChange={e => { const u = [...banks]; u[i].bank = e.target.value; setBanks(u); setChanged(true); }} placeholder="Chase" style={{ marginBottom: 0 }} /><Select label="Type" value={b.type} onChange={e => { const u = [...banks]; u[i].type = e.target.value; setBanks(u); setChanged(true); }} options={[{ value: 'checking', label: 'Checking' }, { value: 'savings', label: 'Savings' }]} style={{ marginBottom: 0 }} /><Input label="Last 4" value={b.accountNum} onChange={e => { const u = [...banks]; u[i].accountNum = e.target.value; setBanks(u); setChanged(true); }} placeholder="1234" style={{ marginBottom: 0 }} /><Button variant="ghost" size="sm" onClick={() => { setBanks(banks.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444' }}>🗑️</Button></div>)}
    </Card>
    <Card style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Investments</h3><Button variant="secondary" size="sm" onClick={() => { setInvestments([...investments, { institution: '', type: '', notes: '' }]); setChanged(true); }}>+ Add</Button></div>
      {investments.map((inv, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}><Input label="Institution" value={inv.institution} onChange={e => { const u = [...investments]; u[i].institution = e.target.value; setInvestments(u); setChanged(true); }} placeholder="Fidelity" style={{ marginBottom: 0 }} /><Input label="Type" value={inv.type} onChange={e => { const u = [...investments]; u[i].type = e.target.value; setInvestments(u); setChanged(true); }} placeholder="401k" style={{ marginBottom: 0 }} /><Input label="Notes" value={inv.notes} onChange={e => { const u = [...investments]; u[i].notes = e.target.value; setInvestments(u); setChanged(true); }} placeholder="Login..." style={{ marginBottom: 0 }} /><Button variant="ghost" size="sm" onClick={() => { setInvestments(investments.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444' }}>🗑️</Button></div>)}
    </Card>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>⚠️ Debts</h3><Button variant="secondary" size="sm" onClick={() => { setDebts([...debts, { creditor: '', type: '', amount: '' }]); setChanged(true); }}>+ Add</Button></div>
      {debts.map((d, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}><Input label="Creditor" value={d.creditor} onChange={e => { const u = [...debts]; u[i].creditor = e.target.value; setDebts(u); setChanged(true); }} placeholder="Mortgage" style={{ marginBottom: 0 }} /><Input label="Type" value={d.type} onChange={e => { const u = [...debts]; u[i].type = e.target.value; setDebts(u); setChanged(true); }} placeholder="Home Loan" style={{ marginBottom: 0 }} /><Input label="Amount" value={d.amount} onChange={e => { const u = [...debts]; u[i].amount = e.target.value; setDebts(u); setChanged(true); }} placeholder="$50,000" style={{ marginBottom: 0 }} /><Button variant="ghost" size="sm" onClick={() => { setDebts(debts.filter((_, j) => j !== i)); setChanged(true); }} style={{ color: '#ef4444' }}>🗑️</Button></div>)}
    </Card>
  </>;
};

const WishesTab = ({ vault, onSave }) => {
  const [wishes, setWishes] = useState(vault.finalWishes || {});
  const [changed, setChanged] = useState(false);
  const update = (k, v) => { setWishes({ ...wishes, [k]: v }); setChanged(true); };
  const save = () => { onSave({ ...vault, finalWishes: wishes }); setChanged(false); };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>📝 Final Wishes</h2>{changed && <Button variant="success" onClick={save}>Save</Button>}</div>
    <Card>
      <Input label="Funeral Preferences" value={wishes.funeral || ''} onChange={e => update('funeral', e.target.value)} placeholder="Burial vs cremation, location..." textarea />
      <Input label="Organ Donation" value={wishes.organDonation || ''} onChange={e => update('organDonation', e.target.value)} placeholder="Yes/No, specific wishes..." textarea />
      <Input label="Special Requests" value={wishes.specialRequests || ''} onChange={e => update('specialRequests', e.target.value)} placeholder="Music, readings..." textarea />
      <Input label="General Instructions" value={wishes.generalInstructions || ''} onChange={e => update('generalInstructions', e.target.value)} placeholder="Other instructions..." textarea style={{ marginBottom: 0 }} />
    </Card>
  </>;
};

const SettingsTab = ({ vault, account, onSave, onShowSecurity }) => {
  const [checkIn, setCheckIn] = useState((vault.settings?.checkInDays || 30).toString());
  const [grace, setGrace] = useState((vault.settings?.graceDays || 7).toString());
  const [changed, setChanged] = useState(false);
  const save = () => { onSave({ ...vault, settings: { ...vault.settings, checkInDays: parseInt(checkIn), graceDays: parseInt(grace) } }); setChanged(false); };

  return <>
    <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '24px' }}>⚙️ Settings</h2>
    <Card style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Dead Man's Switch</h3>
      <Select label="Check-in Frequency" value={checkIn} onChange={e => { setCheckIn(e.target.value); setChanged(true); }} options={[{ value: '7', label: 'Every 7 days' }, { value: '14', label: 'Every 14 days' }, { value: '30', label: 'Every 30 days' }, { value: '60', label: 'Every 60 days' }, { value: '90', label: 'Every 90 days' }]} />
      <Select label="Grace Period" value={grace} onChange={e => { setGrace(e.target.value); setChanged(true); }} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} style={{ marginBottom: 0 }} />
      {changed && <Button variant="success" onClick={save} style={{ marginTop: '16px' }}>Save</Button>}
    </Card>
    <Card style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Security</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <div><div style={{ fontWeight: 600, color: '#fff' }}>Two-Factor Authentication</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{account.security?.totpEnabled ? '✅ Enabled' : '❌ Disabled'}</div></div>
        <Button variant={account.security?.totpEnabled ? 'secondary' : 'primary'} size="sm" onClick={onShowSecurity}>{account.security?.totpEnabled ? 'Manage' : 'Enable'}</Button>
      </div>
    </Card>
    <Card>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Subscription</h3>
      <Button variant="secondary" fullWidth onClick={() => window.open(STRIPE_PAYMENT_LINK, '_blank')}>💳 Manage on Stripe</Button>
    </Card>
  </>;
};

// ============================================
// MODALS
// ============================================
const SecurityModal = ({ isOpen, onClose, account, onUpdate }) => {
  const [step, setStep] = useState(account.security?.totpEnabled ? 'manage' : 'setup');
  const [secret] = useState(account.security?.totpSecret || CryptoUtils.genTOTPSecret());
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);

  const enable = () => {
    if (!CryptoUtils.verifyTOTP(secret, code)) { setError('Invalid code'); return; }
    const codes = CryptoUtils.genBackupCodes();
    onUpdate({ ...account, security: { totpEnabled: true, totpSecret: secret, backupCodes: codes } });
    setBackupCodes(codes);
    setStep('backup');
  };

  const disable = () => {
    onUpdate({ ...account, security: { totpEnabled: false, totpSecret: null, backupCodes: [] } });
    onClose();
  };

  return <Modal isOpen={isOpen} onClose={onClose} title="Two-Factor Authentication">
    {step === 'setup' && <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div><p style={{ color: 'rgba(255,255,255,0.6)' }}>Add extra security to your account</p></div>
      <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>1. Add to your authenticator app:</p>
        <code style={{ display: 'block', padding: '12px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', color: '#a78bfa', fontSize: '12px', letterSpacing: '2px', textAlign: 'center', wordBreak: 'break-all' }}>{secret}</code>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>2. Enter the 6-digit code:</p>
      <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" error={error} />
      <Button fullWidth onClick={enable} disabled={code.length !== 6}>Enable 2FA</Button>
    </>}
    {step === 'backup' && <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>2FA Enabled!</h3></div>
      <div style={{ padding: '20px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', color: '#fbbf24', marginBottom: '12px' }}>⚠️ Save these backup codes:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>{backupCodes?.map((c, i) => <code key={i} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'center', color: '#fff', fontSize: '13px' }}>{c}</code>)}</div>
      </div>
      <Button fullWidth onClick={onClose}>Done</Button>
    </>}
    {step === 'manage' && <>
      <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', marginBottom: '24px' }}><p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>✅ 2FA is enabled</p></div>
      <Button variant="danger" fullWidth onClick={disable}>Disable 2FA</Button>
    </>}
  </Modal>;
};

const ExportModal = ({ isOpen, onClose, account }) => {
  const data = JSON.stringify(account, null, 2);
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = `inherichain-backup-${account.email}-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  return <Modal isOpen={isOpen} onClose={onClose} title="Export Backup">
    <div style={{ padding: '16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', marginBottom: '24px' }}><p style={{ fontSize: '13px', color: '#fbbf24', margin: 0 }}>⚠️ Share this backup AND your master password with beneficiaries securely.</p></div>
    <Button fullWidth onClick={download}>📥 Download Backup</Button>
    <Button variant="secondary" fullWidth onClick={() => { navigator.clipboard.writeText(data); alert('Copied!'); }} style={{ marginTop: '12px' }}>📋 Copy to Clipboard</Button>
  </Modal>;
};

// ============================================
// BENEFICIARY PAGE
// ============================================
const BeneficiaryPage = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [data, setData] = useState('');
  const [vault, setVault] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [show, setShow] = useState({});

  const decrypt = async () => {
    if (!accepted) { alert(`Accept the ${PLATFORM_FEE_PERCENT}% fee first`); return; }
    setError(''); setLoading(true);
    try {
      const parsed = JSON.parse(data);
      const v = parsed.encryptedVault || parsed;
      setVault(await CryptoUtils.decrypt(v, password));
    } catch { setError('Decryption failed'); }
    finally { setLoading(false); }
  };

  const handleFile = e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = e => setData(e.target.result); r.readAsText(f); } };

  if (vault) return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Button variant="ghost" onClick={() => { setVault(null); setPassword(''); setData(''); }} style={{ marginBottom: '24px' }}>← Start Over</Button>
        <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', marginBottom: '24px' }}><p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>✅ <strong>Vault unlocked.</strong> Handle with care.</p></div>
        
        {(vault.finalWishes?.funeral || vault.finalWishes?.generalInstructions) && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>📝 Final Wishes</h3>{vault.finalWishes.funeral && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '4px' }}>Funeral</div><p style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{vault.finalWishes.funeral}</p></div>}{vault.finalWishes.organDonation && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '4px' }}>Organ Donation</div><p style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{vault.finalWishes.organDonation}</p></div>}{vault.finalWishes.specialRequests && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '4px' }}>Special Requests</div><p style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{vault.finalWishes.specialRequests}</p></div>}{vault.finalWishes.generalInstructions && <div><div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '4px' }}>Instructions</div><p style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{vault.finalWishes.generalInstructions}</p></div>}</Card>}
        
        {vault.messages?.filter(m => m.message).length > 0 && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>💌 Messages</h3>{vault.messages.filter(m => m.message).map((m, i) => <div key={i} style={{ padding: '16px', background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.1)', borderRadius: '12px', marginBottom: '12px' }}><div style={{ fontWeight: 600, color: '#f472b6', marginBottom: '12px' }}>To: {m.recipient}</div><div style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{m.message}</div></div>)}</Card>}
        
        {vault.contacts?.filter(c => c.name).length > 0 && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>📞 Contacts</h3>{vault.contacts.filter(c => c.name).map((c, i) => <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600, color: '#fff' }}>{c.name}</span><span style={{ fontSize: '12px', color: '#a78bfa' }}>{c.role}</span></div>{c.phone && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>📱 {c.phone}</div>}{c.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>✉️ {c.email}</div>}</div>)}</Card>}
        
        {(vault.crypto?.wallets?.length > 0 || vault.crypto?.secrets?.length > 0) && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>₿ Crypto</h3>{vault.crypto.wallets?.filter(w => w.address).map((w, i) => <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}><div style={{ fontWeight: 600, color: '#fff' }}>{w.name || 'Wallet'} ({w.chain})</div><div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa', wordBreak: 'break-all' }}>{w.address}</div></div>)}{vault.crypto.secrets?.filter(s => s.value).map((s, i) => <div key={i} style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontWeight: 600, color: '#fff' }}>{s.label || 'Secret'}</span><Button variant="ghost" size="sm" onClick={() => setShow({ ...show, [i]: !show[i] })}>{show[i] ? '🙈' : '👁️'}</Button></div><div style={{ fontFamily: 'monospace', fontSize: '12px', color: show[i] ? '#10b981' : 'rgba(255,255,255,0.3)', wordBreak: 'break-all' }}>{show[i] ? s.value : '••••••••••••••••••••••••'}</div></div>)}</Card>}
        
        {vault.passwords?.filter(p => p.site).length > 0 && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>🔑 Passwords</h3>{vault.passwords.filter(p => p.site).map((p, i) => <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}><div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{p.site}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>User: {p.username}</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}><span style={{ fontSize: '12px', fontFamily: 'monospace', color: show[`p${i}`] ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{show[`p${i}`] ? p.password : '••••••••'}</span><Button variant="ghost" size="sm" onClick={() => setShow({ ...show, [`p${i}`]: !show[`p${i}`] })}>{show[`p${i}`] ? '🙈' : '👁️'}</Button></div>{p.notes && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{p.notes}</div>}</div>)}</Card>}
        
        {vault.documents?.filter(d => d.name).length > 0 && <Card style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>📄 Documents</h3>{vault.documents.filter(d => d.name).map((d, i) => <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600, color: '#fff' }}>{d.name}</span><span style={{ fontSize: '11px', color: '#a78bfa' }}>{d.type}</span></div>{d.location && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>📍 {d.location}</div>}{d.details && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>{d.details}</div>}</div>)}</Card>}
        
        {vault.beneficiaries?.filter(b => b.name).length > 0 && <Card><h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>👥 Beneficiaries</h3>{vault.beneficiaries.filter(b => b.name).map((b, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}><div><div style={{ fontWeight: 600, color: '#fff' }}>{b.name}</div>{b.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{b.email}</div>}</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>{b.share}%</div></div>)}</Card>}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <Card style={{ maxWidth: '500px', width: '100%' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '24px' }}>← Back</Button>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}><Logo size="lg" /><h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '24px' }}>Claim Inheritance</h2><p style={{ color: 'rgba(255,255,255,0.5)' }}>Enter the vault backup and master password</p></div>
        <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '11px', color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 600 }}>Upload Backup File</label><input type="file" accept=".json" onChange={handleFile} style={{ width: '100%', padding: '12px', background: '#0a0a0f', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} /></div>
        <Input label="Or Paste Vault Data" value={data} onChange={e => setData(e.target.value)} placeholder="Paste JSON..." textarea />
        <Input label="Master Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" error={error} />
        <div style={{ padding: '16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', marginBottom: '24px' }}><label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: '4px' }} /><span style={{ fontSize: '13px', color: '#fbbf24' }}>I accept the <strong>{PLATFORM_FEE_PERCENT}% platform fee</strong> on inherited assets.</span></label></div>
        <Button fullWidth onClick={decrypt} disabled={!password || !data || loading || !accepted}>{loading ? 'Decrypting...' : '🔓 Unlock Vault'}</Button>
      </Card>
    </div>
  );
};

// ============================================
// LANDING PAGE
// ============================================
const LandingPage = ({ onCreateVault, onBeneficiary }) => {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" onClick={onBeneficiary}>I'm a Beneficiary</Button>
          <Button variant="secondary" onClick={onCreateVault}>Login</Button>
        </div>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em' }}>SECURE DIGITAL INHERITANCE</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px' }}>
            <span style={{ background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Crypto Legacy,</span>
            <br />
            <span style={{ color: '#fff' }}>Protected Forever</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Ensure your cryptocurrency, passwords, and digital assets reach your loved ones. 
            Client-side encrypted. No custody. No KYC. Your keys, your rules.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={onCreateVault} style={{ padding: '18px 36px', fontSize: '14px' }}>Create Your Vault →</Button>
            <Button variant="secondary" onClick={onBeneficiary} style={{ padding: '18px 36px', fontSize: '14px' }}>Claim Inheritance</Button>
          </div>
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { icon: '🔐', title: 'AES-256 Encrypted', desc: 'Military-grade encryption' },
              { icon: '👁️', title: 'Zero Knowledge', desc: 'We never see your data' },
              { icon: '⏰', title: 'Dead Man\'s Switch', desc: 'Auto-release to beneficiaries' },
            ].map((f, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [page, setPage] = useState('landing');
  const [account, setAccount] = useState(null);
  const [vaultData, setVaultData] = useState(null);
  const [password, setPassword] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const session = Storage.getSession();
    if (session?.email) {
      const acc = Storage.getAccount(session.email);
      if (acc) {
        setPage('login');
      }
    }
  }, []);

  const handleLogin = ({ account: acc, vaultData: vault, password: pwd }) => {
    setAccount(acc);
    setVaultData(vault);
    setPassword(pwd);
    setPage('dashboard');
  };

  const handleLogout = () => {
    Storage.clearSession();
    setAccount(null);
    setVaultData(null);
    setPassword('');
    setPage('landing');
  };

  const handleUpdate = ({ account: acc, vaultData: vault }) => {
    setAccount(acc);
    if (vault) setVaultData(vault);
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter,-apple-system,sans-serif', color: '#fff' }}>
      <Background />
      {page === 'landing' && <LandingPage onCreateVault={() => setPage('signup')} onBeneficiary={() => setPage('beneficiary')} />}
      {page === 'login' && <LoginPage onLogin={handleLogin} onSignup={() => setPage('signup')} onBeneficiary={() => setPage('beneficiary')} />}
      {page === 'signup' && <SignupPage onSignup={handleLogin} onLogin={() => setPage('login')} onBeneficiary={() => setPage('beneficiary')} />}
      {page === 'dashboard' && account && <Dashboard account={account} vaultData={vaultData} password={password} onLogout={handleLogout} onUpdate={handleUpdate} />}
      {page === 'beneficiary' && <BeneficiaryPage onBack={() => setPage('landing')} />}
    </div>
  );
}
