# Recipes

Migrated by `apps/api/db/migrations/0002_recipe_graph.sql`. `recipes.cooks` defaults to 1. The migration and the SQLDelight `.sq` files match. Partial unique indexes live only in the migration.

`elapsed_*` can be lower than `hands_on_*` when `cooks` > 1, so `recipe_time` checks each pair on its own (`max >= min`, both `>= 0`).

A recipe is a directed acyclic graph of steps. Ingredients and tools are dictionary rows. A step points at those rows. Alternatives live on the dictionary and again on the recipe. Time is a list of spans on the step. Parallel work is an `and` split.

## Graph

`recipe_nodes` are steps. `recipe_edges` are the wiring. `branch_mode` and `join_mode` are `none`, `and`, or `xor`.

- Out-degree greater than 1 sets `branch_mode` to `and` or `xor`. Otherwise `none`.
- In-degree greater than 1 sets `join_mode` to `and` or `xor`. Otherwise `none`.
- One step may join one region and split the next.
- `and` runs every arm. `xor` runs one arm.
- Each split has one downstream join of the same mode. Every path from the split reaches that join. No other edge enters or leaves that region.
- A repeat is `repeat_min` / `repeat_max` on the step. The graph stays acyclic.

```
prep                 and split
 ├─ simmer sauce     tomato, garlic, cumin; skillet held for the whole step
 └─ toast bread      bread
eggs                 and join, xor split
 ├─ finish in pan
 └─ broil            oven held for the whole step
serve                xor join
```

Solid arms (sauce and toast) both run, then meet at eggs. Dashed arms (pan and broil) are alternatives, then meet at serve.

Save-time checks, not table checks:

- The graph is acyclic. Degree matches mode.
- Each split pairs with one downstream join of the same mode.
- An `and` join’s arms are co-required. An `xor` join’s arms are exclusive.

## Dictionaries

Search, allergy, dislike, and pantry join on dictionary ids. A step requirement is a foreign key plus quantity. Slug is the stable key. The read model for one step is still a map:

```json
{ "egg": { "qty": 4, "unit": "pcs", "id": 18 } }
```

| Table | Holds |
| --- | --- |
| `allergens` | `id`, `slug`, `name` |
| `ingredients` | `id`, `slug`, `name` |
| `ingredient_allergens` | ingredient ↔ allergen |
| `tools` | `id`, `slug`, `name` |
| `node_ingredients` | step → ingredient, `qty`, `unit`, `optional` |
| `node_tools` | step → tool, `optional`, `hold` |

`optional` requirements stay out of the facts table. `unit` is free text. Comparing pantry quantities needs a unit table later. Identity is enough for allergy and for “I have this.”

## Alternatives

Two lists:

1. Dictionary: `ingredient_alts`, `tool_alts`. Shared suggestion. `ratio` is alt quantity / original quantity.
2. Recipe: `recipe_ingredient_alts`, `recipe_tool_alts`. `node_id` null covers the whole recipe. `node_id` set covers that step.

Lookup order:

1. Recipe alt for this step.
2. Recipe alt for the whole recipe.
3. Dictionary alt.

Steps 1 and 2 change whether a recipe survives a hard filter. A dictionary alt does not. Almond flour on the flour row does not make a wheat dough safe.

## Search facts

Rebuilt on save.

| Presence | Meaning |
| --- | --- |
| `all_paths` | every valid walk needs it |
| `some_paths` | one arm needs it |

Walk regions to fill `recipe_ingredient_facts` and `recipe_tool_facts`. An `and` region puts arm requirements into every configuration. An `xor` region keeps one configuration per arm. An ingredient in every configuration is `all_paths`. An ingredient in at least one is `some_paths`.

For the graph above:

| Thing | Presence | Why |
| --- | --- | --- |
| tomato, garlic, cumin, bread, egg, skillet | `all_paths` | on the `and` arms or after the `and` join |
| oven | `some_paths` | broil arm only |

Hard exclude (allergy) hits `all_paths` and every recipe alt is also excluded: hide the recipe. The same hit on `some_paths`: keep the recipe and force the other arm. Dislike uses the same match as a rank penalty. Pantry miss count starts at `all_paths` ids the user does not own. A recipe alt the user owns clears that id.

## Time

`recipe_node_spans` is the step clock, ordered by `ord`. `active` needs a cook. `wait` is inside the step total and frees the cook. Step length = sum of `seconds` × repeat.

`node_tools.hold`:

- `active` — tool is busy only on active spans (knife).
- `span` — tool is busy for the whole node (oven, burner, rising bowl).

`recipes.cooks` defaults to 1.

Schedule:

- **Path.** The next node starts when this node’s spans finish. A wait on this path blocks the next step on this path.
- **`and`.** Both arms start together. Overlapping `active` slices slide apart until `cooks` of them fit. Wait slices are the holes the other arm fills. A tool held `span` by both arms serializes them the same way.
- **`xor`.** One arm runs. Totals keep min and max across those choices.
- **`repeat`.** Spans run again, in order.

Two steps can overlap when both hang off the same `and` split, both reach its `and` join, and no directed path connects them.

Sauce `active` 300s + `wait` 1200s, toast `active` 480s, same `and` split, one cook: elapsed = max(1500, 480, 300 + 480) = 1500s. Hands-on = 780s. Toast sits in the simmer. Eggs start at the join, after 1500s.

`recipe_time` is rebuilt on the same save. `elapsed_*` is wall clock. `hands_on_*` is the sum of active seconds on the chosen arms. `xor` and `repeat_min` / `repeat_max` make the min and max.

## Tables

```sql
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
```

`recipes` gains `cooks integer not null default 1` with `cooks >= 1`. Postgres enforces slug identity, alt lists, step quantity, and that an edge or a step-scoped alt stays inside one recipe (`unique (id, recipe_id)` plus the composite foreign keys).

## Rejected shapes

| Shape | Branch | Join later |
| --- | --- | --- |
| `next_step_id` list | no | no |
| `parent_id` tree | yes | siblings never meet |
| nested blocks only | yes | only at the block end |
| split/join gateway nodes | yes | yes; an empty step with a label covers a decision that has no instruction |
| modes on the step | yes | yes |

Modes on the step are the shape above. A JSONB requirement blob drops the foreign key allergy and pantry joins need.
