
  create table "public"."abi_calls" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "contract_address" text not null,
    "method_name" text not null,
    "method_type" text not null,
    "inputs" jsonb default '{}'::jsonb,
    "outputs" jsonb default '{}'::jsonb,
    "status" text not null,
    "error" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."abi_calls" enable row level security;


  create table "public"."compilation_artifacts" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "wasm_binary" bytea,
    "wasm_size" integer,
    "wasm_hash" text,
    "abi_json" jsonb,
    "abi_solidity" text,
    "abi_size" integer,
    "compilation_id" uuid,
    "contract_size" text,
    "metadata_hash" text,
    "compiler_version" text,
    "cargo_stylus_version" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."compilation_artifacts" enable row level security;


  create table "public"."compilation_history" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "code_snapshot" text not null,
    "result" jsonb not null default '{}'::jsonb,
    "status" text not null,
    "exit_code" integer not null,
    "stdout" text,
    "stderr" text,
    "abi" jsonb,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "error_type" text default 'unknown'::text,
    "wasm_available" boolean default false,
    "abi_available" boolean default false,
    "artifact_id" uuid
      );


alter table "public"."compilation_history" enable row level security;


  create table "public"."compilations" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "success" boolean not null default false,
    "status" text not null default 'failed'::text,
    "wasm_binary" bytea,
    "wasm_size" text,
    "wasm_hash" text,
    "abi_json" jsonb,
    "abi_solidity" text,
    "contract_size" text,
    "metadata_hash" text,
    "exit_code" integer default 1,
    "stdout" text,
    "stderr" text,
    "compilation_output" text,
    "code_snapshot" text not null,
    "compiler_version" text,
    "cargo_version" text,
    "stylus_version" text,
    "optimization_level" text,
    "target" text default 'wasm32-unknown-unknown'::text,
    "error_type" text,
    "error_details" jsonb,
    "compilation_started_at" timestamp with time zone,
    "compilation_completed_at" timestamp with time zone,
    "compilation_duration_ms" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."compilations" enable row level security;


  create table "public"."deployments" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "contract_address" text not null,
    "chain_id" integer not null,
    "chain_name" text not null,
    "deployed_code" text not null,
    "abi" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "metadata" jsonb default '{}'::jsonb
      );


alter table "public"."deployments" enable row level security;


  create table "public"."embed_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "code" text not null,
    "dependencies" jsonb default '[]'::jsonb,
    "category" text default 'general'::text,
    "is_public" boolean default true,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "usage_count" integer default 0
      );


alter table "public"."embed_templates" enable row level security;


  create table "public"."project_views" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "viewer_id" uuid,
    "viewer_ip" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."project_views" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "code" text not null default ''::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "description" text default ''::text,
    "metadata" jsonb default '{}'::jsonb,
    "last_activity_at" timestamp with time zone default now(),
    "is_public" boolean default false,
    "shared_at" timestamp with time zone,
    "view_count" integer default 0,
    "source_url" text,
    "import_type" text,
    "import_metadata" jsonb default '{}'::jsonb,
    "embed_source" text,
    "embed_metadata" jsonb default '{}'::jsonb
      );


alter table "public"."projects" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "created_at" timestamp with time zone default now(),
    "name" text,
    "company" text,
    "avatar_url" text,
    "bio" text
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX abi_calls_pkey ON public.abi_calls USING btree (id);

CREATE UNIQUE INDEX compilation_artifacts_compilation_id_key ON public.compilation_artifacts USING btree (compilation_id);

CREATE UNIQUE INDEX compilation_artifacts_pkey ON public.compilation_artifacts USING btree (id);

CREATE INDEX compilation_history_created_at_idx ON public.compilation_history USING btree (created_at DESC);

CREATE INDEX compilation_history_error_type_idx ON public.compilation_history USING btree (error_type);

CREATE UNIQUE INDEX compilation_history_pkey ON public.compilation_history USING btree (id);

