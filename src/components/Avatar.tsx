/** Foto de perfil: muestra la imagen si hay; si no, la inicial del nombre sobre
 *  un degradé. Se usa en el header, el ranking y la cuenta. */
export function Avatar({
  src,
  name,
  size = 38,
  radius,
}: {
  src?: string | null
  name?: string
  size?: number
  radius?: number
}) {
  const r = radius ?? Math.round(size * 0.29)
  const initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?'
  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flex: 'none', display: 'block' }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        flex: 'none',
        background: 'linear-gradient(135deg,#FF7A1A,#EC1C7D)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.45),
        fontFamily: "'Archivo'",
        fontWeight: 900,
        color: '#fff',
      }}
    >
      {initial}
    </div>
  )
}
