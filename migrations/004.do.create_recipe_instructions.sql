CREATE TABLE recipe_instructions (
  recipe_id INTEGER
    REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  list_idx INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  CONSTRAINT recipe_instruction PRIMARY KEY(recipe_id, list_idx)
);