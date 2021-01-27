const xss = require('xss');

const RecipesService = {
  getRecipes(db, limit, offset, user_id = null) {
    return db
      .from('recipes')
      .select(
        'recipes.id',
        'recipes.recipe_name',
        'recipes.information',
        'recipe_ingredients.ingredients',
        'recipe_instructions.instructions',
        'recipes.img',
        'recipes.date_created AS date_created',
        'recipes.date_modified AS date_modified',
        db.raw(
          `json_strip_nulls(
          json_build_object(
            'id', users.id,
            'full_name', users.full_name
          )
        ) AS author`
        )
      )
      .leftJoin(
        'users',
        'recipes.user_id',
        'users.id'
      )
      .joinRaw(
        `LEFT JOIN (
        SELECT 
          recipe_id,
          json_agg(
            json_build_object(
              'measurement', measurement,
              'ingredient', ingredient
            )
            ORDER BY list_idx
          ) AS ingredients
        FROM recipe_ingredients
        GROUP BY recipe_id
       ) AS recipe_ingredients ON recipe_ingredients.recipe_id = recipes.id
       LEFT JOIN (
        SELECT 
          recipe_id,
          json_agg(
            instruction
            ORDER BY list_idx
          ) AS instructions
        FROM recipe_instructions
        GROUP BY recipe_id
       ) AS recipe_instructions ON recipe_instructions.recipe_id = recipes.id`
      )
      .where((builder) => {
        if (user_id)
          builder.where('recipes.user_id', user_id);
      })
      .orderByRaw('GREATEST(recipes.date_created, recipes.date_modified)')
      .limit(limit)
      .offset(offset);
  },
  getById(db, id) {
    return db
      .from('recipes')
      .select(
        'recipes.id',
        'recipes.recipe_name',
        'recipes.information',
        'recipe_ingredients.ingredients',
        'recipe_instructions.instructions',
        'recipes.img',
        'recipes.date_created AS date_created',
        'recipes.date_modified AS date_modified',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'full_name', users.full_name
            )
          ) AS author`
        )
      )
      .leftJoin(
        'users',
        'recipes.user_id',
        'users.id'
      )
      .joinRaw(
        `LEFT JOIN (
          SELECT 
            recipe_id,
            json_agg(
              json_build_object(
                'measurement', measurement,
                'ingredient', ingredient
              )
              ORDER BY list_idx
            ) AS ingredients
          FROM recipe_ingredients
          WHERE recipe_id = ${id}
          GROUP BY recipe_id
         ) AS recipe_ingredients ON recipe_ingredients.recipe_id = recipes.id
         LEFT JOIN (
          SELECT 
            recipe_id,
            json_agg(
              instruction
              ORDER BY list_idx
            ) AS instructions
          FROM recipe_instructions
          WHERE recipe_id = ${id}
          GROUP BY recipe_id
         ) AS recipe_instructions ON recipe_instructions.recipe_id = recipes.id`
      )
      .where('recipes.id', id)
      .first();
  },
  getNumRecipes(db, user_id = null) {
    return db
      .from('recipes')
      .count(db.raw('DISTINCT id'))
      .where((builder) => {
        if (user_id) builder.where({ user_id });
      })
      .then(([{count}]) => count);
  },
  insertRecipe(db, newRecipe) {
    return db
      .insert(newRecipe)
      .into('recipes')
      .returning('*')
      .then(([recipe]) =>
        RecipesService.getById(db, recipe.id)
      );
  },
  insertIngredients(db, newIngredients) {
    return db
      .insert(newIngredients)
      .into('recipe_ingredients');
  },
  insertInstructions(db, newInstructions) {
    return db
      .insert(newInstructions)
      .into('recipe_instructions');
  },
  updateRecipe(db, id, updates) {
    return db
      .update(updates)
      .from('recipes')
      .where({ id })
      .returning('*')
      .then(([recipe]) => recipe);
  },
  putIngredients(db, recipe_id, updatedIngredients) {
    return db
      .del()
      .from('recipe_ingredients')
      .where({ recipe_id })
      .then(() =>
        RecipesService.insertIngredients(db, updatedIngredients)
      );
  },
  putInstructions(db, recipe_id, updatedInstructions) {
    return db
      .del()
      .from('recipe_instructions')
      .where({ recipe_id })
      .then(() =>
        RecipesService.insertInstructions(db, updatedInstructions)
      );
  },
  deleteRecipe(db, id) {
    return db
      .from('recipes')
      .where({ id })
      .del();
  },
  serializeRecipe(recipe) {
    const { author } = recipe;
    return {
      id: recipe.id,
      name: xss(recipe.recipe_name),
      information: xss(recipe.information),
      img: xss(recipe.img),
      ingredients: recipe.ingredients.map(ingredient => ({
        measurement: xss(ingredient.measurement),
        ingredient: xss(ingredient.ingredient)
      })),
      instructions: recipe.instructions.map(instruction => xss(instruction)),
      date_created: new Date(recipe.date_created),
      date_modified: recipe.date_modified ? new Date(recipe.date_modified) : null,
      author: {
        id: author.id,
        full_name: xss(author.full_name)
      }
    };
  }
};

module.exports = RecipesService;
