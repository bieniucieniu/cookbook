alter table recipes
    add column cooks integer not null default 1;

alter table recipes
    add constraint recipes_cooks check (cooks >= 1);

create table if not exists allergens
(
    id   bigserial primary key,
    slug text not null unique,
    name text not null
);

create table if not exists ingredients
(
    id   bigserial primary key,
    slug text not null unique,
    name text not null
);

create table if not exists ingredient_allergens
(
    ingredient_id bigint not null references ingredients (id),
    allergen_id   bigint not null references allergens (id),
    primary key (ingredient_id, allergen_id)
);

create index if not exists ingredient_allergens_allergen_idx
    on ingredient_allergens (allergen_id);

create table if not exists ingredient_alts
(
    ingredient_id     bigint  not null references ingredients (id),
    alt_ingredient_id bigint  not null references ingredients (id),
    ratio             numeric not null default 1,
    note              text    not null default '',
    primary key (ingredient_id, alt_ingredient_id),
    constraint ingredient_alts_not_self check (ingredient_id <> alt_ingredient_id),
    constraint ingredient_alts_ratio check (ratio > 0)
);

create table if not exists tools
(
    id   bigserial primary key,
    slug text not null unique,
    name text not null
);

create table if not exists tool_alts
(
    tool_id     bigint not null references tools (id),
    alt_tool_id bigint not null references tools (id),
    note        text   not null default '',
    primary key (tool_id, alt_tool_id),
    constraint tool_alts_not_self check (tool_id <> alt_tool_id)
);

create table if not exists recipe_nodes
(
    id          bigserial primary key,
    recipe_id   bigint  not null references recipes (id) on delete cascade,
    title       text    not null,
    body        text    not null default '',
    branch_mode text    not null default 'none',
    join_mode   text    not null default 'none',
    repeat_min  integer not null default 1,
    repeat_max  integer not null default 1,
    ord         integer not null default 0,
    constraint recipe_nodes_branch_mode check (branch_mode in ('none', 'and', 'xor')),
    constraint recipe_nodes_join_mode check (join_mode in ('none', 'and', 'xor')),
    constraint recipe_nodes_repeat check (repeat_min >= 1 and repeat_max >= repeat_min),
    constraint recipe_nodes_id_recipe unique (id, recipe_id)
);

create index if not exists recipe_nodes_recipe_idx
    on recipe_nodes (recipe_id, ord);

create table if not exists recipe_edges
(
    id           bigserial primary key,
    recipe_id    bigint not null,
    from_node_id bigint not null,
    to_node_id   bigint not null,
    label        text   not null default '',
    constraint recipe_edges_not_self check (from_node_id <> to_node_id),
    constraint recipe_edges_from_fk
        foreign key (from_node_id, recipe_id)
            references recipe_nodes (id, recipe_id) on delete cascade,
    constraint recipe_edges_to_fk
        foreign key (to_node_id, recipe_id)
            references recipe_nodes (id, recipe_id) on delete cascade,
    constraint recipe_edges_pair unique (from_node_id, to_node_id)
);

create index if not exists recipe_edges_to_idx
    on recipe_edges (to_node_id);

create table if not exists recipe_node_spans
(
    id       bigserial primary key,
    node_id  bigint  not null references recipe_nodes (id) on delete cascade,
    ord      integer not null,
    kind     text    not null,
    seconds  integer not null,
    constraint recipe_node_spans_kind check (kind in ('active', 'wait')),
    constraint recipe_node_spans_seconds check (seconds >= 0),
    constraint recipe_node_spans_ord unique (node_id, ord)
);

create table if not exists node_ingredients
(
    id            bigserial primary key,
    node_id       bigint  not null references recipe_nodes (id) on delete cascade,
    ingredient_id bigint  not null references ingredients (id),
    qty           numeric,
    unit          text,
    optional      boolean not null default false,
    constraint node_ingredients_qty check (qty is null or qty >= 0),
    constraint node_ingredients_once unique (node_id, ingredient_id)
);

