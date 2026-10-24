import React from 'react';

export interface NexoraCoinLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  showText?: boolean;
  showTagline?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  animated?: boolean;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const NexoraCoinLogo: React.FC<NexoraCoinLogoProps> = ({
  size = 'md',
  showText = false,
  showTagline = false,
  showBadge = false,
  badgeText = 'Virtual Coin',
  animated = true,
  className = '',
  onClick,
}) => {
  const getPixelSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs':
        return 24;
      case 'sm':
        return 32;
      case 'md':
        return 44;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
      case '2xl':
        return 140;
      default:
        return 44;
    }
  };

  const px = getPixelSize();

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      role="img"
      aria-label="NEXORA COIN Logo: Metallic champagne-gold coin with futuristic N emblem"
    >
      {/* 
        Coin Graphic Container:
        Strictly enforces 1:1 aspect-square, flex-shrink-0, and overflow-visible 
        to guarantee the circular coin is never cropped, distorted, or stretched.
      */}
      <div
        className="relative flex-shrink-0 aspect-square flex items-center justify-center"
        style={{ width: `${px}px`, height: `${px}px` }}
      >
        {/* Subtle, elegant warm gold ambient rim highlight (No excessive neon glow) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-40 transition-opacity duration-300 group-hover:opacity-60"
          style={{
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.28), inset 0 0 8px rgba(255, 243, 214, 0.15)',
          }}
        />

        {/* 
          SVG Metallic Gold Coin with 3D Depth, Milled Rim, and Centered Futuristic N
        */}
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full aspect-square ${
            animated ? 'animate-coin-slow-rotate' : ''
          }`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Coin Edge Bevel Gradient (Light top-left to dark bottom-right) */}
            <linearGradient id="coinOuterRim" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#FFF9E6" />
              <stop offset="25%" stopColor="#ECC86A" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="80%" stopColor="#7E5F15" />
              <stop offset="100%" stopColor="#3D2B03" />
            </linearGradient>

            {/* Inner Recessed Coin Field Gradient (Metallic Champagne Tone) */}
            <radialGradient id="coinFacePlate" cx="45%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#252115" />
              <stop offset="45%" stopColor="#141311" />
              <stop offset="85%" stopColor="#0B0B0C" />
              <stop offset="100%" stopColor="#050506" />
            </radialGradient>

            {/* Raised Relief Gold Texture */}
            <linearGradient id="reliefGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF5D9" />
              <stop offset="35%" stopColor="#ECC86A" />
              <stop offset="70%" stopColor="#C49B27" />
              <stop offset="100%" stopColor="#8A6715" />
            </linearGradient>

            {/* Futuristic N Pillar Highlights */}
            <linearGradient id="nPillarLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#F9E298" />
              <stop offset="75%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#7A5910" />
            </linearGradient>

            <linearGradient id="nDiagonalBlade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDE8" />
              <stop offset="40%" stopColor="#ECC86A" />
              <stop offset="80%" stopColor="#A88022" />
              <stop offset="100%" stopColor="#5E430A" />
            </linearGradient>

            <linearGradient id="nPillarRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D77F" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#6C4E0B" />
            </linearGradient>

            {/* Subtle Specular Arc */}
            <linearGradient id="specularArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFF9E6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Base Coin Outer Shadow Ring */}
          <circle cx="60" cy="60" r="58" fill="#000000" fillOpacity="0.5" />

          {/* 2. Outer Stepped Metallic Rim (Defined circular coin boundary) */}
          <circle cx="60" cy="60" r="57" fill="url(#coinOuterRim)" stroke="#3D2B03" strokeWidth="1" />

          {/* 3. Milled Serrated Edge - 48 Precision Notches */}
          <circle
            cx="60"
            cy="60"
            r="53.5"
            stroke="url(#reliefGold)"
            strokeWidth="2.2"
            strokeDasharray="2.2 4.8"
            opacity="0.85"
          />

          {/* 4. Concentric Beveled Outer Inlay Ring */}
          <circle cx="60" cy="60" r="49" stroke="#ECC86A" strokeWidth="1.2" opacity="0.6" />

          {/* 5. Deep Recessed Coin Face Field */}
          <circle cx="60" cy="60" r="46.5" fill="url(#coinFacePlate)" stroke="#D4AF37" strokeWidth="0.8" opacity="0.95" />

          {/* 6. Geometric Guilloche Chapter Ring & Micro Dots */}
          <circle
            cx="60"
            cy="60"
            r="43"
            stroke="#ECC86A"
            strokeWidth="0.6"
            strokeDasharray="1.2 3.5"
            opacity="0.4"
          />
          <circle cx="60" cy="60" r="41" stroke="#D4AF37" strokeWidth="0.4" opacity="0.25" />

          {/* 7. Subtle Hexagonal Quantum Substrate Lattice */}
          <polygon
            points="60,23 88,39 88,81 60,97 32,81 32,39"
            stroke="#ECC86A"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            opacity="0.3"
          />

          {/* 8. Top Specular Sheen Arc (Simulating studio light reflection) */}
          <path
            d="M 28 44 A 42 42 0 0 1 92 44"
            stroke="url(#specularArc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 
            9. PROMINENT, LARGE, SHARP FUTURISTIC 'N' EMBLEM (Centered in 120x120 viewBox)
            Coordinates calculated for razor-sharp geometric alignment & 3D relief depth.
          */}
          <g className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            {/* Left Vertical Pillar with Beveled Top Angle */}
            <polygon
              points="34,26 44,21 44,99 34,94"
              fill="url(#nPillarLeft)"
              stroke="#FFF9E6"
              strokeWidth="0.4"
            />

            {/* Powerful Diagonal Blade Connecting Left and Right */}
            <polygon
              points="44,21 54,26 76,99 66,94"
              fill="url(#nDiagonalBlade)"
              stroke="#FFE599"
              strokeWidth="0.5"
            />

            {/* Right Vertical Pillar with Inverted Bevel */}
            <polygon
              points="76,21 86,26 86,94 76,99"
              fill="url(#nPillarRight)"
              stroke="#E2B744"
              strokeWidth="0.4"
            />

            {/* Accent Apex Diamonds for Futuristic High-Tech Read */}
            <polygon points="39,18 44,21 39,24 34,21" fill="#FFFFFF" opacity="0.9" />
            <polygon points="81,96 86,99 81,102 76,99" fill="#FFFFFF" opacity="0.9" />

            {/* Center Precision Micro-Slit Reflection */}
            <line x1="47" y1="60" x2="57" y2="60" stroke="#FFF5D9" strokeWidth="1.2" opacity="0.8" />
            <line x1="63" y1="60" x2="73" y2="60" stroke="#FFF5D9" strokeWidth="1.2" opacity="0.8" />
          </g>
        </svg>
      </div>

      {/* Optional Typography / Brand Text */}
      {(showText || showTagline) && (
        <div className="flex flex-col justify-center">
          {showText && (
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D9] via-[#ECC86A] to-[#D4AF37] tracking-wider leading-none">
                NEXORA COIN
              </span>
              {showBadge && (
                <span className="text-[9px] uppercase tracking-widest font-mono font-medium px-2 py-0.5 rounded-full bg-[#181B26] border border-[#D4AF37]/35 text-[#ECC86A] leading-tight">
                  {badgeText}
                </span>
              )}
            </div>
          )}
          {showTagline && (
            <p className="text-[10px] tracking-[0.24em] font-medium text-slate-400 uppercase mt-0.5 font-mono">
              MINE THE FUTURE
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Also export as NexoraLogo for 100% backward compatibility
export const NexoraLogo = NexoraCoinLogo;
export default NexoraCoinLogo;
