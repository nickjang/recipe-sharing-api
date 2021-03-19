const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function makeUsersArray() {
  return [
    {
      id: 1,
      email: 'test-user-1',
      full_name: 'Test user 1',
      nickname: 'TU1',
      password: 'W!w1w1w1w1',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      email: 'test-user-2',
      full_name: 'Test user 2',
      nickname: 'TU2',
      password: 'W!w1w1w1w1',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      email: 'test-user-3',
      full_name: 'Test user 3',
      nickname: 'TU3',
      password: 'W!w1w1w1w1',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 4,
      email: 'test-user-4',
      full_name: 'Test user 4',
      nickname: 'TU4',
      password: 'W!w1w1w1w1',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ]
}

function makeRecipesArray(users) {
  return [
    {
      id: 1,
      recipe_name: 'First test',
      information: 'First test information',
      img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=3900&q=80',
      user_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      recipe_name: 'Second test',
      information: 'Second test information',
      img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=3900&q=80',
      user_id: users[1].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      recipe_name: 'Third test',
      information: 'Third test information',
      img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=3900&q=80',
      user_id: users[2].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 4,
      recipe_name: 'Fourth test',
      information: 'Fourth test information',
      img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=3900&q=80',
      user_id: users[3].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ];
}

function makeIngredientsArray(recipes) {
  return [
    {
      recipe_id: recipes[0].id,
      list_idx: 0,
      measurement: '1 cup',
      ingredient: 'sugar',
    },
    {
      recipe_id: recipes[0].id,
      list_idx: 1,
      measurement: '2 cups',
      ingredient: 'salt',
    },
    {
      recipe_id: recipes[1].id,
      list_idx: 0,
      measurement: '1 tsp',
      ingredient: 'baking powder',
    },
    {
      recipe_id: recipes[1].id,
      list_idx: 1,
      measurement: '1 cup',
      ingredient: 'flour',
    },
    {
      recipe_id: recipes[1].id,
      list_idx: 2,
      measurement: '1/2 cup',
      ingredient: 'sugar',
    },
    {
      recipe_id: recipes[2].id,
      list_idx: 0,
      measurement: '1 cup',
      ingredient: 'flour',
    },
    {
      recipe_id: recipes[3].id,
      list_idx: 0,
      measurement: '1 cup',
      ingredient: 'salt',
    }
  ];
}

function makeInstructionsArray(recipes) {
  return [
    {
      recipe_id: recipes[0].id,
      list_idx: 0,
      instruction: 'add',
    },
    {
      recipe_id: recipes[0].id,
      list_idx: 1,
      instruction: 'mix',
    },
    {
      recipe_id: recipes[0].id,
      list_idx: 2,
      instruction: 'bake',
    },
    {
      recipe_id: recipes[1].id,
      list_idx: 0,
      instruction: 'cook',
    },
    {
      recipe_id: recipes[1].id,
      list_idx: 1,
      instruction: 'add',
    },
    {
      recipe_id: recipes[2].id,
      list_idx: 0,
      instruction: 'cook',
    },
    {
      recipe_id: recipes[3].id,
      list_idx: 0,
      instruction: 'mix',
    }
  ];
}

function makeExpectedRecipe(users, ingredients, instructions, recipe) {
  const author = users.find(user => user.id === recipe.user_id);
  const recipeIngredients = ingredients.filter(ingredient => ingredient.recipe_id === recipe.id);
  const recipeInstructions = instructions.filter(instruction => instruction.recipe_id === recipe.id);

  return {
    id: recipe.id,
    name: recipe.recipe_name,
    information: recipe.information,
    img: recipe.img,
    ingredients: recipeIngredients.map(({ measurement, ingredient }) => ({
      measurement,
      ingredient
    })),
    instructions: recipeInstructions.map(({ instruction }) => instruction),
    author: {
      id: author.id,
      full_name: author.full_name,
    },
    date_created: recipe.date_created.toISOString(),
    date_modified: recipe.date_modified ? recipe.date_modified.toISOString() : null
  };
}

function makeExpectedUserRecipes(users, ingredients, instructions, recipes, limit, offset, user_id) {
  const author = users.find(user => user.id === user_id);
  const userRecipes = [];

  recipes.forEach((recipe, index) => {
    if (index < offset || index >= (limit + offset)) return;

    const recipeIngredients = ingredients.filter(ingredient => ingredient.recipe_id === recipe.id);
    const recipeInstructions = instructions.filter(instruction => instruction.recipe_id === recipe.id);

    userRecipes.push({
      id: recipe.id,
      name: recipe.recipe_name,
      information: recipe.information,
      img: recipe.img,
      ingredients: recipeIngredients.map(({ measurement, ingredient }) => ({
        measurement,
        ingredient
      })),
      instructions: recipeInstructions.map(({ instruction }) => instruction),
      author: {
        id: author.id,
        full_name: author.full_name
      },
      date_created: recipe.date_created.toISOString(),
      date_modified: recipe.date_modified ? recipe.date_modified.toISOString() : null
    });
  });
  return userRecipes;
}

const makeMaliciousRecipe = (user) => {
  const maliciousRecipe = {
    id: 1,
    recipe_name: '<script>alert("xss");</script>',
    information: '<script>alert("xss");</script>',
    img: '<script>alert("xss");</script>',
    date_created: new Date(),
    user_id: user.id
  };
  const maliciousIngredients = [{
    recipe_id: 1,
    list_idx: 0,
    measurement: '<script>alert("xss");</script>',
    ingredient: '<script>alert("xss");</script>',
  }];
  const maliciousInstructions = [{
    recipe_id: 1,
    list_idx: 0,
    instruction: '<script>alert("xss");</script>',
  }];
  const expectedRecipe = {
    ...makeExpectedRecipe(
      [user],
      maliciousIngredients,
      maliciousInstructions,
      maliciousRecipe
    ),
    name: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    information: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    img: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    ingredients: [{
      measurement: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      ingredient: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    }],
    instructions: ['&lt;script&gt;alert(\"xss\");&lt;/script&gt;']
  };
  return {
    maliciousRecipe,
    maliciousIngredients,
    maliciousInstructions,
    expectedRecipe,
  };
}

function makeRecipesFixtures() {
  const testUsers = makeUsersArray();
  const testRecipes = makeRecipesArray(testUsers);
  const testIngredients = makeIngredientsArray(testRecipes);
  const testInstructions = makeInstructionsArray(testRecipes);
  return { testUsers, testRecipes, testIngredients, testInstructions };
}

function cleanTables(db) {
  return db.transaction(trx =>
    trx.raw(
      `TRUNCATE
        recipes,
        users,
        recipe_ingredients,
        recipe_instructions
      `
    )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE recipes_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE users_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('recipes_id_seq', 0)`),
          trx.raw(`SELECT setval('users_id_seq', 0)`),
        ])
      )
  );
}

function seedUsers(db, users) {
  const preppedUsers = users.map(user => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1)
  }))
  return db.into('users').insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(
        `SELECT setval('users_id_seq', ?)`,
        [users[users.length - 1].id],
      )
    )
}

function seedRecipesTables(db, users, recipes, ingredients = [], instructions = []) {
  // use a transaction to group the queries and auto rollback on any failure
  return db.transaction(async trx => {
    await seedUsers(trx, users)
    // add information tokens
    const newRecipes = recipes.map(recipe => { 
      recipe.information_tokens = `to_tsvector(${recipe.information})`;
      return recipe;
    })
    await trx.into('recipes').insert(newRecipes)
    // update the auto sequence to match the forced id values
    await trx.raw(
      `SELECT setval('recipes_id_seq', ?)`,
      [recipes[recipes.length - 1].id],
    )
    // insert ingredients and instructions if there are some, 
    if (ingredients.length) {
      await trx.into('recipe_ingredients').insert(ingredients)
    }
    if (instructions.length) {
      await trx.into('recipe_instructions').insert(instructions)
    }
  })
}

function seedMaliciousRecipe(db, user, recipe, ingredients = [], instructions = []) {
  return db.transaction(async trx => {
    await seedUsers(trx, [user])
    await trx.into('recipes').insert(recipe)
    // insert ingredients and instructions if there are some, 
    if (ingredients.length) {
      await trx.into('recipe_ingredients').insert(ingredients)
    }
    if (instructions.length) {
      await trx.into('recipe_instructions').insert(instructions)
    }
  });
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.email,
    algorithm: 'HS256',
  })
  return `Bearer ${token}`
}

module.exports = {
  makeUsersArray,
  makeRecipesArray,
  makeIngredientsArray,
  makeInstructionsArray,
  makeExpectedRecipe,
  makeExpectedUserRecipes,
  makeMaliciousRecipe,
  makeRecipesFixtures,
  cleanTables,
  seedUsers,
  seedRecipesTables,
  seedMaliciousRecipe,
  makeAuthHeader,
}