create index if not exists node_ingredients_ingredient_idx
    on node_ingredients (ingredient_id);

create table if not exists node_tools
(
    id       bigserial primary key,
    node_id  bigint  not null references recipe_nodes (id) on delete cascade,
    tool_id  bigint  not null references tools (id),
    optional boolean not null default false,
    hold     text    not null default 'active',
    constraint node_tools_once unique (node_id, tool_id),
    constraint node_tools_hold check (hold in ('active', 'span'))
);

create index if not exists node_tools_tool_idx
    on node_tools (tool_id);

create table if not exists recipe_ingredient_alts
(
    id                bigserial primary key,
    recipe_id         bigint  not null references recipes (id) on delete cascade,
    ingredient_id     bigint  not null references ingredients (id),
    alt_ingredient_id bigint  not null references ingredients (id),
    node_id           bigint,
    ratio             numeric not null default 1,
    note              text    not null default '',
    constraint recipe_ingredient_alts_not_self check (ingredient_id <> alt_ingredient_id),
    constraint recipe_ingredient_alts_ratio check (ratio > 0),
    constraint recipe_ingredient_alts_node_fk
        foreign key (node_id, recipe_id)
            references recipe_nodes (id, recipe_id) on delete cascade
);

create unique index if not exists recipe_ingredient_alts_recipe_uq
    on recipe_ingredient_alts (recipe_id, ingredient_id, alt_ingredient_id)
    where node_id is null;

create unique index if not exists recipe_ingredient_alts_node_uq
    on recipe_ingredient_alts (recipe_id, node_id, ingredient_id, alt_ingredient_id)
    where node_id is not null;

create table if not exists recipe_tool_alts
(
    id          bigserial primary key,
    recipe_id   bigint not null references recipes (id) on delete cascade,
    tool_id     bigint not null references tools (id),
    alt_tool_id bigint not null references tools (id),
    node_id     bigint,
    note        text   not null default '',
    constraint recipe_tool_alts_not_self check (tool_id <> alt_tool_id),
    constraint recipe_tool_alts_node_fk
        foreign key (node_id, recipe_id)
            references recipe_nodes (id, recipe_id) on delete cascade
);

create unique index if not exists recipe_tool_alts_recipe_uq
    on recipe_tool_alts (recipe_id, tool_id, alt_tool_id)
    where node_id is null;

create unique index if not exists recipe_tool_alts_node_uq
    on recipe_tool_alts (recipe_id, node_id, tool_id, alt_tool_id)
    where node_id is not null;

create table if not exists recipe_ingredient_facts
(
    recipe_id     bigint not null references recipes (id) on delete cascade,
    ingredient_id bigint not null references ingredients (id),
    presence      text   not null,
    primary key (recipe_id, ingredient_id),
    constraint recipe_ingredient_facts_presence check (presence in ('all_paths', 'some_paths'))
);

create index if not exists recipe_ingredient_facts_lookup_idx
    on recipe_ingredient_facts (ingredient_id, presence);

create table if not exists recipe_tool_facts
(
    recipe_id bigint not null references recipes (id) on delete cascade,
    tool_id   bigint not null references tools (id),
    presence  text   not null,
    primary key (recipe_id, tool_id),
    constraint recipe_tool_facts_presence check (presence in ('all_paths', 'some_paths'))
);

create index if not exists recipe_tool_facts_lookup_idx
    on recipe_tool_facts (tool_id, presence);

-- elapsed can be below hands-on when cooks > 1
create table if not exists recipe_time
(
    recipe_id            bigint  primary key references recipes (id) on delete cascade,
    hands_on_min_seconds integer not null,
    hands_on_max_seconds integer not null,
    elapsed_min_seconds  integer not null,
    elapsed_max_seconds  integer not null,
    constraint recipe_time_bounds check (
        hands_on_min_seconds >= 0
        and hands_on_max_seconds >= hands_on_min_seconds
        and elapsed_min_seconds >= 0
        and elapsed_max_seconds >= elapsed_min_seconds
    )
);
