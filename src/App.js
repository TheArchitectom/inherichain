/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';

// ============================================
// INHERICHAIN - Digital Crypto Inheritance
// Your Keys. Your Rules. Your Legacy.
// ============================================

// Client-side encryption utilities (AES-256-GCM)
const CryptoUtils = {
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
    );
    return await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  },
  async encrypt(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, String.fromCharCode(...salt));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))
    );
    return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
  },
  async decrypt(encryptedObj, password) {
    try {
      const key = await this.deriveKey(password, String.fromCharCode(...new Uint8Array(encryptedObj.salt)));
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedObj.iv) }, key, new Uint8Array(encryptedObj.data)
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) { throw new Error('Decryption failed - incorrect password'); }
  }
};

// Chain configurations
const CHAINS = [
  { value: 'ETH', label: 'Ethereum', icon: '⟠', color: '#627eea' },
  { value: 'BTC', label: 'Bitcoin', icon: '₿', color: '#f7931a' },
  { value: 'SOL', label: 'Solana', icon: '◎', color: '#00ffa3' },
  { value: 'LINK', label: 'Chainlink', icon: '⬡', color: '#375bd2' },
  { value: 'QNT', label: 'Quant', icon: '◈', color: '#585858' },
  { value: 'TAO', label: 'Bittensor', icon: 'τ', color: '#000' },
  { value: 'KAS', label: 'Kaspa', icon: '⧫', color: '#49eacb' },
  { value: 'MATIC', label: 'Polygon', icon: '⬡', color: '#8247e5' },
];

const PRICES = { ETH: 3200, BTC: 97000, SOL: 210, LINK: 28, QNT: 145, TAO: 480, KAS: 0.15, MATIC: 0.52 };

// ============================================
// NEURAL NEBULA BACKGROUND
// ============================================
const NeuralNebula = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];
    
    let time = 0;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create particles (neural nodes)
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        color: ['#8b5cf6', '#06b6d4', '#f472b6', '#a78bfa', '#22d3ee'][Math.floor(Math.random() * 5)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
    
    const animate = () => {
      time += 0.005;
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw nebula clouds
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time) * 100, 
        canvas.height * 0.4 + Math.cos(time * 0.7) * 80, 
        0,
        canvas.width * 0.3, canvas.height * 0.4, 400
      );
      gradient1.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
      gradient1.addColorStop(0.5, 'rgba(139, 92, 246, 0.03)');
      gradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.8) * 120, 
        canvas.height * 0.6 + Math.sin(time * 0.6) * 100, 
        0,
        canvas.width * 0.7, canvas.height * 0.6, 350
      );
      gradient2.addColorStop(0, 'rgba(6, 182, 212, 0.07)');
      gradient2.addColorStop(0.5, 'rgba(6, 182, 212, 0.02)');
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const gradient3 = ctx.createRadialGradient(
        canvas.width * 0.5 + Math.sin(time * 1.2) * 80, 
        canvas.height * 0.3 + Math.cos(time) * 60, 
        0,
        canvas.width * 0.5, canvas.height * 0.3, 300
      );
      gradient3.addColorStop(0, 'rgba(244, 114, 182, 0.06)');
      gradient3.addColorStop(0.5, 'rgba(244, 114, 182, 0.02)');
      gradient3.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        
        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw connections (neural synapses)
        particles.forEach((p2, j) => {
          if (i >= j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
        
        // Draw particle with pulse
        const pulseSize = p.radius + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize * 3, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseSize * 3);
        glow.addColorStop(0, p.color + '40');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1a 50%, #0a0f1a 100%)',
      }}
    />
  );
};

