import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface CrispQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
  showBorder?: boolean;
}

export const CrispQrCode: React.FC<CrispQrCodeProps> = ({
  value,
  size = 120,
  className = '',
  label,
  showBorder = true
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#000000', // Noir pur pour contraste maximal
        light: '#ffffff'  // Blanc pur
      },
      errorCorrectionLevel: 'H' // Tolérance d'erreur maximale (30%) pour scan instantané
    })
      .then(svg => {
        if (isMounted) {
          // Ajuster les attributs SVG pour un affichage pleine taille
          const responsiveSvg = svg
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/height="[^"]*"/, 'height="100%"');
          setSvgMarkup(responsiveSvg);
        }
      })
      .catch(err => {
        console.error('Erreur génération QR Code SVG:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`bg-white p-1.5 rounded-lg inline-flex items-center justify-center overflow-hidden transition-all ${
          showBorder ? 'shadow-sm border border-slate-200' : ''
        }`}
        style={{ width: size, height: size }}
      >
        {svgMarkup ? (
          <div 
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: svgMarkup }} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[9px] text-slate-500 font-medium">
            Génération...
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] text-slate-600 mt-1 font-mono text-center truncate max-w-[160px]">
          {label}
        </span>
      )}
    </div>
  );
};
