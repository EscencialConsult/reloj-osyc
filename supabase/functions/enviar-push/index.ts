// supabase/functions/enviar-push/index.ts
// Envía notificaciones push web cuando se inserta una fila en `notificaciones`.
// Se dispara desde un Database Webhook (INSERT en public.notificaciones).
//
// Secrets necesarios (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (ej: mailto:gestion@osyc.com)
//   WEBHOOK_SECRET (opcional; si lo definís, el webhook debe mandar el header x-osyc-secret)
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectadas por Supabase.)

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:gestion@osyc.com',
  Deno.env.get('VAPID_PUBLIC')!,
  Deno.env.get('VAPID_PRIVATE')!
)

Deno.serve(async (req) => {
  // Verificación opcional por secreto compartido
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (secret && req.headers.get('x-osyc-secret') !== secret) {
    return new Response('no autorizado', { status: 401 })
  }

  let body: any = {}
  try { body = await req.json() } catch (_) { /* vacío */ }
  const rec = body.record ?? body
  if (!rec?.user_id) return new Response('sin user_id', { status: 200 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', rec.user_id)

  const payload = JSON.stringify({
    titulo: rec.titulo || 'OSYC',
    cuerpo: rec.cuerpo || '',
    link: rec.link || '/',
    tag: rec.origen_id || undefined,
  })

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    } catch (e: any) {
      // Suscripción vencida/expulsada → la borramos
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      } else {
        console.error('push error', e?.statusCode, e?.body)
      }
    }
  }))

  return new Response('ok', { status: 200 })
})
