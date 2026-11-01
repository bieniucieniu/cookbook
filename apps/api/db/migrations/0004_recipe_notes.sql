alter table recipes
    add column description text not null default '';

alter table recipes
    add column notes text not null default '';

alter table recipe_nodes
    add column key text;

update recipe_nodes
set key = 'n' || id::text
where key is null;

alter table recipe_nodes
    alter column key set not null;

alter table recipe_nodes
    add constraint recipe_nodes_recipe_key unique (recipe_id, key);

create table if not exists recipe_photos
(
    id           bigserial primary key,
    recipe_id    bigint references recipes (id) on delete cascade,
    owner_id     bigint  not null references users (id),
    ord          integer not null default 0,
    storage_key  text    not null,
    content_type text    not null,
    alt          text    not null default '',
    created_at   bigint  not null
);

create index if not exists recipe_photos_recipe_idx
    on recipe_photos (recipe_id);

create index if not exists recipe_photos_owner_idx
    on recipe_photos (owner_id);

create table if not exists recipe_step_comments
(
    id         bigserial primary key,
    recipe_id  bigint not null references recipes (id) on delete cascade,
    step_key   text   not null,
    user_id    bigint not null references users (id),
    body       text   not null,
    created_at bigint not null
);

create index if not exists recipe_step_comments_recipe_idx
    on recipe_step_comments (recipe_id, step_key);
