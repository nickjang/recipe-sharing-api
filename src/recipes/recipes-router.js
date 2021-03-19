const express = require('express');
const path = require('path');
const UsersService = require('../users/users-service');
const RecipesService = require('./recipes-service');
const { requireAuth } = require('../middleware/jwt-auth');
const logger = require('../logger');

const recipesRouter = express.Router();
const jsonBodyParser = express.json();

recipesRouter
  .route('/')
  .get(async (req, res, next) => {
    const {
      limit,
      offset,
      name,
      information,
      ingredients,
      instructions,
      userId } = req.query;

    for (const key of ['limit', 'offset']) {
      if (!req.query[key]) {
        return res.status(400).json({
          error: `Missing '${key}' in request query`
        });
      }
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
      const filters = {
        name,
        information,
        ingredients,
        instructions,
        userId
      };
      const [recipes, count] = await Promise.all([
        RecipesService.getWithFilters(
          req.app.get('db'),
          filters,
          limit,
          offset
        ),
        RecipesService.getNumRecipes(
          req.app.get('db'),
          filters
        )]);
      return res.json({
        recipes: recipes.map(RecipesService.serializeRecipe),
        hasMore: !!(count - (offset + recipes.length))
      });
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
    newRecipe.information_tokens = `to_tsvector(${newRecipe.information})`;

    try {
      const { id: recipe_id } = await RecipesService.insertRecipe(
        req.app.get('db'),
        newRecipe
      );

      // prepare column values for ingredients and instructions
      ingredients.forEach((ingredient, index) => {
        ingredients[index] = {
          ...ingredient,
          recipe_id,
          list_idx: index
        };
      });
      instructions.forEach((instruction, index) => {
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
  .patch(jsonBodyParser, async (req, res, next) => {
    if (req.user.id === 1) {
      return res.status(401).json({
        error: 'Cannot update demo recipes'
      });
    }

    const updatesToRun = [];
    const { name, information, ingredients, instructions, img } = req.body;
    const recipeUpdates = { recipe_name: name, information, img }; // updates to name, information, and/or img
    let listUpdates; // updates to ingredients and/or instructions
    let updated = false;

    // if recipe has updates to name, information, and/or image, add to 
    // updates to run
    for (const key of Object.keys(recipeUpdates)) {
      if (recipeUpdates[key] == null) {
        delete recipeUpdates[key];
      } else {
        updated = true;
      }
    }

    // if given information, add information tokens
    if (recipeUpdates.hasOwnProperty('information'))
      recipeUpdates.information_tokens = `to_tsvector(${recipeUpdates.information})`;

    // if given, check if ingredients and instructions have at least 
    // one element and add to updates to run if valid
    listUpdates = {
      ingredients: {
        func: RecipesService.putIngredients,
        list: ingredients && ingredients.map((ingredient, index) => ({
          recipe_id: res.recipe.id,
          list_idx: index,
          measurement: ingredient.measurement,
          ingredient: ingredient.ingredient
        }))
      },
      instructions: {
        func: RecipesService.putInstructions,
        list: instructions && instructions.map((instruction, index) => ({
          recipe_id: res.recipe.id,
          list_idx: index,
          instruction
        }))
      }
    };
    for (const type in listUpdates) {
      const { func, list } = listUpdates[type];
      if (list && typeof list === 'object') {
        if (!list.length) {
          return res.status(400).json({
            error: `'${type}' cannnot be empty`
          });
        } else {
          updated = true;
          updatesToRun.push(func(
            req.app.get('db'),
            res.recipe.id,
            list
          ));
        }
      }
    }

    // if there are updates, run updates
    if (!updated) {
      return res.status(400).json({
        error: 'Found no updates in request body'
      });
    } else {
      recipeUpdates.date_modified = 'now()';
      updatesToRun.push(RecipesService.updateRecipe(
        req.app.get('db'),
        res.recipe.id,
        recipeUpdates
      ));
    }

    try {
      let result = await Promise.all(updatesToRun);
      const recipe = await RecipesService.getById(
        req.app.get('db'),
        res.recipe.id
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
        res.recipe.id
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
    if (req.user.id !== res.recipe.author.id) {
      logger.error('User is not author of recipe');
      return res.status(404).json({
        error: 'User is not author of recipe'
      });
    }
    next();
  } catch (error) { next(error); }
}

module.exports = recipesRouter;