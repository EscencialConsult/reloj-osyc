-- ============================================================================
-- Diagnóstico + reset de contraseña de un empleado (Supabase → SQL Editor)
-- Cambiá el email por el del empleado que estás probando.
-- ============================================================================

-- 1) ¿Existe la cuenta y está sana?
select email,
       email_confirmed_at is not null as confirmado,
       encrypted_password is not null as tiene_password,
       (select count(*) from auth.identities i where i.user_id = u.id) as identidades
from auth.users u
where lower(email) = 'marcelaherreraescencial@gmail.com';
--  Esperado: confirmado=true, tiene_password=true, identidades=1
--  Si devuelve 0 filas → la cuenta no se creó (avisame y la recreamos).

-- 2) Resetear la contraseña a un valor conocido (12345678) y confirmar el email
update auth.users
   set encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf')),
       email_confirmed_at  = coalesce(email_confirmed_at, now())
 where lower(email) = 'marcelaherreraescencial@gmail.com';

-- Después de correr esto, en fichar.html ingresá:
--   Email: marcelaherreraescencial@gmail.com
--   DNI:   12345678