CREATE INDEX compilation_history_project_id_idx ON public.compilation_history USING btree (project_id);

CREATE INDEX compilation_history_status_idx ON public.compilation_history USING btree (status);

CREATE INDEX compilation_history_user_id_idx ON public.compilation_history USING btree (user_id);

CREATE UNIQUE INDEX compilations_pkey ON public.compilations USING btree (id);

CREATE UNIQUE INDEX deployments_pkey ON public.deployments USING btree (id);

CREATE UNIQUE INDEX embed_templates_pkey ON public.embed_templates USING btree (id);

CREATE INDEX idx_compilation_artifacts_compilation ON public.compilation_artifacts USING btree (compilation_id);

CREATE INDEX idx_compilation_artifacts_created_at ON public.compilation_artifacts USING btree (created_at);

CREATE INDEX idx_compilation_artifacts_project_user ON public.compilation_artifacts USING btree (project_id, user_id);

CREATE INDEX idx_compilation_artifacts_wasm_hash ON public.compilation_artifacts USING btree (wasm_hash);

CREATE INDEX idx_compilation_history_artifact ON public.compilation_history USING btree (artifact_id);

CREATE INDEX idx_compilations_created_at ON public.compilations USING btree (created_at DESC);

CREATE INDEX idx_compilations_project_created ON public.compilations USING btree (project_id, created_at DESC);

CREATE INDEX idx_compilations_project_id ON public.compilations USING btree (project_id);

CREATE INDEX idx_compilations_status ON public.compilations USING btree (status);

CREATE INDEX idx_compilations_success ON public.compilations USING btree (success);

CREATE INDEX idx_compilations_user_id ON public.compilations USING btree (user_id);

CREATE INDEX idx_compilations_wasm_hash ON public.compilations USING btree (wasm_hash) WHERE (wasm_hash IS NOT NULL);

CREATE INDEX idx_embed_templates_category ON public.embed_templates USING btree (category);

CREATE INDEX idx_embed_templates_created_by ON public.embed_templates USING btree (created_by);

CREATE INDEX idx_embed_templates_public ON public.embed_templates USING btree (is_public);

CREATE INDEX idx_project_views_created_at ON public.project_views USING btree (created_at);

CREATE INDEX idx_project_views_project_id ON public.project_views USING btree (project_id);

CREATE INDEX idx_project_views_viewer_id ON public.project_views USING btree (viewer_id);

CREATE INDEX idx_projects_embed_source ON public.projects USING btree (embed_source);

CREATE INDEX idx_projects_import_type ON public.projects USING btree (import_type);

CREATE INDEX idx_projects_is_public ON public.projects USING btree (is_public);

CREATE INDEX idx_projects_source_url ON public.projects USING btree (source_url);

CREATE UNIQUE INDEX project_views_pkey ON public.project_views USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."abi_calls" add constraint "abi_calls_pkey" PRIMARY KEY using index "abi_calls_pkey";

alter table "public"."compilation_artifacts" add constraint "compilation_artifacts_pkey" PRIMARY KEY using index "compilation_artifacts_pkey";

alter table "public"."compilation_history" add constraint "compilation_history_pkey" PRIMARY KEY using index "compilation_history_pkey";

alter table "public"."compilations" add constraint "compilations_pkey" PRIMARY KEY using index "compilations_pkey";

alter table "public"."deployments" add constraint "deployments_pkey" PRIMARY KEY using index "deployments_pkey";

alter table "public"."embed_templates" add constraint "embed_templates_pkey" PRIMARY KEY using index "embed_templates_pkey";

alter table "public"."project_views" add constraint "project_views_pkey" PRIMARY KEY using index "project_views_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."abi_calls" add constraint "abi_calls_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."abi_calls" validate constraint "abi_calls_project_id_fkey";

alter table "public"."compilation_artifacts" add constraint "compilation_artifacts_compilation_id_fkey" FOREIGN KEY (compilation_id) REFERENCES compilation_history(id) ON DELETE SET NULL not valid;

