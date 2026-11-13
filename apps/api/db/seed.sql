-- Dev seed. Run `seed` (devenv script) against the running dev Postgres; safe to rerun.
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
       ('flour', 'Flour'),
       ('coconut-milk', 'Full-fat coconut milk'),
       ('chicken-stock', 'Chicken stock'),
       ('vegetable-stock', 'Vegetable stock'),
       ('red-curry-paste', 'Red curry paste'),
       ('ginger', 'Ginger'),
       ('lemongrass', 'Lemongrass'),
       ('chicken-thighs', 'Chicken thighs'),
       ('beef', 'Beef'),
       ('shrimp', 'Shrimp'),
       ('firm-tofu', 'Firm tofu'),
       ('thai-eggplant', 'Thai eggplant'),
       ('bamboo-shoots', 'Bamboo shoots'),
       ('red-bell-pepper', 'Red bell pepper'),
       ('green-beans', 'Green beans'),
       ('kaffir-lime-leaves', 'Kaffir lime leaves'),
       ('thai-basil', 'Thai basil'),
       ('fish-sauce', 'Fish sauce'),
       ('palm-sugar', 'Palm sugar'),
       ('brown-sugar', 'Brown sugar'),
       ('vegetable-oil', 'Vegetable oil'),
       ('jasmine-rice', 'Jasmine rice')
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
       ('oven', 'Oven'),
       ('wok', 'Wok'),
       ('deep-pan', 'Deep pan')
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

