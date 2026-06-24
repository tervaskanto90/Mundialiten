import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useTheme } from '../theme'

interface NewsItem {
  title: string
  source: string
  link: string
  pubDate: string
  ts: number | null
}

function timeAgo(ts: number | null, lang: string): string {
  if (!ts) return ''
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (mins < 60) return lang === 'en' ? `${mins}m ago` : `hace ${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return lang === 'en' ? `${hrs}h ago` : `hace ${hrs} h`
  const days = Math.round(hrs / 24)
  return lang === 'en' ? `${days}d ago` : `hace ${days} d`
}

export function NewsView() {
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError('')
    fetch(`/api/news?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && (!data.items || data.items.length === 0)) setError(String(data.error))
        setItems(data.items ?? [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: c.muted }}>
          {t('Titulares del Mundial de las últimas 48 horas (vía Google News).', "World Cup headlines from the last 48 hours (via Google News).")}
        </p>
        <button onClick={load} className="text-xs font-semibold whitespace-nowrap" style={{ color: c.muted }}>
          ↻ {t('Actualizar', 'Refresh')}
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)' }} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-10 text-sm" style={{ color: c.muted }}>
          <p className="text-3xl mb-2">📰</p>
          {t('No se pudieron cargar las noticias ahora.', 'Could not load the news right now.')}
          <div className="text-[11px] mt-1" style={{ color: c.faint }}>{error}</div>
        </div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: c.muted }}>
          {t('No hay noticias recientes del Mundial.', 'No recent World Cup news.')}
        </div>
      )}

      {!loading && items && items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <a
              key={i}
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-4 py-3 transition"
              style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
            >
              <div className="text-sm font-semibold leading-snug" style={{ color: c.text, fontFamily: "'Archivo'" }}>
                {it.title}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: c.muted }}>
                {it.source && <span className="font-semibold">{it.source}</span>}
                {it.source && it.ts && <span style={{ color: c.faint }}>·</span>}
                {it.ts && <span>{timeAgo(it.ts, lang)}</span>}
                <span className="ml-auto" style={{ color: c.faint }}>↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
