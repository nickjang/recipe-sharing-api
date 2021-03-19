const xss = require('xss');

const RecipesService = {
  getRecipes(db) {
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
      );
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
  getByIngredients(db, ingredients) {
    return db
      .from('recipe_ingredients')
      .select('recipe_id')
      .where((builder) => {
        ingredients.forEach((ingredient) => {
          if (ingredient) {
            builder.orWhere('ingredient', 'ILIKE', `%${ingredient}%`);
          }
        });
      });
  },
  getByInstructions(db, instructions) {
    return db
      .from('recipe_instructions')
      .select('recipe_id')
      .where((builder) => {
        instructions.forEach((instruction) => {
          if (instruction) {
            builder.orWhere('instruction', 'ILIKE', `%${instruction}%`);
          }
        });
      });
  },
  getWithFilters(db, filters, limit = -1, offset = -1, fullRecipe = true) {
    let { name, information, ingredients, instructions, user_id } = filters;
    let query;
    if (fullRecipe) query = this.getRecipes(db);
    else query = db.from('recipes');

    // apply ingredients and instructions filters
    let listQuery;
    if (ingredients && ingredients.length && instructions && instructions.length) {
      listQuery = this.getByIngredients(db, ingredients)
        .unionAll([this.getByInstructions(db, instructions)]);
    } else if (ingredients && ingredients.length) {
      listQuery = this.getByIngredients(db, ingredients);
    } else if (instructions && instructions.length) {
      listQuery = this.getByInstructions(db, instructions);
    }
    if (listQuery) {
      query.join(
        listQuery
          .select('recipe_id')
          .count('recipe_id', { as: 'matches' })
          .groupBy('recipe_id')
          .as('byList'),
        'recipes.id',
        'byList.recipe_id'
      );
    }

    // apply name, information, user_id filters
    query.where((builder) => {
      if (name) builder.where('recipes.recipe_name', 'ILIKE', `%${name}%`);
      if (information) {
        information = information.trim().replace(/[ ,]+/, ' & ');
        builder.whereRaw(`information_tokens @@ to_tsquery('${information}')`);
      }
      if (user_id) builder.where('recipes.user_id', user_id);
    });

    let columnsToOrderBy = [];
    // most matched ingredients and instructions
    if (information && information.length || ingredients && ingredients.length)
      columnsToOrderBy.push('byList.matches DESC');
    columnsToOrderBy.push('GREATEST(recipes.date_created, recipes.date_modified) DESC');
    query.orderByRaw(columnsToOrderBy.join(', '));
    if (limit >= 0) query.limit(limit);
    if (offset >= 0) query.offset(offset);
    return query;
  },
  getNumRecipes(db, filters) {
    return this.getWithFilters(db, filters, -1, -1, false)
      .count('recipes.id AS num_recipes')
      .then(([{ num_recipes }]) => num_recipes);
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