// ============================================
// UI COMPONENTS
// ============================================

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, fullWidth, style }) => {
  const [hover, setHover] = useState(false);
  
  const variants = {
    primary: {
      background: hover 
        ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #06b6d4 100%)'
        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #06b6d4 100%)',
      color: '#fff',
      boxShadow: hover 
        ? '0 8px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(6, 182, 212, 0.2)'
        : '0 4px 20px rgba(139, 92, 246, 0.3)',
    },
    secondary: {
      background: hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
      color: '#fff',
      border: '1px solid rgba(139, 92, 246, 0.3)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#fff',
      boxShadow: hover ? '0 8px 40px rgba(239, 68, 68, 0.4)' : '0 4px 20px rgba(239, 68, 68, 0.2)',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
      color: '#fff',
      boxShadow: hover ? '0 8px 40px rgba(16, 185, 129, 0.5)' : '0 4px 20px rgba(16, 185, 129, 0.3)',
    },
    ghost: {
      background: 'transparent',
      color: hover ? '#a78bfa' : 'rgba(255,255,255,0.6)',
    }
  };
  
  const sizes = {
    sm: { padding: '10px 20px', fontSize: '11px' },
    md: { padding: '14px 28px', fontSize: '12px' },
    lg: { padding: '18px 36px', fontSize: '14px' },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.5 : 1,
        transform: hover && !disabled ? 'translateY(-2px)' : 'translateY(0)',
        width: fullWidth ? '100%' : 'auto',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Card = ({ children, style, glow, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'linear-gradient(135deg, rgba(15, 10, 25, 0.85) 0%, rgba(10, 15, 25, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(139, 92, 246, 0.1)',
      padding: '32px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: glow 
        ? `0 0 80px ${glow}20, 0 20px 60px rgba(0,0,0,0.4)`
        : '0 20px 60px rgba(0,0,0,0.3)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      ...style,
    }}
  >
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3), transparent)',
    }} />
    {children}
  </div>
);

const Input = ({ label, type = 'text', value, onChange, placeholder, textarea, disabled, style }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div style={{ marginBottom: '24px', ...style }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: 'rgba(167, 139, 250, 0.8)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: '10px',
          fontWeight: 600,
        }}>
          {label}
        </label>
      )}
      <div style={{
        position: 'relative',
        borderRadius: '14px',
        padding: '2px',
        background: isFocused 
          ? 'linear-gradient(90deg, #8b5cf6, #06b6d4, #f472b6, #fbbf24, #8b5cf6)' 
          : 'transparent',
        backgroundSize: '200% 100%',
        animation: isFocused ? 'gradientFlow 2s linear infinite' : 'none',
      }}>
        <style>
          {`
            @keyframes gradientFlow {
              0% { background-position: 0% 50%; }
              100% { background-position: 200% 50%; }
            }
          `}
        </style>
        {textarea ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: '#0a0a0f',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: "'Inter', -apple-system, sans-serif",
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: '#0a0a0f',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: "'Inter', -apple-system, sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
          />
        )}
      </div>
    </div>
  );
};

const Select = ({ label, value, onChange, options, style }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div style={{ marginBottom: '24px', ...style }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: 'rgba(167, 139, 250, 0.8)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: '10px',
          fontWeight: 600,
        }}>
          {label}
        </label>
      )}
      <div style={{
        position: 'relative',
        borderRadius: '14px',
        padding: '2px',
        background: isFocused 
          ? 'linear-gradient(90deg, #8b5cf6, #06b6d4, #f472b6, #fbbf24, #8b5cf6)' 
          : 'transparent',
        backgroundSize: '200% 100%',
        animation: isFocused ? 'gradientFlow 2s linear infinite' : 'none',
      }}>
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: '#0a0a0f',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: "'Inter', -apple-system, sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: '#0f0a1a' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    healthy: { label: 'Protected', color: '#10b981', icon: '🛡️' },
    warning: { label: 'Check-in Soon', color: '#fbbf24', icon: '⚡' },
    danger: { label: 'Grace Period', color: '#ef4444', icon: '⏰' },
    claimable: { label: 'Claimable', color: '#8b5cf6', icon: '🔓' },
  };
  const config = configs[status] || configs.healthy;
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '100px',
      background: `${config.color}15`,
      border: `1px solid ${config.color}40`,
    }}>
      <span style={{ fontSize: '14px' }}>{config.icon}</span>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: config.color,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {config.label}
      </span>
    </div>
  );
};

const Logo = ({ size = 'md' }) => {
  const sizes = { sm: 24, md: 36, lg: 48 };
  const s = sizes[size];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: s,
        height: s,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
      }}>
        <span style={{ fontSize: s * 0.5, filter: 'brightness(2)' }}>⛓</span>
      </div>
      <span style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: s * 0.6,
        fontWeight: 700,
        background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}>
        Inherichain
      </span>
    </div>
  );
};

