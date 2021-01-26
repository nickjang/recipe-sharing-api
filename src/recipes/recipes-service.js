const xss = require('xss');

const RecipesService = {
  getRecipes(limit = 12, user_id = null) {
    return db
      .from('recipes')
      .select(
        'recipes.id',
        'recipes.recipe_name',
        'recipes.information',
        'recipes.date_created',
        'recipes.date_modified',
        db.raw(
          `json_agg(
            json_object_agg(
              recipe_ingredients.measurement, 
              recipe_ingredients.ingredient
            )
            ORDER BY recipe_ingredients.list_idx
          ) ingredients,
          json_agg(
            recipe_instructions.instruction
            ORDER BY recipe_instructions.list_idx
          ) instructions,
          json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS author`
        )
      )
      .leftJoin(
        'users',
        'recipes.user_id',
        'users.id'
      )
      .innerJoin(
        'recipe_ingredients',
        'recipes.id',
        'recipe_ingredients.recipe_id'
      )
      .innerJoin(
        'recipe_instructions',
        'recipes.id',
        'recipe_instructions.recipe_id'
      )
      .orderByRaw('GREATEST(recipes.date_created, recipes.date_modified)');
  },
  getById(db, id) {
    return db
      .from('recipes')
      .select(
        'recipes.id',
        'recipes.recipe_name',
        'recipes.information',
        'recipes.date_created',
        'recipes.date_modified',
        db.raw(
          `json_strip_nulls(
            json_agg(
              json_object_agg(
                recipe_ingredients.measurement, 
                recipe_ingredients.ingredient
              )
              WHERE recipe_ingredients.ingredient IS NOT NULL
              ORDER BY recipe_ingredients.list_idx
            ) ingredients
          ),
          json_strip_nulls(
            json_agg(
              recipe_instructions.instruction
              WHERE recipe_instructions.instruction IS NOT NULL
              ORDER BY recipe_instructions.list_idx
            ) instructions
          ),
          json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS author`
        )
      )
      .leftJoin(
        'users',
        'recipes.user_id',
        'users.id'
      )
      .leftJoin(
        'recipe_ingredients',
        'recipes.id',
        'recipe_ingredients.recipe_id'
      )
      .leftJoin(
        'recipe_instructions',
        'recipes.id',
        'recipe_instructions.recipe_id'
      )
      .where('recipes.id', id)
      .first();
  },
  getLogsForProject(db, user_id, project_id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        'logs.format_min',
        'logs.format_sec',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.project_id', project_id)
      .andWhere('logs.user_id', user_id);
  },
  getDaysWithLogs(db, user_id, project_id, time_zone) {
    return db
      .from('logs')
      .select(
        db.raw(`
          DISTINCT (logs.start_time 
                    AT TIME ZONE ?)::date 
          AS start_day`, time_zone
        ),
        // get the most recent end day, including current day if log is still running
        db.raw(`
          MAX(
               ((CASE WHEN logs.end_time IS NULL THEN (now() AT TIME ZONE 'UTC')
                      ELSE logs.end_time
                 END) 
                 AT TIME ZONE ? 
                 + INTERVAL '1 day'
               )::date
             )
             AS end_day`, time_zone
        )
      )
      .where('logs.project_id', project_id)
      .andWhere('logs.user_id', user_id)
      .groupBy('start_day')
      .orderBy('start_day');
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
      .where({ id });
  },
  putIngredients(db, recipe_id, updatedIngredients) {
    return db
      .from('recipe_ingredients')
      .where({ recipe_id })
      .del()
      .then(() => this.insertIngredients(updatedIngredients));
  },
  putInstructions(db, recipe_id, updatedInstructions) {
    return db
      .from('recipe_instructions')
      .where({ recipe_id })
      .del()
      .then(() => this.insertInstructions(updatedInstructions));
  },
  serializeRecipe(recipe) {
    const { author } = recipe;
    return {
      id: recipe.id,
      name: xss(recipe.recipe_name),
      ingr
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