alter table "public"."compilation_artifacts" validate constraint "compilation_artifacts_compilation_id_fkey";

alter table "public"."compilation_artifacts" add constraint "compilation_artifacts_compilation_id_key" UNIQUE using index "compilation_artifacts_compilation_id_key";

alter table "public"."compilation_artifacts" add constraint "compilation_artifacts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."compilation_artifacts" validate constraint "compilation_artifacts_project_id_fkey";

alter table "public"."compilation_artifacts" add constraint "compilation_artifacts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."compilation_artifacts" validate constraint "compilation_artifacts_user_id_fkey";

alter table "public"."compilation_history" add constraint "compilation_history_artifact_id_fkey" FOREIGN KEY (artifact_id) REFERENCES compilation_artifacts(id) ON DELETE SET NULL not valid;

alter table "public"."compilation_history" validate constraint "compilation_history_artifact_id_fkey";

alter table "public"."compilation_history" add constraint "compilation_history_error_type_check" CHECK ((error_type = ANY (ARRAY['compilation'::text, 'network'::text, 'unknown'::text]))) not valid;

alter table "public"."compilation_history" validate constraint "compilation_history_error_type_check";

alter table "public"."compilation_history" add constraint "compilation_history_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."compilation_history" validate constraint "compilation_history_project_id_fkey";

alter table "public"."compilation_history" add constraint "compilation_history_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'error'::text]))) not valid;

alter table "public"."compilation_history" validate constraint "compilation_history_status_check";

alter table "public"."compilation_history" add constraint "compilation_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."compilation_history" validate constraint "compilation_history_user_id_fkey";

alter table "public"."compilations" add constraint "compilations_error_type_check" CHECK ((error_type = ANY (ARRAY['compilation'::text, 'network'::text, 'validation'::text, 'syntax'::text, 'unknown'::text]))) not valid;

alter table "public"."compilations" validate constraint "compilations_error_type_check";

alter table "public"."compilations" add constraint "compilations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."compilations" validate constraint "compilations_project_id_fkey";

alter table "public"."compilations" add constraint "compilations_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text]))) not valid;

alter table "public"."compilations" validate constraint "compilations_status_check";

alter table "public"."compilations" add constraint "compilations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."compilations" validate constraint "compilations_user_id_fkey";

alter table "public"."deployments" add constraint "deployments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL not valid;

alter table "public"."deployments" validate constraint "deployments_project_id_fkey";

alter table "public"."embed_templates" add constraint "embed_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."embed_templates" validate constraint "embed_templates_created_by_fkey";

alter table "public"."project_views" add constraint "project_views_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_views" validate constraint "project_views_project_id_fkey";

alter table "public"."project_views" add constraint "project_views_viewer_id_fkey" FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."project_views" validate constraint "project_views_viewer_id_fkey";

alter table "public"."projects" add constraint "projects_import_type_check" CHECK ((import_type = ANY (ARRAY['template'::text, 'github'::text, 'manual'::text, 'embed'::text]))) not valid;

alter table "public"."projects" validate constraint "projects_import_type_check";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."projects" add constraint "valid_name" CHECK ((char_length(name) > 0)) not valid;

alter table "public"."projects" validate constraint "valid_name";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "valid_avatar_url" CHECK (((avatar_url IS NULL) OR (avatar_url ~ '^https?://.*$'::text))) not valid;

alter table "public"."users" validate constraint "valid_avatar_url";

alter table "public"."users" add constraint "valid_company_length" CHECK (((company IS NULL) OR (length(company) >= 2))) not valid;

alter table "public"."users" validate constraint "valid_company_length";

alter table "public"."users" add constraint "valid_name_length" CHECK (((name IS NULL) OR (length(name) >= 3))) not valid;