// ============================================
// LEGAL DISCLAIMER MODAL
// ============================================
const DisclaimerModal = ({ isOpen, onAccept }) => {
  const [scrolled, setScrolled] = useState(false);
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <Card style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          ⚠️ Important Disclaimer
        </h2>
        
        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            if (scrollTop + clientHeight >= scrollHeight - 10) setScrolled(true);
          }}
          style={{
            flex: 1,
            overflow: 'auto',
            marginBottom: '24px',
            padding: '20px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            fontSize: '13px',
            lineHeight: '1.7',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#fff' }}>Please read carefully before using Inherichain:</strong>
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>1. No Custody of Funds:</strong> Inherichain does not custody, control, or have access to your cryptocurrency, private keys, seed phrases, or any digital assets. All encryption occurs client-side in your browser.
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>2. Your Responsibility:</strong> You are solely responsible for:
          </p>
          <ul style={{ marginBottom: '16px', marginLeft: '20px' }}>
            <li>Securely storing and sharing your vault password with beneficiaries</li>
            <li>Ensuring beneficiary information is accurate and up-to-date</li>
            <li>Performing regular check-ins to maintain vault protection</li>
            <li>Verifying all wallet addresses and recovery information</li>
          </ul>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>3. No Guarantees:</strong> This service is provided "as-is" without warranties of any kind. We do not guarantee successful inheritance transfers, data recovery, or protection against all security threats.
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>4. Not Legal or Financial Advice:</strong> Inherichain is a software tool only. It does not constitute legal, financial, tax, or estate planning advice. Consult qualified professionals for your specific situation.
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>5. Risk of Loss:</strong> Cryptocurrency and digital assets carry inherent risks including but not limited to: loss of access, market volatility, regulatory changes, and technical failures. Use at your own risk.
          </p>
          
          <p style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#a78bfa' }}>6. Limitation of Liability:</strong> To the maximum extent permitted by law, Inherichain and its creators shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of this service.
          </p>
          
          <p style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            By clicking "I Understand & Accept", you acknowledge that you have read, understood, and agree to these terms.
          </p>
        </div>
        
        <Button
          onClick={onAccept}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!scrolled}
          style={{ opacity: scrolled ? 1 : 0.5 }}
        >
          {scrolled ? 'I Understand & Accept' : 'Scroll to Read All Terms'}
        </Button>
      </Card>
    </div>
  );
};

