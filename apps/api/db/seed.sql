-- Dev seed. devenv runs it through `initialSQL` after 0001_init.sql on a fresh Postgres data dir.
-- SQL mirror of features/seed/Seed.kt without the photo (that one needs S3; use `gradle :apps:api:seed`).
-- Recipe facts and time are what RecipeService computes on save for this graph (docs/recipes.md).

begin;

insert into allergens (slug, name)
values ('gluten', 'Gluten')
on conflict (slug) do nothing;

insert into ingredients (slug, name)
values ('egg', 'Egg'),
       ('tomato', 'Tomato'),
       ('garlic', 'Garlic'),
       ('cumin', 'Cumin'),
       ('bread', 'Bread'),
       ('flour', 'Flour')
on conflict (slug) do nothing;

insert into ingredient_allergens (ingredient_id, allergen_id)
select i.id, a.id
from ingredients i,
     allergens a
where i.slug = 'flour'
  and a.slug = 'gluten'
on conflict do nothing;

insert into tools (slug, name)
values ('skillet', 'Skillet'),
       ('oven', 'Oven')
on conflict (slug) do nothing;

insert into users (workos_user_id, email, first_name, last_name)
values ('seed_local', 'seed@localhost', 'Seed', 'Local'),
       ('agent_local', 'agent@localhost', 'Agent', 'Local')
on conflict (workos_user_id) do nothing;

do
$$
    declare
        recipe bigint;
    begin
        if exists (select 1 from recipes where title = 'Eggs on toast') then
            return;
        end if;

        insert into recipes (title, cooks, owner_id, visibility, description, notes)
        values ('Eggs on toast', 1, null, 'public',
                'Eggs, toast, and a quick tomato sauce. The sauce and the toast run together.',
                'Salt the eggs, not the bread. The sauce can sit while the toast finishes.')
        returning id into recipe;

        insert into recipe_nodes (recipe_id, key, title, body, branch_mode, join_mode, ord)
        values (recipe, 'prep', 'Prep', 'Gather the eggs, bread, and sauce.', 'and', 'none', 0),
               (recipe, 'sauce', 'Sauce', 'Simmer tomato, garlic, and cumin.', 'none', 'none', 1),
               (recipe, 'toast', 'Toast', 'Toast the bread.', 'none', 'none', 2),
               (recipe, 'eggs', 'Eggs', 'Fry the eggs.', 'xor', 'and', 3),
               (recipe, 'pan', 'Pan', 'Finish in the skillet.', 'none', 'none', 4),
               (recipe, 'broil', 'Broil', 'Or broil.', 'none', 'none', 5),
               (recipe, 'serve', 'Serve', 'Plate the eggs on the toast.', 'none', 'xor', 6);

        insert into recipe_edges (recipe_id, from_node_id, to_node_id)
        select recipe, f.id, t.id
        from (values ('prep', 'sauce'),
                     ('prep', 'toast'),
                     ('sauce', 'eggs'),
                     ('toast', 'eggs'),
                     ('eggs', 'pan'),
                     ('eggs', 'broil'),
                     ('pan', 'serve'),
                     ('broil', 'serve')) e(from_key, to_key)
                 join recipe_nodes f on f.recipe_id = recipe and f.key = e.from_key
                 join recipe_nodes t on t.recipe_id = recipe and t.key = e.to_key;

        insert into recipe_node_spans (node_id, ord, kind, seconds)
        select n.id, s.ord, s.kind, s.seconds
        from (values ('sauce', 0, 'active', 300),
                     ('sauce', 1, 'wait', 1200),
                     ('toast', 0, 'active', 480)) s(node_key, ord, kind, seconds)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = s.node_key;

        insert into node_ingredients (node_id, ingredient_id, optional)
        select n.id, i.id, u.optional
        from (values ('sauce', 'tomato', false),
                     ('sauce', 'garlic', false),
                     ('sauce', 'cumin', true),
                     ('toast', 'bread', false),
                     ('eggs', 'egg', false)) u(node_key, slug, optional)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = u.node_key
                 join ingredients i on i.slug = u.slug;

        insert into node_tools (node_id, tool_id, hold)
        select n.id, t.id, 'span'
        from (values ('sauce', 'skillet'),
                     ('broil', 'oven')) u(node_key, slug)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = u.node_key
                 join tools t on t.slug = u.slug;

        -- Optional uses stay out of the facts (cumin).
        insert into recipe_ingredient_facts (recipe_id, ingredient_id, presence)
        select recipe, i.id, 'all_paths'
        from ingredients i
        where i.slug in ('tomato', 'garlic', 'bread', 'egg');

        insert into recipe_tool_facts (recipe_id, tool_id, presence)
        select recipe, t.id, case t.slug when 'oven' then 'some_paths' else 'all_paths' end
        from tools t
        where t.slug in ('skillet', 'oven');

        -- One cook: toast runs inside the sauce wait. Hands-on 300 + 480, elapsed 300 + 1200.
        insert into recipe_time (recipe_id, hands_on_min_seconds, hands_on_max_seconds,
                                 elapsed_min_seconds, elapsed_max_seconds)
        values (recipe, 780, 780, 1500, 1500);

        insert into recipe_step_comments (recipe_id, step_key, user_id, body, created_at)
        select recipe, 'sauce', u.id, c.body, c.created_at
        from (values ('Don''t let the garlic brown.', 1700000000),
                     ('A pinch more cumin is fine.', 1700000060)) c(body, created_at)
                 join users u on u.workos_user_id = 'seed_local';
    end
$$;

commit;