alter table "public"."users" validate constraint "valid_name_length";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_compilation_duration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.compilation_started_at IS NOT NULL AND NEW.compilation_completed_at IS NOT NULL THEN
        NEW.compilation_duration_ms := EXTRACT(EPOCH FROM (NEW.compilation_completed_at - NEW.compilation_started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_compilation_artifacts()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete artifacts older than 90 days that are not linked to any compilation
    DELETE FROM compilation_artifacts 
    WHERE created_at < now() - interval '90 days' 
    AND compilation_id IS NULL;
    
    -- Delete duplicate artifacts keeping the newest
    DELETE FROM compilation_artifacts a1
    USING compilation_artifacts a2
    WHERE a1.wasm_hash = a2.wasm_hash
    AND a1.project_id = a2.project_id
    AND a1.created_at < a2.created_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_compilations()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM compilations
    WHERE id IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) as rn
            FROM compilations
        ) ranked
        WHERE rn > 100
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_compilation_stats(p_project_id uuid)
 RETURNS TABLE(total_compilations bigint, successful_compilations bigint, failed_compilations bigint, success_rate numeric, avg_duration_ms numeric, last_compilation_at timestamp with time zone, has_wasm boolean, has_abi boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_compilations,
        COUNT(*) FILTER (WHERE success = true)::bigint as successful_compilations,
        COUNT(*) FILTER (WHERE success = false)::bigint as failed_compilations,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)::numeric * 100), 2)
            ELSE 0
        END as success_rate,
        ROUND(AVG(compilation_duration_ms)::numeric, 2) as avg_duration_ms,
        MAX(created_at) as last_compilation_at,
        (COUNT(*) FILTER (WHERE wasm_binary IS NOT NULL) > 0) as has_wasm,
        (COUNT(*) FILTER (WHERE abi_json IS NOT NULL) > 0) as has_abi
    FROM compilations
    WHERE project_id = p_project_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_project_view_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE projects
  SET view_count = view_count + 1
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$function$
;

create or replace view "public"."latest_compilations" as  SELECT DISTINCT ON (c.project_id) c.id,
    c.project_id,
    c.user_id,
    c.success,
    c.status,
    c.wasm_binary,
    c.wasm_size,
    c.wasm_hash,
    c.abi_json,
    c.abi_solidity,
    c.contract_size,
    c.metadata_hash,
    c.exit_code,
    c.stdout,
    c.stderr,
    c.compilation_output,
    c.code_snapshot,
    c.compiler_version,
    c.cargo_version,
    c.stylus_version,
    c.optimization_level,
    c.target,
    c.error_type,
    c.error_details,
    c.compilation_started_at,
    c.compilation_completed_at,
    c.compilation_duration_ms,
    c.created_at,
    c.updated_at,
    p.name AS project_name,
    u.email AS user_email
   FROM ((compilations c
     JOIN projects p ON ((c.project_id = p.id)))
     JOIN auth.users u ON ((c.user_id = u.id)))
  ORDER BY c.project_id, c.created_at DESC;


CREATE OR REPLACE FUNCTION public.update_compilation_artifacts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_compilations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_last_activity_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_project_activity_on_new_compilation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE projects
    SET last_activity_at = NEW.created_at
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_project_last_activity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE projects
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_project_shared_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
    NEW.shared_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."abi_calls" to "anon";

grant insert on table "public"."abi_calls" to "anon";

grant references on table "public"."abi_calls" to "anon";

grant select on table "public"."abi_calls" to "anon";

grant trigger on table "public"."abi_calls" to "anon";

grant truncate on table "public"."abi_calls" to "anon";

grant update on table "public"."abi_calls" to "anon";

grant delete on table "public"."abi_calls" to "authenticated";

grant insert on table "public"."abi_calls" to "authenticated";

grant references on table "public"."abi_calls" to "authenticated";

grant select on table "public"."abi_calls" to "authenticated";

grant trigger on table "public"."abi_calls" to "authenticated";

