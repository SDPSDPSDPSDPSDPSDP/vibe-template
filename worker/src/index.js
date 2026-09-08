const IMMUTABLE = 'public, max-age=31536000, immutable'
const CORS = { 'Access-Control-Allow-Origin': '*' }

const reject = (status, body) =>
  new Response(body, { status, headers: { 'Cache-Control': 'no-store', ...CORS } })

function attachment(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim())
  if (!m) return null
  const [, rawStart, rawEnd] = m
  if (rawStart === '' && rawEnd === '') return null
  const start = rawStart === '' ? Math.max(0, size - Number(rawEnd)) : Number(rawStart)
  const end = rawStart === '' || rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null
  return { offset: start, length: end - start + 1, start, end }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const response = await fetch(`${env.APP_ORIGIN}/api/cron/reminder`, {
          headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        })
        if (!response.ok) {
          console.error(`Reminder trigger failed: ${response.status} ${await response.text()}`)
        }
      })(),
    )
  },

  async fetch(request, env) {
    const { method } = request
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...CORS,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
        },
      })
    }
    if (method !== 'GET' && method !== 'HEAD') return reject(405, 'Method not allowed')

    const url = new URL(request.url)
    let key
    try {
      key = decodeURIComponent(url.pathname.slice(1))
    } catch {
      return reject(400, 'Bad key')
    }
    if (!key || key.includes('..')) return reject(403, 'Forbidden key')

    const rangeHeader = request.headers.get('Range')
    const head = rangeHeader ? await env.BUCKET.head(key) : null
    if (rangeHeader && !head) return reject(404, 'Not found')
    const range = rangeHeader ? parseRange(rangeHeader, head.size) : null

    const object = await env.BUCKET.get(key, range ? { range } : undefined)
    if (!object) return reject(404, 'Not found')

    const headers = new Headers(CORS)
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Accept-Ranges', 'bytes')

    const download = url.searchParams.get('download')
    if (download !== null) {
      headers.set('Content-Disposition', attachment(download || key.split('/').pop() || 'download'))
    }

    if (range) {
      headers.set('Cache-Control', 'no-store')
      headers.set('Content-Range', `bytes ${range.start}-${range.end}/${head.size}`)
      headers.set('Content-Length', String(range.length))
      return new Response(method === 'HEAD' ? null : object.body, { status: 206, headers })
    }

    headers.set('Cache-Control', IMMUTABLE)
    return new Response(method === 'HEAD' ? null : object.body, { headers })
  },
}
