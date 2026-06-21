
-- Extensión funcional para voluntariados, auditoría y control documental.
-- Ejecutar en Supabase > SQL Editor si tu base ya estaba creada.

create table if not exists volunteer_opportunities (
  id bigint generated always as identity primary key,
  title text not null,
  ong_name text not null,
  modalidad text not null default 'Virtual',
  causa text,
  location text,
  date_start date,
  schedule text,
  duration text,
  slots int default 0,
  description text,
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists volunteer_registrations (
  id bigint generated always as identity primary key,
  opportunity_id bigint,
  opportunity_title text,
  user_email text,
  user_name text,
  role text default 'lector',
  status text default 'inscrito',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  role text,
  user_email text,
  user_name text,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table volunteer_opportunities enable row level security;
alter table volunteer_registrations enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "Lectura publica voluntariados" on volunteer_opportunities;
drop policy if exists "Demo crear voluntariados" on volunteer_opportunities;
drop policy if exists "Demo leer inscripciones" on volunteer_registrations;
drop policy if exists "Demo crear inscripciones" on volunteer_registrations;
drop policy if exists "Demo leer auditoria" on audit_logs;
drop policy if exists "Demo insertar auditoria" on audit_logs;

create policy "Lectura publica voluntariados" on volunteer_opportunities for select using (true);
create policy "Demo crear voluntariados" on volunteer_opportunities for insert with check (true);
create policy "Demo leer inscripciones" on volunteer_registrations for select using (true);
create policy "Demo crear inscripciones" on volunteer_registrations for insert with check (true);
create policy "Demo leer auditoria" on audit_logs for select using (true);
create policy "Demo insertar auditoria" on audit_logs for insert with check (true);

insert into volunteer_opportunities (title, ong_name, modalidad, causa, location, date_start, schedule, duration, slots, description, created_by_email) values
('Mentoría para constitución de ONG', 'Portal GC', 'Virtual', 'Educación', 'Lima', current_date + 20, '16:00 a 18:00', '2 horas', 15, 'Acompañamiento para personas que desean formalizar una ONG y ordenar sus requisitos legales.', 'editor@ong.pe'),
('Taller de documentación legal', 'Portal GC', 'Híbrido', 'Gestión institucional', 'Lima', current_date + 25, '19:00 a 21:00', '2 horas', 12, 'Revisión de documentos, permisos vigentes y alertas de renovación para organizaciones sociales.', 'editor@ong.pe'),
('Campaña de voluntariado comunitario', 'ONG Aliada', 'Presencial', 'Comunidad', 'Lima', current_date + 32, '09:00 a 13:00', '4 horas', 20, 'Apoyo en orientación ciudadana y difusión de requisitos para organizaciones sin fines de lucro.', 'editor@ong.pe')
on conflict do nothing;
