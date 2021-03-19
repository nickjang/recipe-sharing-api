ALTER TABLE recipes
ADD COLUMN information_tokens TSVECTOR;

UPDATE recipes r1
SET information_tokens = to_tsvector(r1.information)  
FROM recipes r2;

ALTER TABLE recipes
ALTER COLUMN information_tokens SET NOT NULL;