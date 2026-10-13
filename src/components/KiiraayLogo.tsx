import React from 'react';

interface KiiraayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'horizontal' | 'emblem-only' | 'text-only';
  inverted?: boolean; // For dark backgrounds
  className?: string;
}

export const KiiraayLogo: React.FC<KiiraayLogoProps> = ({
  size = 'md',
  variant = 'full',
  inverted = false,
  className = ''
}) => {
  // Dimensions
  const dim = {
    sm: { emblem: 32, text: 'text-sm', sub: 'text-[9px]' },
    md: { emblem: 44, text: 'text-lg', sub: 'text-[10px]' },
    lg: { emblem: 64, text: 'text-2xl', sub: 'text-xs' },
    xl: { emblem: 96, text: 'text-3xl', sub: 'text-sm' }
  }[size];

  // Palette de la charte officielle
  const bleu = '#0284c7'; // Bleu cyan océan républicain
  const bleuSombre = '#0369a1';
  const rouge = '#dc2626'; // Rouge vif protecteur

  // Composant Emblème SVG (Lauriers + Parapluie rouge + Main tenant la hampe + Silhouette Sénégal)
  const EmblemSvg = (
    <svg
      viewBox="0 0 200 200"
      className="shrink-0 drop-shadow-xs"
      style={{ width: dim.emblem, height: dim.emblem }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Silhouette en fond : Carte stylisée du Sénégal */}
      <path
        d="M60 95 C 65 75, 95 65, 120 70 C 135 75, 155 85, 150 105 C 145 120, 130 135, 105 130 C 85 125, 75 110, 60 95 Z"
        fill={inverted ? 'rgba(255,255,255,0.08)' : 'rgba(2, 132, 199, 0.08)'}
        stroke={inverted ? 'rgba(255,255,255,0.25)' : 'rgba(2, 132, 199, 0.25)'}
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />

      {/* 2. Couronne de Lauriers en Bleu Cyan */}
      <g stroke={bleu} fill={bleu} strokeWidth="1.5">
        {/* Tige gauche */}
        <path
          d="M 100 162 C 60 160, 28 130, 30 75"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Feuilles gauche */}
        <path d="M 31 77 C 22 72, 24 62, 33 65 C 38 68, 36 75, 31 77 Z" />
        <path d="M 28 92 C 18 89, 18 78, 28 80 C 34 83, 33 90, 28 92 Z" />
        <path d="M 29 108 C 18 107, 16 96, 27 96 C 33 99, 34 106, 29 108 Z" />
        <path d="M 34 124 C 23 125, 20 114, 30 112 C 37 113, 39 121, 34 124 Z" />
        <path d="M 43 139 C 33 143, 28 132, 38 128 C 45 127, 48 135, 43 139 Z" />
        <path d="M 58 151 C 49 157, 41 148, 51 141 C 58 138, 63 146, 58 151 Z" />
        <path d="M 76 159 C 68 167, 59 159, 68 151 C 75 146, 81 153, 76 159 Z" />

        {/* Tige droite */}
        <path
          d="M 100 162 C 140 160, 172 130, 170 75"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Feuilles droite */}
        <path d="M 169 77 C 178 72, 176 62, 167 65 C 162 68, 164 75, 169 77 Z" />
        <path d="M 172 92 C 182 89, 182 78, 172 80 C 166 83, 167 90, 172 92 Z" />
        <path d="M 171 108 C 182 107, 184 96, 173 96 C 167 99, 166 106, 171 108 Z" />
        <path d="M 166 124 C 177 125, 180 114, 170 112 C 163 113, 161 121, 166 124 Z" />
        <path d="M 157 139 C 167 143, 172 132, 162 128 C 155 127, 152 135, 157 139 Z" />
        <path d="M 142 151 C 151 157, 159 148, 149 141 C 142 138, 137 146, 142 151 Z" />
        <path d="M 124 159 C 132 167, 141 159, 132 151 C 125 146, 119 153, 124 159 Z" />

        {/* Nœud inférieur */}
        <path d="M 94 162 C 98 165, 102 165, 106 162 C 103 160, 97 160, 94 162 Z" />
      </g>

      {/* 3. Hampe du parapluie (mât central et canne) */}
      <path
        d="M 100 48 L 100 135 C 100 143, 107 145, 110 141 C 112 138, 109 135, 107 136"
        stroke="#991b1b"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* 4. Dôme du Parapluie Rouge (KIIRAAY = la protection, le toit) */}
      {/* Pointe supérieure */}
      <circle cx="100" cy="46" r="3" fill="#991b1b" />

      {/* Toile rouge principale */}
      <path
        d="M 52 82 C 54 52, 146 52, 148 82 C 134 78, 120 80, 116 83 C 112 80, 88 80, 84 83 C 80 80, 66 78, 52 82 Z"
        fill={rouge}
      />
      {/* Nervures du parapluie */}
      <path
        d="M 100 48 Q 98 65, 84 83 M 100 48 Q 102 65, 116 83"
        stroke="#fca5a5"
        strokeWidth="1.2"
        fill="none"
      />

      {/* 5. Poing / Main Bleue tenant fermement la hampe */}
      <g fill={bleu} stroke="#0369a1" strokeWidth="1">
        {/* Poing fermé */}
        <rect x="86" y="90" width="28" height="22" rx="6" />
        {/* Doigts repliés */}
        <line x1="94" y1="91" x2="94" y2="111" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="101" y1="91" x2="101" y2="111" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="108" y1="91" x2="108" y2="111" stroke="#ffffff" strokeWidth="1.5" />
        {/* Pouce maintenant la hampe */}
        <path d="M 86 96 C 82 98, 83 105, 89 104 Z" fill={bleu} />
      </g>
    </svg>
  );

  // Composant Typographie (K [bleu] + II [rouge] + RAAY [bleu] + LES PATRIOTES RÉPUBLICAINS)
  const Typography = (
    <div className={`flex flex-col items-center leading-none ${className}`}>
      <div className={`font-black tracking-tight flex items-baseline select-none ${dim.text}`}>
        <span style={{ color: bleu }}>K</span>
        <span style={{ color: rouge }} className="tracking-tighter">II</span>
        <span style={{ color: bleu }}>RAAY</span>
      </div>
      <div
        className={`font-bold tracking-widest uppercase mt-0.5 whitespace-nowrap select-none ${dim.sub}`}
        style={{ color: rouge }}
      >
        LES PATRIOTES RÉPUBLICAINS
      </div>
    </div>
  );

  if (variant === 'emblem-only') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{EmblemSvg}</div>;
  }

  if (variant === 'text-only') {
    return Typography;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {EmblemSvg}
        <div className="flex flex-col text-left">
          <div className={`font-black tracking-tight flex items-baseline select-none ${dim.text}`}>
            <span style={{ color: bleu }}>K</span>
            <span style={{ color: rouge }} className="tracking-tighter">II</span>
            <span style={{ color: bleu }}>RAAY</span>
          </div>
          <div
            className={`font-extrabold tracking-widest uppercase mt-0.5 whitespace-nowrap select-none ${dim.sub}`}
            style={{ color: rouge }}
          >
            LES PATRIOTES RÉPUBLICAINS
          </div>
        </div>
      </div>
    );
  }

  // Variant 'full' (Vertical lockup comme le logo officiel téléversé)
  return (
    <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
      {EmblemSvg}
      {Typography}
    </div>
  );
};
