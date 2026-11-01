create table if not exists users
(
    id             bigserial primary key,
    workos_user_id text not null unique,
    email          text not null,
    first_name     text not null default '',
    last_name      text not null default ''
);

create unique index if not exists users_email_lower_idx
    on users (lower(email));

create table if not exists sessions
(
    id                 bigserial primary key,
    user_id            bigint  not null references users (id) on delete cascade,
    token_hash         text    not null unique,
    workos_session_id  text,
    expires_at         bigint  not null
);

create index if not exists sessions_user_idx
    on sessions (user_id);

create table if not exists auth_attempts
(
    state         text primary key,
    code_verifier text   not null,
    expires_at    bigint not null
);

alter table recipes
    add column owner_id bigint references users (id);

alter table recipes
    add column visibility text not null default 'public';

alter table recipes
    add constraint recipes_visibility check (visibility in ('public', 'private'));

create index if not exists recipes_owner_idx
    on recipes (owner_id);

create table if not exists recipe_grants
(
    recipe_id  bigint not null references recipes (id) on delete cascade,
    user_id    bigint not null references users (id) on delete cascade,
    permission text   not null,
    granted_by bigint not null references users (id),
    primary key (recipe_id, user_id),
    constraint recipe_grants_permission check (permission in ('read', 'write'))
);

create index if not exists recipe_grants_user_idx
    on recipe_grants (user_id);