// ============================================
// LANDING PAGE
// ============================================
const LandingPage = ({ onGetStarted, onBeneficiary }) => (
  <div style={{
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  }}>
    {/* Header */}
    <header style={{
      padding: '24px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Logo size="md" />
      <div style={{ display: 'flex', gap: '16px' }}>
        <Button variant="ghost" onClick={onBeneficiary}>I'm a Beneficiary</Button>
        <Button variant="secondary" onClick={onGetStarted}>Launch App</Button>
      </div>
    </header>
    
    {/* Hero */}
    <main style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'inline-block',
        padding: '8px 20px',
        borderRadius: '100px',
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        marginBottom: '32px',
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#a78bfa',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          🔐 Private & Trustless
        </span>
      </div>
      
      <h1 style={{
        fontSize: 'clamp(40px, 8vw, 72px)',
        fontWeight: 800,
        lineHeight: 1.1,
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #06b6d4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        maxWidth: '900px',
      }}>
        Your Crypto Legacy,
        <br />Protected Forever
      </h1>
      
      <p style={{
        fontSize: '18px',
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.6)',
        maxWidth: '600px',
        marginBottom: '48px',
      }}>
        Ensure your cryptocurrency reaches your loved ones. Client-side encryption, 
        no custody, no KYC. Your keys, your rules, your legacy.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button onClick={onGetStarted} size="lg">
          Create Your Vault →
        </Button>
        <Button variant="secondary" size="lg" onClick={onBeneficiary}>
          Claim Inheritance
        </Button>
      </div>
      
      {/* Features */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginTop: '80px',
        width: '100%',
        maxWidth: '1000px',
      }}>
        {[
          { icon: '🔒', title: 'Client-Side Encryption', desc: 'Your data is encrypted in your browser. We never see your secrets.' },
          { icon: '⛓️', title: 'Multi-Chain Support', desc: 'Protect Bitcoin, Ethereum, Solana, and all your crypto holdings.' },
          { icon: '⏰', title: 'Dead Man\'s Switch', desc: 'Automatic release to beneficiaries after inactivity period.' },
          { icon: '👁️', title: 'Zero Knowledge', desc: 'No KYC, no accounts, no tracking. Complete privacy.' },
        ].map((f, i) => (
          <Card key={i} style={{ padding: '28px', textAlign: 'left' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{f.title}</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{f.desc}</p>
          </Card>
        ))}
      </div>
    </main>
    
    {/* Footer */}
    <footer style={{
      padding: '24px 40px',
      textAlign: 'center',
      color: 'rgba(255,255,255,0.3)',
      fontSize: '12px',
    }}>
      © 2025 Inherichain. Not financial or legal advice. Use at your own risk.
    </footer>
  </div>
);

// ============================================
// SETUP WIZARD
// ============================================
const SetupWizard = ({ onComplete, onBack }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [beneficiaries, setBeneficiaries] = useState([{ name: '', address: '', email: '' }]);
  const [wallets, setWallets] = useState([{ name: '', address: '', chain: 'ETH', balance: '' }]);
  const [secrets, setSecrets] = useState([{ label: '', value: '' }]);
  const [instructions, setInstructions] = useState('');
  const [checkInDays, setCheckInDays] = useState('30');
  const [graceDays, setGraceDays] = useState('7');
  const [isEncrypting, setIsEncrypting] = useState(false);
  
  const addBeneficiary = () => setBeneficiaries([...beneficiaries, { name: '', address: '', email: '' }]);
  const addWallet = () => setWallets([...wallets, { name: '', address: '', chain: 'ETH', balance: '' }]);
  const addSecret = () => setSecrets([...secrets, { label: '', value: '' }]);
  
  const updateBeneficiary = (i, field, val) => {
    const updated = [...beneficiaries];
    updated[i][field] = val;
    setBeneficiaries(updated);
  };
  
  const updateWallet = (i, field, val) => {
    const updated = [...wallets];
    updated[i][field] = val;
    setWallets(updated);
  };
  
  const updateSecret = (i, field, val) => {
    const updated = [...secrets];
    updated[i][field] = val;
    setSecrets(updated);
  };
  
  const handleCreate = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    setIsEncrypting(true);
    
    try {
      const vaultData = {
        beneficiaries: beneficiaries.filter(b => b.name || b.address),
        wallets: wallets.filter(w => w.address),
        secrets: secrets.filter(s => s.value),
        instructions,
        checkInDays: parseInt(checkInDays),
        graceDays: parseInt(graceDays),
        createdAt: Date.now(),
      };
      
      const encrypted = await CryptoUtils.encrypt(vaultData, password);
      
      // Simulate delay for effect
      await new Promise(r => setTimeout(r, 1500));
      
      onComplete({
        encrypted,
        vaultData,
        settings: { checkInDays: parseInt(checkInDays), graceDays: parseInt(graceDays) },
      });
    } catch (e) {
      alert('Encryption failed: ' + e.message);
    } finally {
      setIsEncrypting(false);
    }
  };
  
  const steps = [
    { num: 1, label: 'Password' },
    { num: 2, label: 'Beneficiaries' },
    { num: 3, label: 'Wallets' },
    { num: 4, label: 'Secrets' },
    { num: 5, label: 'Settings' },
  ];
  
  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      minHeight: '100vh',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Button variant="ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
            ← Back
          </Button>
          <Logo size="sm" />
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#fff',
            marginTop: '24px',
            marginBottom: '8px',
          }}>
            Create Your Vault
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            Step {step} of 5: {steps[step - 1].label}
          </p>
        </div>
        
        {/* Progress */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '40px',
        }}>
          {steps.map((s) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: s.num <= step 
                  ? 'linear-gradient(90deg, #8b5cf6, #06b6d4)' 
                  : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        
        <Card>
          {/* Step 1: Password */}
          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Create Master Password
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  This password encrypts your vault. Share it securely with your beneficiaries offline.
                </p>
              </div>
              
              <Input
                label="Master Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
              />
              
              <div style={{
                padding: '16px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <p style={{ fontSize: '13px', color: '#fbbf24', margin: 0 }}>
                  ⚠️ <strong>Critical:</strong> This password must be shared with your beneficiaries through a secure offline method. We cannot recover it.
                </p>
              </div>
              
              <Button
                fullWidth
                onClick={() => setStep(2)}
                disabled={!password || password !== confirmPassword || password.length < 8}
              >
                Continue →
              </Button>
            </>
          )}
          
          {/* Step 2: Beneficiaries */}
          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Add Beneficiaries
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Who should receive access to your crypto?
                </p>
              </div>
              
              {beneficiaries.map((b, i) => (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '16px', fontWeight: 600 }}>
                    Beneficiary {i + 1}
                  </div>
                  <Input
                    label="Name"
                    value={b.name}
                    onChange={(e) => updateBeneficiary(i, 'name', e.target.value)}
                    placeholder="e.g., John Doe"
                    style={{ marginBottom: '16px' }}
                  />
                  <Input
                    label="Wallet Address (Optional)"
                    value={b.address}
                    onChange={(e) => updateBeneficiary(i, 'address', e.target.value)}
                    placeholder="0x..."
                    style={{ marginBottom: '16px' }}
                  />
                  <Input
                    label="Email (Optional - for notifications)"
                    type="email"
                    value={b.email}
                    onChange={(e) => updateBeneficiary(i, 'email', e.target.value)}
                    placeholder="john@example.com"
                    style={{ marginBottom: '0' }}
                  />
                </div>
              ))}
              
              <Button variant="secondary" fullWidth onClick={addBeneficiary} style={{ marginBottom: '24px' }}>
                + Add Another Beneficiary
              </Button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Back
                </Button>
                <Button onClick={() => setStep(3)} style={{ flex: 2 }}>
                  Continue →
                </Button>
              </div>
            </>
          )}
          
          {/* Step 3: Wallets */}
          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Track Your Wallets
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Add wallet addresses for your beneficiaries to know what exists (view-only).
                </p>
              </div>
              
              {wallets.map((w, i) => (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}>
                  <Input
                    label="Wallet Name"
                    value={w.name}
                    onChange={(e) => updateWallet(i, 'name', e.target.value)}
                    placeholder="e.g., Main Ledger, Coinbase"
                    style={{ marginBottom: '16px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Select
                      label="Chain"
                      value={w.chain}
                      onChange={(e) => updateWallet(i, 'chain', e.target.value)}
                      options={CHAINS.map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
                    />
                    <Input
                      label="Approx. Balance"
                      value={w.balance}
                      onChange={(e) => updateWallet(i, 'balance', e.target.value)}
                      placeholder="e.g., 2.5"
                      style={{ marginBottom: '0' }}
                    />
                  </div>
                  <Input
                    label="Wallet Address"
                    value={w.address}
                    onChange={(e) => updateWallet(i, 'address', e.target.value)}
                    placeholder="0x... or bc1..."
                    style={{ marginBottom: '0', marginTop: '16px' }}
                  />
                </div>
              ))}
              
              <Button variant="secondary" fullWidth onClick={addWallet} style={{ marginBottom: '24px' }}>
                + Add Another Wallet
              </Button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
                  ← Back
                </Button>
                <Button onClick={() => setStep(4)} style={{ flex: 2 }}>
                  Continue →
                </Button>
              </div>
            </>
          )}
          
          {/* Step 4: Secrets */}
          {step === 4 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗝️</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Store Recovery Secrets
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Seed phrases, passwords, PINs — encrypted client-side with AES-256.
                </p>
              </div>
              
              <div style={{
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <p style={{ fontSize: '13px', color: '#10b981', margin: 0 }}>
                  🔒 <strong>Encrypted locally:</strong> Your secrets never leave your browser unencrypted.
                </p>
              </div>
              
              {secrets.map((s, i) => (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}>
                  <Input
                    label="Label"
                    value={s.label}
                    onChange={(e) => updateSecret(i, 'label', e.target.value)}
                    placeholder="e.g., Ledger Seed Phrase, Coinbase Password"
                    style={{ marginBottom: '16px' }}
                  />
                  <Input
                    label="Secret Value"
                    value={s.value}
                    onChange={(e) => updateSecret(i, 'value', e.target.value)}
                    placeholder="Enter your seed phrase, password, or PIN..."
                    textarea
                    style={{ marginBottom: '0' }}
                  />
                </div>
              ))}
              
              <Button variant="secondary" fullWidth onClick={addSecret} style={{ marginBottom: '16px' }}>
                + Add Another Secret
              </Button>
              
              <Input
                label="Instructions for Beneficiaries (Optional)"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Any additional instructions on how to access your crypto..."
                textarea
              />
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>
                  ← Back
                </Button>
                <Button onClick={() => setStep(5)} style={{ flex: 2 }}>
                  Continue →
                </Button>
              </div>
            </>
          )}
          
          {/* Step 5: Settings */}
          {step === 5 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Dead Man's Switch Settings
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Configure your check-in frequency and grace period.
                </p>
              </div>
              
              <Select
                label="Check-in Frequency"
                value={checkInDays}
                onChange={(e) => setCheckInDays(e.target.value)}
                options={[
                  { value: '7', label: 'Every 7 days' },
                  { value: '14', label: 'Every 14 days' },
                  { value: '30', label: 'Every 30 days' },
                  { value: '60', label: 'Every 60 days' },
                  { value: '90', label: 'Every 90 days' },
                  { value: '180', label: 'Every 180 days' },
                  { value: '365', label: 'Every 365 days' },
                ]}
              />
              
              <Select
                label="Grace Period After Missed Check-in"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                options={[
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                  { value: '60', label: '60 days' },
                  { value: '90', label: '90 days' },
                ]}
              />
              
              <div style={{
                padding: '20px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <p style={{ fontSize: '14px', color: '#a78bfa', margin: 0 }}>
                  📋 <strong>Summary:</strong> You must check in every <strong>{checkInDays} days</strong>. 
                  If you miss a check-in, beneficiaries can claim after an additional <strong>{graceDays} day</strong> grace period.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setStep(4)} style={{ flex: 1 }}>
                  ← Back
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleCreate} 
                  style={{ flex: 2 }}
                  disabled={isEncrypting}
                >
                  {isEncrypting ? '🔐 Encrypting...' : '✓ Create Vault'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

// ============================================
// OWNER DASHBOARD
// ============================================
const OwnerDashboard = ({ vaultData, settings, onCheckIn, onLogout }) => {
  const [lastCheckIn, setLastCheckIn] = useState(Date.now());
  const [showSecret, setShowSecret] = useState({});
  
  const getStatus = () => {
    const now = Date.now();
    const checkInDeadline = lastCheckIn + (settings.checkInDays * 24 * 60 * 60 * 1000);
    const claimDeadline = checkInDeadline + (settings.graceDays * 24 * 60 * 60 * 1000);
    
    if (now >= claimDeadline) return 'claimable';
    if (now >= checkInDeadline) return 'danger';
    if (now >= checkInDeadline - (3 * 24 * 60 * 60 * 1000)) return 'warning';
    return 'healthy';
  };
  
  const getTimeRemaining = () => {
    const now = Date.now();
    const checkInDeadline = lastCheckIn + (settings.checkInDays * 24 * 60 * 60 * 1000);
    const remaining = checkInDeadline - now;
    
    if (remaining <= 0) return 'Check-in overdue!';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return `${days}d ${hours}h remaining`;
  };
  
  const handleCheckIn = () => {
    setLastCheckIn(Date.now());
    onCheckIn();
  };
  
  const totalValue = vaultData.wallets.reduce((sum, w) => {
    const price = PRICES[w.chain] || 0;
    return sum + (parseFloat(w.balance) || 0) * price;
  }, 0);
  
  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      minHeight: '100vh',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}>
          <Logo size="sm" />
          <Button variant="ghost" onClick={onLogout}>Logout</Button>
        </div>
        
        {/* Status Card */}
        <Card glow={getStatus() === 'healthy' ? '#10b981' : '#ef4444'} style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div>
              <StatusBadge status={getStatus()} />
              <h2 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#fff',
                marginTop: '16px',
                marginBottom: '8px',
              }}>
                Your Vault is {getStatus() === 'healthy' ? 'Protected' : 'At Risk'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Next check-in: <strong style={{ color: '#fff' }}>{getTimeRemaining()}</strong>
              </p>
            </div>
            <Button
              variant={getStatus() === 'healthy' ? 'primary' : 'danger'}
              size="lg"
              onClick={handleCheckIn}
            >
              ✓ Check In Now
            </Button>
          </div>
        </Card>
        
        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <Card>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Total Value Protected
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
              ${totalValue.toLocaleString()}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Wallets Tracked
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
              {vaultData.wallets.filter(w => w.address).length}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Beneficiaries
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
              {vaultData.beneficiaries.filter(b => b.name).length}
            </div>
          </Card>
        </div>
        
        {/* Wallets */}
        <Card style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
            💰 Tracked Wallets
          </h3>
          {vaultData.wallets.filter(w => w.address).map((w, i) => {
            const chain = CHAINS.find(c => c.value === w.chain) || CHAINS[0];
            const value = (parseFloat(w.balance) || 0) * (PRICES[w.chain] || 0);
            return (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${chain.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {chain.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{w.name || 'Unnamed Wallet'}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      {w.address.slice(0, 8)}...{w.address.slice(-6)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{w.balance} {w.chain}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    ≈ ${value.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
        
        {/* Secrets */}
        <Card style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
            🗝️ Stored Secrets
          </h3>
          {vaultData.secrets.filter(s => s.value).map((s, i) => (
            <div key={i} style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{s.label || `Secret ${i + 1}`}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecret({ ...showSecret, [i]: !showSecret[i] })}
                >
                  {showSecret[i] ? 'Hide' : 'Reveal'}
                </Button>
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                wordBreak: 'break-all',
              }}>
                {showSecret[i] ? s.value : '••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          ))}
        </Card>
        
        {/* Beneficiaries */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
            👨‍👩‍👧‍👦 Beneficiaries
          </h3>
          {vaultData.beneficiaries.filter(b => b.name).map((b, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              marginBottom: '12px',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#fff' }}>{b.name}</div>
                {b.email && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{b.email}</div>
                )}
              </div>
              {b.address && (
                <div style={{
                  fontSize: '12px',
                  color: '#a78bfa',
                  fontFamily: 'monospace',
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}>
                  {b.address.slice(0, 6)}...{b.address.slice(-4)}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ============================================
// BENEFICIARY CLAIM PAGE
// ============================================
const BeneficiaryPage = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [decryptedVault, setDecryptedVault] = useState(null);
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  
  const handleDecrypt = async () => {
    setError('');
    setIsDecrypting(true);
    
    try {
      const parsed = JSON.parse(encryptedData);
      const decrypted = await CryptoUtils.decrypt(parsed, password);
      setDecryptedVault(decrypted);
    } catch (e) {
      setError('Decryption failed. Check your password and encrypted data.');
    } finally {
      setIsDecrypting(false);
    }
  };
  
  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      minHeight: '100vh',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
          ← Back
        </Button>
        
        <Logo size="sm" />
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#fff',
          marginTop: '24px',
          marginBottom: '16px',
        }}>
          {decryptedVault ? '🔓 Vault Unlocked' : '🔐 Claim Inheritance'}
        </h1>
        
        {!decryptedVault ? (
          <Card>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '24px',
              lineHeight: 1.7,
            }}>
              If you've been designated as a beneficiary and the vault owner has been inactive beyond their 
              check-in period, you can decrypt their vault using the master password they shared with you.
            </p>
            
            <Input
              label="Encrypted Vault Data"
              value={encryptedData}
              onChange={(e) => setEncryptedData(e.target.value)}
              placeholder='Paste the encrypted vault JSON here...'
              textarea
            />
            
            <Input
              label="Master Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the password shared by vault owner"
            />
            
            {error && (
              <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>❌ {error}</p>
              </div>
            )}
            
            <Button
              fullWidth
              onClick={handleDecrypt}
              disabled={!password || !encryptedData || isDecrypting}
            >
              {isDecrypting ? '🔐 Decrypting...' : 'Unlock Vault'}
            </Button>
          </Card>
        ) : (
          <>
            <div style={{
              padding: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '14px', color: '#10b981', margin: 0 }}>
                ✅ <strong>Vault successfully decrypted.</strong> Below is all the information you need to access the crypto assets.
              </p>
            </div>
            
            {/* Instructions */}
            {decryptedVault.instructions && (
              <Card style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
                  📝 Instructions from Vault Owner
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {decryptedVault.instructions}
                </p>
              </Card>
            )}
            
            {/* Wallets */}
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
                💰 Wallet Addresses
              </h3>
              {decryptedVault.wallets?.filter(w => w.address).map((w, i) => {
                const chain = CHAINS.find(c => c.value === w.chain) || CHAINS[0];
                return (
                  <div key={i} style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                      {chain.icon} {w.name || 'Wallet'} ({w.chain})
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#a78bfa',
                      wordBreak: 'break-all',
                      background: 'rgba(139, 92, 246, 0.1)',
                      padding: '12px',
                      borderRadius: '8px',
                    }}>
                      {w.address}
                    </div>
                    {w.balance && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                        Approximate balance: {w.balance} {w.chain}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
            
            {/* Secrets */}
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
                🗝️ Recovery Secrets
              </h3>
              <div style={{
                padding: '16px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '13px', color: '#fbbf24', margin: 0 }}>
                  ⚠️ <strong>Sensitive information.</strong> Handle these secrets with extreme care. 
                  Never share them with anyone or enter them on suspicious websites.
                </p>
              </div>
              
              {decryptedVault.secrets?.filter(s => s.value).map((s, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{s.label || `Secret ${i + 1}`}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowSecrets({ ...showSecrets, [i]: !showSecrets[i] })}
                    >
                      {showSecrets[i] ? '🙈 Hide' : '👁️ Reveal'}
                    </Button>
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: showSecrets[i] ? '#10b981' : 'rgba(255,255,255,0.3)',
                    wordBreak: 'break-all',
                    background: showSecrets[i] ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                    padding: '16px',
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {showSecrets[i] ? s.value : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </div>
                </div>
              ))}
            </Card>
            
            <Button variant="secondary" fullWidth onClick={() => {
              setDecryptedVault(null);
              setPassword('');
              setEncryptedData('');
            }}>
              Clear & Start Over
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [view, setView] = useState('landing');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [vaultData, setVaultData] = useState(null);
  const [settings, setSettings] = useState({ checkInDays: 30, graceDays: 7 });
  const [encryptedVault, setEncryptedVault] = useState(null);
  
  const handleGetStarted = () => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
    } else {
      setView('setup');
    }
  };
  
  const handleAcceptDisclaimer = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    setView('setup');
  };
  
  const handleVaultCreated = ({ encrypted, vaultData: data, settings: s }) => {
    setEncryptedVault(encrypted);
    setVaultData(data);
    setSettings(s);
    setView('dashboard');
    
    // Log encrypted vault for user to save
    console.log('=== SAVE THIS ENCRYPTED VAULT DATA ===');
    console.log(JSON.stringify(encrypted));
    console.log('======================================');
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#fff',
      overflow: 'hidden',
    }}>
      <NeuralNebula />
      
      <DisclaimerModal 
        isOpen={showDisclaimer} 
        onAccept={handleAcceptDisclaimer} 
      />
      
      {view === 'landing' && (
        <LandingPage
          onGetStarted={handleGetStarted}
          onBeneficiary={() => setView('beneficiary')}
        />
      )}
      
      {view === 'setup' && (
        <SetupWizard
          onComplete={handleVaultCreated}
          onBack={() => setView('landing')}
        />
      )}
      
      {view === 'dashboard' && vaultData && (
        <OwnerDashboard
          vaultData={vaultData}
          settings={settings}
          encryptedVault={encryptedVault}
          onCheckIn={() => console.log('Checked in!')}
          onLogout={() => {
            setVaultData(null);
            setView('landing');
          }}
        />
      )}
      
      {view === 'beneficiary' && (
        <BeneficiaryPage onBack={() => setView('landing')} />
      )}
      
      {/* Export encrypted vault modal trigger */}
      {view === 'dashboard' && encryptedVault && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
        }}>
          <Button
            variant="secondary"
            onClick={() => {
              const data = JSON.stringify(encryptedVault, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'inherichain-vault-encrypted.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📥 Export Encrypted Vault
          </Button>
        </div>
      )}
    </div>
  );
}
