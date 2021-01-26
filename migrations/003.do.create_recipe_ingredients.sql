CREATE TABLE recipe_ingredients (
  recipe_id INTEGER
    REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  list_idx INTEGER NOT NULL,
  measurement TEXT NOT NULL,
  ingredient TEXT NOT NULL,
  CONSTRAINT recipe_ingredient PRIMARY KEY(recipe_id, list_idx)
);