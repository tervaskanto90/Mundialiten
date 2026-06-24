// Emblema original de Mundialiten (NO es el logo de la FIFA): un trofeo estilizado
// sobre una placa con degradé multicolor y el "26" del Mundial. Del handoff de diseño.
export function Emblem({ size = 50 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-label="Mundialiten">
      <defs>
        <linearGradient id="mdlBadge2" x1="4" y1="2" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F6DF0" />
          <stop offset=".34" stopColor="#7B3FF2" />
          <stop offset=".64" stopColor="#EC1C7D" />
          <stop offset=".85" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#FFC21A" />
        </linearGradient>
        <linearGradient id="mdlCupBody" x1="18" y1="9" x2="34" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1C2" />
          <stop offset=".45" stopColor="#FFD24A" />
          <stop offset="1" stopColor="#E59A12" />
        </linearGradient>
        <linearGradient id="mdlCupShine" x1="22" y1="10" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mdlGlobe" cx=".4" cy=".35" r=".75">
          <stop stopColor="#FFF7DC" />
          <stop offset=".6" stopColor="#FFCB3E" />
          <stop offset="1" stopColor="#D98A0E" />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="46" height="46" rx="14" fill="url(#mdlBadge2)" />
      <rect x="3.7" y="3.7" width="44.6" height="44.6" rx="13.3" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.1" />
      <path d="M11 11 L20 11 L20 20 L11 20 Z" fill="#fff" opacity=".12" />
      <path d="M41 41 A11 11 0 0 1 30 41 L30 30 L41 30 Z" fill="#fff" opacity=".1" />
      <circle cx="26" cy="16.5" r="6.4" fill="url(#mdlGlobe)" />
      <path d="M22.6 13.4q3.4-2.1 6.8 0M21.8 17q4.2 2.4 8.4 0M26 10.2v12.6" stroke="#B5760A" strokeWidth=".8" strokeLinecap="round" opacity=".5" fill="none" />
      <path d="M20.4 21.5q5.6 4 11.2 0 1.3 6.2-2.4 11.2-1 1.4-1 3.1v1.8h2.2a1.3 1.3 0 0 1 0 2.6H21.6a1.3 1.3 0 0 1 0-2.6h2.2v-1.8q0-1.7-1-3.1-3.7-5-2.4-11.2Z" fill="url(#mdlCupBody)" />
      <path d="M22 22q2 1.2 2 4.4 0 4-1.4 7.4" stroke="url(#mdlCupShine)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <rect x="19.4" y="40.4" width="13.2" height="3" rx="1.5" fill="url(#mdlCupBody)" />
      <text x="38.5" y="44.5" textAnchor="middle" fontFamily="'Archivo',sans-serif" fontWeight="900" fontSize="11" fill="#fff" stroke="#0006" strokeWidth=".4">26</text>
    </svg>
  )
}
