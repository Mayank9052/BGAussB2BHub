// ─────────────────────────────────────────────
// FILE: src/SplashScreen.tsx
// Animated splash screen shown on app start
// Shows BGauss logo with electric animation
// then fades out after ~2.5s
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import "./SplashScreen.css";
import logo from "./assets/logo.jpg";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold
    const t1 = setTimeout(() => setPhase("hold"), 600);
    // hold → exit
    const t2 = setTimeout(() => setPhase("exit"), 2000);
    // unmount
    const t3 = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`splash-root splash-${phase}`}>
      {/* Electric grid bg */}
      <div className="splash-grid" />

      {/* Glow orb */}
      <div className="splash-orb" />

      {/* Main content */}
      <div className="splash-content">
        {/* Logo ring */}
        <div className="splash-logo-ring">
          <svg className="splash-ring-svg" viewBox="0 0 120 120">
            <circle
              className="splash-ring-track"
              cx="60" cy="60" r="54"
              fill="none" strokeWidth="1.5"
            />
            <circle
              className="splash-ring-arc"
              cx="60" cy="60" r="54"
              fill="none" strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="splash-logo-wrap">
            <img src={logo} alt="BGauss" className="splash-logo" />
          </div>
        </div>

        {/* Brand name */}
        <div className="splash-brand">
          <span className="splash-brand-bg">BG</span>
          <span className="splash-brand-main">AUSS</span>
        </div>

        {/* Tagline */}
        <p className="splash-tagline">Electric Mobility Portal</p>

        {/* Loading bar */}
        <div className="splash-bar-wrap">
          <div className="splash-bar" />
        </div>

        {/* Electric dots */}
        <div className="splash-dots">
          {[0,1,2,3,4].map(i => (
            <span key={i} className="splash-dot" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>

      {/* Lightning bolts decoration */}
      <div className="splash-bolt splash-bolt-1">⚡</div>
      <div className="splash-bolt splash-bolt-2">⚡</div>
    </div>
  );
}