grant truncate on table "public"."abi_calls" to "authenticated";

grant update on table "public"."abi_calls" to "authenticated";

grant delete on table "public"."abi_calls" to "service_role";

grant insert on table "public"."abi_calls" to "service_role";

grant references on table "public"."abi_calls" to "service_role";

grant select on table "public"."abi_calls" to "service_role";

grant trigger on table "public"."abi_calls" to "service_role";

grant truncate on table "public"."abi_calls" to "service_role";

grant update on table "public"."abi_calls" to "service_role";

grant delete on table "public"."compilation_artifacts" to "anon";

grant insert on table "public"."compilation_artifacts" to "anon";

grant references on table "public"."compilation_artifacts" to "anon";

grant select on table "public"."compilation_artifacts" to "anon";

grant trigger on table "public"."compilation_artifacts" to "anon";

grant truncate on table "public"."compilation_artifacts" to "anon";

grant update on table "public"."compilation_artifacts" to "anon";

grant delete on table "public"."compilation_artifacts" to "authenticated";

grant insert on table "public"."compilation_artifacts" to "authenticated";

grant references on table "public"."compilation_artifacts" to "authenticated";

grant select on table "public"."compilation_artifacts" to "authenticated";

grant trigger on table "public"."compilation_artifacts" to "authenticated";

grant truncate on table "public"."compilation_artifacts" to "authenticated";

grant update on table "public"."compilation_artifacts" to "authenticated";

grant delete on table "public"."compilation_artifacts" to "service_role";

grant insert on table "public"."compilation_artifacts" to "service_role";

grant references on table "public"."compilation_artifacts" to "service_role";

grant select on table "public"."compilation_artifacts" to "service_role";

grant trigger on table "public"."compilation_artifacts" to "service_role";

grant truncate on table "public"."compilation_artifacts" to "service_role";

grant update on table "public"."compilation_artifacts" to "service_role";

grant delete on table "public"."compilation_history" to "anon";

grant insert on table "public"."compilation_history" to "anon";

grant references on table "public"."compilation_history" to "anon";

grant select on table "public"."compilation_history" to "anon";

grant trigger on table "public"."compilation_history" to "anon";

grant truncate on table "public"."compilation_history" to "anon";

grant update on table "public"."compilation_history" to "anon";

grant delete on table "public"."compilation_history" to "authenticated";

grant insert on table "public"."compilation_history" to "authenticated";

grant references on table "public"."compilation_history" to "authenticated";

grant select on table "public"."compilation_history" to "authenticated";

grant trigger on table "public"."compilation_history" to "authenticated";

grant truncate on table "public"."compilation_history" to "authenticated";

grant update on table "public"."compilation_history" to "authenticated";

grant delete on table "public"."compilation_history" to "service_role";

grant insert on table "public"."compilation_history" to "service_role";

grant references on table "public"."compilation_history" to "service_role";

grant select on table "public"."compilation_history" to "service_role";

grant trigger on table "public"."compilation_history" to "service_role";

grant truncate on table "public"."compilation_history" to "service_role";

grant update on table "public"."compilation_history" to "service_role";

grant delete on table "public"."compilations" to "anon";

grant insert on table "public"."compilations" to "anon";

grant references on table "public"."compilations" to "anon";

grant select on table "public"."compilations" to "anon";

grant trigger on table "public"."compilations" to "anon";

grant truncate on table "public"."compilations" to "anon";

grant update on table "public"."compilations" to "anon";

grant delete on table "public"."compilations" to "authenticated";

grant insert on table "public"."compilations" to "authenticated";

grant references on table "public"."compilations" to "authenticated";

grant select on table "public"."compilations" to "authenticated";

grant trigger on table "public"."compilations" to "authenticated";

grant truncate on table "public"."compilations" to "authenticated";

grant update on table "public"."compilations" to "authenticated";

grant delete on table "public"."compilations" to "service_role";

