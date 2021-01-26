const express = require('express');
const path = require('path');
const UsersService = require('../users/users-service');
const RecipesService = require('./recipes-service');
const { requireAuth } = require('../middleware/jwt-auth');

const recipesRouter = express.Router();
const jsonBodyParser = express.json();

recipesRouter
  .route('/')
  .get(async (req, res, next) => {
    const { limit, userId } = req.query.part;

    if (!limit) {
      return res.status(400).json({
        error: 'Missing \'limit\' in request query'
      });
    }

    // if given userId, check if user exists
    if (userId) {
      try {
        const hasUser = await UsersService.hasUserWithId(
          req.app.get('db'),
          userId
        );

        if (!hasUser) {
          logger.error(`User doesn\'t exist (path: ${req.originalUrl})`);
          return res.status(404).json({
            error: 'User doesn\'t exist'
          });
        }
      } catch (error) { next(error); }
    }

    try {
      const recipes = await RecipesService.getRecipes(
        req.app.get('db'),
        limit,
        userId
      );
      return res.json(recipes.map(RecipesService.serializeRecipe));
    } catch (error) { next(error); }
  })
  .post(requireAuth, jsonBodyParser, async (req, res, next) => {
    if (req.user.id === 1) {
      return res.status(401).json({
        error: 'Cannot create recipes with demo account.'
      });
    }

    const { name, information, ingredients, instructions, img } = req.body;
    const newRecipe = { recipe_name: name, information, img };

    for (const key of ['name', 'ingredients', 'instructions']) {
      if (!req.body[key]) {
        return res.status(400).json({
          error: `Missing '${key}' in request body`
        });
      }
    }

    // check if ingredients and instructions have at least one element
    if (typeof ingredients === 'object' && !ingredients.length) {
      return res.status(400).json({
        error: 'Must give at least one instruction'
      });
    }
    if (typeof instructions === 'object' && !instructions.length) {
      return res.status(400).json({
        error: 'Must give at least one instruction'
      });
    }

    newRecipe.user_id = req.user.id;

    try {
      const { id: recipe_id } = await RecipesService.insertRecipe(
        req.app.get('db'),
        newRecipe
      );

      // prepare column values for ingredients and instructions
      ingredients.array.forEach((ingredient, index) => {
        ingredients[index] = {
          ...ingredient,
          recipe_id,
          list_idx: index
        };
      });
      instructions.array.forEach((instruction, index) => {
        instructions[index] = {
          recipe_id,
          list_idx: index,
          instruction
        };
      });
      // insert ingredients and instructions
      await Promise.all([
        RecipesService.insertIngredients(
          req.app.get('db'),
          ingredients
        ),
        RecipesService.insertInstructions(
          req.app.get('db'),
          instructions
        )
      ]);

      const recipe = await RecipesService.getById(
        req.app.get('db'),
        recipe_id
      );

      return res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${recipe.id}`))
        .json(RecipesService.serializeRecipe(recipe));
    } catch (error) { next(error); }
  });

recipesRouter
  .route('/:recipe_id')
  .all(checkRecipeExists)
  .get((req, res) => {
    res.json(RecipesService.serializeRecipe(res.recipe));
  })
  .all(requireAuth)
  .all(checkUserIsAuthor)
  .patch(async (req, res, next) => {
    if (req.user.id === 1) {
      return res.status(401).json({
        error: 'Cannot update demo recipes'
      });
    }

    const updatesToRun = [];
    const { name, information, ingredients, instructions, img } = req.body;
    const recipeUpdates = { recipe_name: name, information, img }; // updates to name, information, and/or img
    const listUpdates; // updates to ingredients and/or instructions

    // if recipe has updates to name, information, and/or image, add to 
    // updates to run
    const updated = false;
    for (const key of Object.keys(recipeUpdates)) {
      if (!recipeUpdates[key]) {
        delete recipeUpdates[key];
        updated = true;
      }
    }
    if (updated) {
      recipeUpdates['date_modified'] = 'now()';
      updatesToRun.push(RecipesService.updateRecipe(recipeUpdates));
    }

    // if given, check if ingredients and instructions have at least 
    // one element and add to updates to run if valid
    listUpdates = {
      ingredients: {
        func: RecipesService.putIngredients,
        ingredients
      },
      instructions: {
        func: RecipesService.putInstructions,
        instructions
      }
    };
    for (const type of listUpdates) {
      const { func, list } = listUpdates[type];
      if (list) {
        if (typeof type === 'object') {
          if (!list.length) {
            return res.status(400).json({
              error: `'${type}' cannnot be empty`
            });
          } else {
            updatesToRun.push(func(
              req.app.get('db'),
              res.recipe.id,
              list
            ));
          }
        }
      }
    }

    try {
      await Promise.all(updatesToRun);
      const recipe = await RecipesService.getById(
        req.app.get('db'),
        req.params.recipe_id
      );
      return res
        .location(req.originalUrl)
        .json(RecipesService.serializeRecipe(recipe));
    } catch (error) { next(error); }
  })
  .delete(async (req, res, next) => {
    if (req.user.id === 1) {
      return res.status(401).json({
        error: 'Cannot delete demo recipe'
      });
    }

    try {
      await RecipesService.deleteRecipe(
        req.app.get('db'),
        req.params.recipe_id
      );
      return res
        .status(204)
        .send();
    } catch (error) { next(error); }
  });

async function checkRecipeExists(req, res, next) {
  try {
    const recipe = await RecipesService.getById(
      req.app.get('db'),
      req.params.recipe_id
    );

    if (!recipe) {
      logger.error('Recipe doesn\'t exist');
      return res.status(404).json({
        error: 'Recipe doesn\'t exist'
      });
    }

    res.recipe = recipe;
    next();
  } catch (error) { next(error); }
}

// called after checkRecipeExists and requireAuth
async function checkUserIsAuthor(req, res, next) {
  try {
    if (!req.user.id === res.recipe.user_id) {
      logger.error('User is not author of recipe');
      return res.status(404).json({
        error: 'User is not author of recipe'
      });
    }
    next();
  } catch (error) { next(error); }
}

module.exports = recipesRouter;