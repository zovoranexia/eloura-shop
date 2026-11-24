-- Tetun wording corrections for databases that were already seeded with the old sample content.
-- Only rows that still hold the old default wording are touched, so anything the shop owner edited stays as is.
-- (\m ... \M are PostgreSQL word boundaries; only the Tetun ("tet") field is changed: "Tas" is a correct Indonesian word.)

-- "Tas" (bag) -> "Pasta"
UPDATE "Category"
   SET "name" = jsonb_set("name", '{tet}', to_jsonb(regexp_replace("name"->>'tet', '\mTas\M', 'Pasta', 'g')))
 WHERE "name"->>'tet' ~ '\mTas\M';

UPDATE "Product"
   SET "name" = jsonb_set("name", '{tet}', to_jsonb(regexp_replace("name"->>'tet', '\mTas\M', 'Pasta', 'g'))),
       "searchText" = "searchText" || ' pasta'
 WHERE "name"->>'tet' ~ '\mTas\M';

UPDATE "Product"
   SET "description" = jsonb_set("description", '{tet}', to_jsonb(regexp_replace("description"->>'tet', '\mTas\M', 'Pasta', 'g')))
 WHERE "description"->>'tet' ~ '\mTas\M';

-- Shipping & returns page title
UPDATE "CmsPage"
   SET "title" = jsonb_set("title", '{tet}', '"Entrega & Fo Fila"'::jsonb)
 WHERE "slug" = 'shipping-returns' AND "title"->>'tet' = 'Entrega & Fila fali';