do
$$
    declare
        recipe bigint;
    begin
        if exists (select 1 from recipes where title = 'Thai Red Curry') then
            return;
        end if;

        insert into recipes (title, cooks, owner_id, visibility, description, notes)
        values ('Thai Red Curry', 1, null, 'public',
                'A quick Thai red curry: fry the paste, simmer it in coconut milk and stock, cook your protein and vegetables in the sauce, then finish with Thai basil and kaffir lime leaves.',
                'Use 2 tbsp of curry paste for a milder curry and up to 4 tbsp for a hot one. Mae Ploy and Maesri are popular paste brands. Use 1–2 cups of stock depending on how thick you want the sauce. Sources: themodernproper.com, rasamalaysia.com, hungryinthailand.com, loveandlemons.com, cuisineatlas.com, recipetineats.com, bbcgoodfood.com.')
        returning id into recipe;

        insert into recipe_nodes (recipe_id, key, title, body, branch_mode, join_mode, ord)
        values (recipe, 'saute-paste', 'Sauté the paste',
                'Heat a splash of oil (or a few spoons of the thick cream from the top of the coconut milk can) in the pan. Add the red curry paste with the minced garlic, ginger and lemongrass, and fry for about 2 minutes, until fragrant and the oil separates.',
                'none', 'none', 0),
               (recipe, 'simmer-sauce', 'Simmer the sauce',
                'Pour in the remaining coconut milk and the stock, then stir in the fish sauce and palm sugar. Bring to a simmer.',
                'none', 'none', 1),
               (recipe, 'cook-protein-veg', 'Cook protein and vegetables',
                'Add the chicken (or your protein of choice) along with the longer-cooking vegetables: Thai eggplant, bamboo shoots and green beans. Simmer for 10–12 minutes, until the protein is cooked through and the vegetables are tender.',
                'none', 'none', 2),
               (recipe, 'finish-serve', 'Finish and serve',
                'Stir in the sliced red bell pepper and cook briefly. Tear in fresh Thai basil and kaffir lime leaves, then serve hot over steamed jasmine rice.',
                'none', 'none', 3);

        insert into recipe_edges (recipe_id, from_node_id, to_node_id)
        select recipe, f.id, t.id
        from (values ('saute-paste', 'simmer-sauce'),
                     ('simmer-sauce', 'cook-protein-veg'),
                     ('cook-protein-veg', 'finish-serve')) e(from_key, to_key)
                 join recipe_nodes f on f.recipe_id = recipe and f.key = e.from_key
                 join recipe_nodes t on t.recipe_id = recipe and t.key = e.to_key;

        insert into recipe_node_spans (node_id, ord, kind, seconds)
        select n.id, s.ord, s.kind, s.seconds
        from (values ('saute-paste', 0, 'active', 120),
                     ('simmer-sauce', 0, 'active', 120),
                     ('cook-protein-veg', 0, 'wait', 660),
                     ('finish-serve', 0, 'active', 120)) s(node_key, ord, kind, seconds)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = s.node_key;

        insert into node_ingredients (node_id, ingredient_id, qty, unit, optional)
        select n.id, i.id, u.qty, u.unit, false
        from (values ('saute-paste', 'vegetable-oil', 1, 'tbsp'),
                     ('saute-paste', 'red-curry-paste', 3, 'tbsp'),
                     ('saute-paste', 'garlic', 2, 'clove'),
                     ('saute-paste', 'ginger', 1, 'tbsp'),
                     ('saute-paste', 'lemongrass', 1, 'stalk'),
                     ('simmer-sauce', 'coconut-milk', 400, 'ml'),
                     ('simmer-sauce', 'chicken-stock', 360, 'ml'),
                     ('simmer-sauce', 'fish-sauce', 2, 'tbsp'),
                     ('simmer-sauce', 'palm-sugar', 1, 'tbsp'),
                     ('cook-protein-veg', 'chicken-thighs', 450, 'g'),
                     ('cook-protein-veg', 'thai-eggplant', 150, 'g'),
                     ('cook-protein-veg', 'bamboo-shoots', 100, 'g'),
                     ('cook-protein-veg', 'green-beans', 100, 'g'),
                     ('finish-serve', 'red-bell-pepper', 1, 'pc'),
                     ('finish-serve', 'thai-basil', 1, 'handful'),
                     ('finish-serve', 'kaffir-lime-leaves', 4, 'leaf'),
                     ('finish-serve', 'jasmine-rice', 300, 'g')) u(node_key, slug, qty, unit)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = u.node_key
                 join ingredients i on i.slug = u.slug;

        insert into node_ingredient_alts (node_ingredient_id, alt_ingredient_id, ratio)
        select ni.id, alt.id, 1
        from (values ('simmer-sauce', 'chicken-stock', 'vegetable-stock'),
                     ('simmer-sauce', 'palm-sugar', 'brown-sugar'),
                     ('cook-protein-veg', 'chicken-thighs', 'beef'),
                     ('cook-protein-veg', 'chicken-thighs', 'shrimp'),
                     ('cook-protein-veg', 'chicken-thighs', 'firm-tofu')) a(node_key, slug, alt_slug)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = a.node_key
                 join ingredients i on i.slug = a.slug
                 join node_ingredients ni on ni.node_id = n.id and ni.ingredient_id = i.id
                 join ingredients alt on alt.slug = a.alt_slug;

        insert into node_tools (node_id, tool_id, hold)
        select n.id, t.id, u.hold
        from (values ('saute-paste', 'active'),
                     ('simmer-sauce', 'active'),
                     ('cook-protein-veg', 'span'),
                     ('finish-serve', 'active')) u(node_key, hold)
                 join recipe_nodes n on n.recipe_id = recipe and n.key = u.node_key
                 join tools t on t.slug = 'wok';

        insert into node_tool_alts (node_tool_id, alt_tool_id)
        select nt.id, alt.id
        from node_tools nt
                 join recipe_nodes n on n.id = nt.node_id and n.recipe_id = recipe
                 join tools alt on alt.slug = 'deep-pan';

        -- Swaps stay out of the facts.
        insert into recipe_ingredient_facts (recipe_id, ingredient_id, presence)
        select recipe, i.id, 'all_paths'
        from ingredients i
        where i.slug in ('vegetable-oil', 'red-curry-paste', 'garlic', 'ginger', 'lemongrass',
                         'coconut-milk', 'chicken-stock', 'fish-sauce', 'palm-sugar',
                         'chicken-thighs', 'thai-eggplant', 'bamboo-shoots', 'green-beans',
                         'red-bell-pepper', 'thai-basil', 'kaffir-lime-leaves', 'jasmine-rice');

        insert into recipe_tool_facts (recipe_id, tool_id, presence)
        select recipe, t.id, 'all_paths'
        from tools t
        where t.slug = 'wok';

        -- One straight line. Hands-on 120 + 120 + 120, elapsed adds the 660 simmer.
        insert into recipe_time (recipe_id, hands_on_min_seconds, hands_on_max_seconds,
                                 elapsed_min_seconds, elapsed_max_seconds)
        values (recipe, 360, 360, 1020, 1020);
    end
$$;

commit;