grant insert on table "public"."compilations" to "service_role";

grant references on table "public"."compilations" to "service_role";

grant select on table "public"."compilations" to "service_role";

grant trigger on table "public"."compilations" to "service_role";

grant truncate on table "public"."compilations" to "service_role";

grant update on table "public"."compilations" to "service_role";

grant delete on table "public"."deployments" to "anon";

grant insert on table "public"."deployments" to "anon";

grant references on table "public"."deployments" to "anon";

grant select on table "public"."deployments" to "anon";

grant trigger on table "public"."deployments" to "anon";

grant truncate on table "public"."deployments" to "anon";

grant update on table "public"."deployments" to "anon";

grant delete on table "public"."deployments" to "authenticated";

grant insert on table "public"."deployments" to "authenticated";

grant references on table "public"."deployments" to "authenticated";

grant select on table "public"."deployments" to "authenticated";

grant trigger on table "public"."deployments" to "authenticated";

grant truncate on table "public"."deployments" to "authenticated";

grant update on table "public"."deployments" to "authenticated";

grant delete on table "public"."deployments" to "service_role";

grant insert on table "public"."deployments" to "service_role";

grant references on table "public"."deployments" to "service_role";

grant select on table "public"."deployments" to "service_role";

grant trigger on table "public"."deployments" to "service_role";

grant truncate on table "public"."deployments" to "service_role";

grant update on table "public"."deployments" to "service_role";

grant delete on table "public"."embed_templates" to "anon";

grant insert on table "public"."embed_templates" to "anon";

grant references on table "public"."embed_templates" to "anon";

grant select on table "public"."embed_templates" to "anon";

grant trigger on table "public"."embed_templates" to "anon";

grant truncate on table "public"."embed_templates" to "anon";

grant update on table "public"."embed_templates" to "anon";

grant delete on table "public"."embed_templates" to "authenticated";

grant insert on table "public"."embed_templates" to "authenticated";

grant references on table "public"."embed_templates" to "authenticated";

grant select on table "public"."embed_templates" to "authenticated";

grant trigger on table "public"."embed_templates" to "authenticated";

grant truncate on table "public"."embed_templates" to "authenticated";

grant update on table "public"."embed_templates" to "authenticated";

grant delete on table "public"."embed_templates" to "service_role";

grant insert on table "public"."embed_templates" to "service_role";

grant references on table "public"."embed_templates" to "service_role";

grant select on table "public"."embed_templates" to "service_role";

grant trigger on table "public"."embed_templates" to "service_role";

grant truncate on table "public"."embed_templates" to "service_role";

grant update on table "public"."embed_templates" to "service_role";

grant delete on table "public"."project_views" to "anon";

grant insert on table "public"."project_views" to "anon";

grant references on table "public"."project_views" to "anon";

grant select on table "public"."project_views" to "anon";

grant trigger on table "public"."project_views" to "anon";

grant truncate on table "public"."project_views" to "anon";

grant update on table "public"."project_views" to "anon";

grant delete on table "public"."project_views" to "authenticated";

grant insert on table "public"."project_views" to "authenticated";

grant references on table "public"."project_views" to "authenticated";

grant select on table "public"."project_views" to "authenticated";

grant trigger on table "public"."project_views" to "authenticated";

grant truncate on table "public"."project_views" to "authenticated";

grant update on table "public"."project_views" to "authenticated";

grant delete on table "public"."project_views" to "service_role";

grant insert on table "public"."project_views" to "service_role";

grant references on table "public"."project_views" to "service_role";

grant select on table "public"."project_views" to "service_role";

grant trigger on table "public"."project_views" to "service_role";

grant truncate on table "public"."project_views" to "service_role";

grant update on table "public"."project_views" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Users can insert own abi calls"
  on "public"."abi_calls"
  as permissive
  for insert
  to authenticated
