create table if not exists recipes
(
    id    bigserial primary key,
    title text not null
);