with check ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid()))));



  create policy "Users can read own abi calls"
  on "public"."abi_calls"
  as permissive
  for select
  to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid()))));



  create policy "Users can delete their own compilation artifacts"
  on "public"."compilation_artifacts"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Users can insert their own compilation artifacts"
  on "public"."compilation_artifacts"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Users can update their own compilation artifacts"
  on "public"."compilation_artifacts"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "Users can view their own compilation artifacts"
  on "public"."compilation_artifacts"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Users can insert own compilation history"
  on "public"."compilation_history"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Users can read own compilation history"
  on "public"."compilation_history"
  as permissive
  for select
  to authenticated
using (((auth.uid() = user_id) OR (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Users can delete own compilations"
  on "public"."compilations"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can insert own compilations"
  on "public"."compilations"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Users can update own compilations"
  on "public"."compilations"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own compilations"
  on "public"."compilations"
  as permissive
  for select
  to authenticated
using (((auth.uid() = user_id) OR (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Users can insert own deployments"
  on "public"."deployments"
  as permissive
  for insert
  to authenticated
with check (((project_id IS NULL) OR (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Users can read own deployments"
  on "public"."deployments"
  as permissive
  for select
  to authenticated
using (((project_id IS NULL) OR (project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))));



  create policy "Authenticated users can create templates"
  on "public"."embed_templates"
  as permissive
  for insert
  to public
with check ((auth.uid() = created_by));



  create policy "Public templates are viewable by everyone"
  on "public"."embed_templates"
  as permissive
  for select
  to public
using ((is_public = true));



  create policy "Users can delete their own templates"
  on "public"."embed_templates"
  as permissive
  for delete
  to public
using ((auth.uid() = created_by));



  create policy "Users can update their own templates"
  on "public"."embed_templates"
  as permissive
  for update
  to public
using ((auth.uid() = created_by));



  create policy "Users can view their own templates"
  on "public"."embed_templates"
  as permissive
  for select
  to public
using ((auth.uid() = created_by));



  create policy "Project owners can view their project views"
  on "public"."project_views"
  as permissive
  for select
  to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid()))));



  create policy "Users can insert views"
  on "public"."project_views"
  as permissive
  for insert
  to public
with check ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.is_public = true))));



  create policy "Anyone can view public projects"
  on "public"."projects"
  as permissive
  for select
  to public
using (((is_public = true) OR (auth.uid() = user_id)));



  create policy "Users can create own projects"
  on "public"."projects"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can delete own projects"
  on "public"."projects"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can read own projects"
  on "public"."projects"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update own projects"
  on "public"."projects"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can delete own data"
  on "public"."users"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = id));



  create policy "Users can insert own data"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Users can read own data"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Users can update own data"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


CREATE TRIGGER update_compilation_artifacts_updated_at BEFORE UPDATE ON public.compilation_artifacts FOR EACH ROW EXECUTE FUNCTION update_compilation_artifacts_updated_at();

CREATE TRIGGER update_project_activity_on_compilation AFTER INSERT ON public.compilation_history FOR EACH ROW EXECUTE FUNCTION update_project_last_activity();

CREATE TRIGGER calculate_compilation_duration BEFORE INSERT OR UPDATE ON public.compilations FOR EACH ROW EXECUTE FUNCTION calculate_compilation_duration();

CREATE TRIGGER update_compilations_updated_at BEFORE UPDATE ON public.compilations FOR EACH ROW EXECUTE FUNCTION update_compilations_updated_at();

CREATE TRIGGER update_project_activity_on_new_compilation AFTER INSERT ON public.compilations FOR EACH ROW EXECUTE FUNCTION update_project_activity_on_new_compilation();

CREATE TRIGGER increment_view_count_on_new_view AFTER INSERT ON public.project_views FOR EACH ROW EXECUTE FUNCTION increment_project_view_count();

CREATE TRIGGER update_project_shared_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_project_shared_timestamp();

CREATE TRIGGER update_projects_last_activity BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_last_activity_timestamp();


