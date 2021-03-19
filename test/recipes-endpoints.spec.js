const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Recipes Endpoints', function () {
  let db;

  const {
    testUsers,
    testRecipes,
    testIngredients,
    testInstructions
  } = helpers.makeRecipesFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  describe('GET /api/recipes', () => {
    context('Given no recipes', () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      );

      it('responds with 200, an empty recipes list, and false hasMore value', () => {
        return supertest(app)
          .get('/api/recipes?limit=12&offset=0&userId=1')
          .expect(200, { recipes: [], hasMore: false });
      });
    });

    context('Given there are recipes in the database', () => {
      beforeEach('insert recipes', () =>
        helpers.seedRecipesTables(
          db,
          testUsers,
          testRecipes,
          testIngredients,
          testInstructions
        )
      );

      it('responds with 200 and up to 12 recipes from user', () => {
        const expectedRecipes = testRecipes
          .filter(recipe => recipe.user_id === testUsers[1].id)
          .map(recipe =>
            helpers.makeExpectedRecipe(
              testUsers,
              testIngredients,
              testInstructions,
              recipe
            )
          );
        return supertest(app)
          .get(`/api/recipes?limit=12&offset=0&userId=${testUsers[1].id}`)
          .expect(200, { recipes: expectedRecipes, hasMore: false });
      });

      it.only('responds with 200 and up to 12 recipes matching some filters', () => {
        const information = 'recipe';
        const ingredients = ['sugar', 'salt'];
        const expectedRecipes = testRecipes
          .filter(recipe => {
            return recipe.information.toLowerCase().includes(information.toLowerCase());
          })
          .map(recipe =>
            helpers.makeExpectedRecipe(
              testUsers,
              testIngredients,
              testInstructions,
              recipe
            )
          )
          .filter(recipe => {
            recipe.ingredients = recipe.ingredients.map(({ ingredient }) => ingredient);
            return ingredients.reduce((bool, ingredient) =>
              bool && recipe.ingredients.includes(ingredient), true
            );
          });

        const limitString = 'limit=12';
        const offsetString = 'offset=0';
        const infoString = `information=${information}`;
        const ingredientString = 'ingredients=' + ingredients.join('&ingredients=');

        const queryString = [limitString, offsetString, infoString, ingredientString].join('&');

        return supertest(app)
          .get(`/api/recipes?${queryString}`)
          .expect(200, { recipes: expectedRecipes, hasMore: false });
      });

      it.only('responds with 200 and up to 12 recipes matching all filters', () => {
        const name = 'chocolate';
        const information = 'recipe';
        const ingredients = ['sugar', 'salt'];
        const instructions = ['bake', 'cool'];
        const expectedRecipes = testRecipes
          .filter(recipe => {
            return recipe.recipe_name.toLowerCase().includes(name.toLowerCase())
              && recipe.information.toLowerCase().includes(information.toLowerCase())
              && recipe.user_id === testUsers[1].id;
          })
          .map(recipe =>
            helpers.makeExpectedRecipe(
              testUsers,
              testIngredients,
              testInstructions,
              recipe
            )
          )
          .filter(recipe => {
            recipe.ingredients = recipe.ingredients.map(({ ingredient }) => ingredient);
            return ingredients.reduce((bool, ingredient) =>
              bool && recipe.ingredients.includes(ingredient), true
            ) && instructions.reduce((bool, instruction) =>
              bool && recipe.instructions.includes(instruction), true
            );
          });

        const limitString = 'limit=12';
        const offsetString = 'offset=0';
        const nameString = `name=${name}`;
        const infoString = `information=${information}`;
        const ingredientString = 'ingredients=' + ingredients.join('&ingredients=');
        const instructionString = 'instructions=' + instructions.join('&instructions=');
        const userIdString = `userId=${testUsers[1].id}`;

        const queryString = [
          limitString, offsetString, nameString, infoString,
          ingredientString, instructionString, userIdString
        ].join('&');

        return supertest(app)
          .get(`/api/recipes?${queryString}`)
          .expect(200, { recipes: expectedRecipes, hasMore: false });
      });
    });

    context('Given an XSS attack recipe', () => {
      const testUser = helpers.makeUsersArray()[1];
      const {
        maliciousRecipe,
        maliciousIngredients,
        maliciousInstructions,
        expectedRecipe,
      } = helpers.makeMaliciousRecipe(testUser);

      beforeEach('insert malicious recipe', () => {
        return helpers.seedMaliciousRecipe(
          db,
          testUser,
          maliciousRecipe,
          maliciousIngredients,
          maliciousInstructions
        );
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/recipes?limit=12&offset=0')
          .expect(200)
          .expect(({ body: { recipes } }) => {
            expect(recipes[0].name).to.eql(expectedRecipe.name);
            expect(recipes[0].information).to.eql(expectedRecipe.information);
            expect(recipes[0].img).to.eql(expectedRecipe.img);
            expect(recipes[0].ingredients).to.eql(expectedRecipe.ingredients);
            expect(recipes[0].instructions).to.eql(expectedRecipe.instructions);
          });
      });
    });
  });

  describe('GET /api/recipes/:recipe_id', () => {
    context('Given no recipes', () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      );

      it('responds with 404', () => {
        const recipeId = 123;
        return supertest(app)
          .get(`/api/recipes/${recipeId}`)
          .expect(404, { error: 'Recipe doesn\'t exist' });
      });
    });

    context('Given there are recipes in the database', () => {
      beforeEach('insert recipes', () =>
        helpers.seedRecipesTables(
          db,
          testUsers,
          testRecipes,
          testIngredients,
          testInstructions
        )
      );

      it('responds with 200 and the specified recipe', () => {
        const recipeId = 2;
        const expectedRecipe = helpers.makeExpectedRecipe(
          testUsers,
          testIngredients,
          testInstructions,
          testRecipes[recipeId - 1]
        );

        return supertest(app)
          .get(`/api/recipes/${recipeId}`)
          .expect(200, expectedRecipe);
      });
    });

    context('Given an XSS attack recipe', () => {
      const testUser = helpers.makeUsersArray()[1];
      const {
        maliciousRecipe,
        maliciousIngredients,
        maliciousInstructions,
        expectedRecipe,
      } = helpers.makeMaliciousRecipe(testUser);

      beforeEach('insert malicious recipe', () => {
        return helpers.seedMaliciousRecipe(
          db,
          testUser,
          maliciousRecipe,
          maliciousIngredients,
          maliciousInstructions
        );
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/recipes/${maliciousRecipe.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql(expectedRecipe.name);
            expect(res.body.information).to.eql(expectedRecipe.information);
            expect(res.body.img).to.eql(expectedRecipe.img);
            expect(res.body.ingredients).to.eql(expectedRecipe.ingredients);
            expect(res.body.instructions).to.eql(expectedRecipe.instructions);
          });
      });
    });
  });

  describe('POST /api/recipes', () => {
    beforeEach('insert recipes', () =>
      helpers.seedRecipesTables(
        db,
        testUsers,
        testRecipes,
        testIngredients,
        testInstructions
      )
    );

    it('creates a recipe, responding with 201 and the new recipe', function () {
      this.retries(3);
      const testUser = testUsers[1];
      const newRecipe = {
        name: 'New test',
        information: 'New test information',
        img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=3900&q=80',
        ingredients: [{
          measurement: '1 cup',
          ingredient: 'sugar',
        }],
        instructions: ['mix']
      };
      return supertest(app)
        .post('/api/recipes')
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .send(newRecipe)
        .expect(201)
        .expect(res => {
          expect(res.body).to.have.property('id');
          const expectedAuthor = { id: testUser.id, full_name: testUser.full_name };
          expect(res.body.author).to.eql(expectedAuthor);
          expect(res.headers.location).to.eql(`/api/recipes/${res.body.id}`);
          const expectedTime = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actualTime = new Date(res.body.date_created).toLocaleString();
          expect(actualTime).to.eql(expectedTime);
        })
        .expect(res =>
          db
            .from('recipes')
            .select('*')
            .where({ id: res.body.id })
            .first()
            .then(row => {
              expect(row.id).to.eql(newRecipe.id);
              const expectedAuthor = { id: testUser.id, full_name: testUser.full_name };
              expect(res.body.author).to.eql(expectedAuthor);
              const expectedTime = new Date().toLocaleString('en', { timeZone: 'UTC' });
              const actualTime = new Date(res.body.date_created).toLocaleString();
              expect(actualTime).to.eql(expectedTime);
            })
        );
    });

    const requiredFields = ['name', 'ingredients', 'instructions'];

    requiredFields.forEach(field => {
      const testUser = testUsers[1];
      const testRecipe = testRecipes[1];
      const newRecipe = {
        name: testRecipe.recipe_name,
        ingredients: [{ measurement: '1 cup', ingredient: 'salt' }],
        instructions: ['mix']
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newRecipe[field];

        return supertest(app)
          .post('/api/recipes')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newRecipe)
          .expect(400, {
            error: `Missing '${field}' in request body`,
          });
      });
    });
  });

  describe('PATCH /api/recipes/:recipe_id', () => {
    beforeEach('insert recipes', () =>
      helpers.seedRecipesTables(
        db,
        testUsers,
        testRecipes,
        testIngredients,
        testInstructions
      )
    );

    it('updates a recipe, responding with 200 and the updated recipe', function () {
      this.retries(3);
      const testUser = testUsers[1];
      const testRecipe = testRecipes[1];
      const updatedRecipe = {
        name: 'First test update',
        information: 'First test information update',
        ingredients: [{
          measurement: '1 cup update',
          ingredient: 'sugar'
        }]
      };
      return supertest(app)
        .patch(`/api/recipes/${testRecipe.id}`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .send(updatedRecipe)
        .expect(200)
        .expect(res => {
          expect(res.body).to.have.property('id');
          const expectedAuthor = { id: testUser.id, full_name: testUser.full_name };
          expect(res.body.author).to.eql(expectedAuthor);
          expect(res.headers.location).to.eql(`/api/recipes/${testRecipe.id}`);
          const expectedTime = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actualTime = new Date(res.body.date_modified).toLocaleString();
          expect(actualTime).to.eql(expectedTime);
        })
        .expect(res =>
          db
            .from('recipes')
            .select('*')
            .where({ id: res.body.id })
            .first()
            .then(row => {
              expect(row.id).to.eql(updatedRecipe.id);
              const expectedAuthor = { id: testUser.id, full_name: testUser.full_name };
              expect(res.body.author).to.eql(expectedAuthor);
              const expectedTime = new Date().toLocaleString('en', { timeZone: 'UTC' });
              const actualTime = new Date(res.body.date_modified).toLocaleString();
              expect(actualTime).to.eql(expectedTime);
            })
        );
    });

    const testUser = testUsers[1];
    const testRecipe = testRecipes[1];
    const updatedRecipe = {};
    it('responds with 400 and an error message when updates are missing', () => {
      return supertest(app)
        .patch(`/api/recipes/${testRecipe.id}`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .send(updatedRecipe)
        .expect(400, {
          error: 'Found no updates in request body'
        });
    });
  });

  describe('DELETE /api/recipes/:recipe_id', () => {
    beforeEach('insert recipes', () =>
      helpers.seedRecipesTables(
        db,
        testUsers,
        testRecipes,
        testIngredients,
        testInstructions
      )
    );

    it('responds 204 and deletes recipe', () => {
      const testUser = testUsers[1];
      const testRecipe = testRecipes[1];
      return supertest(app)
        .delete(`/api/recipes/${testRecipe.id}`)
        .set('Authorization', helpers.makeAuthHeader(testUser))
        .expect(204)
        .expect(res => {
          return db
            .from('recipes')
            .select('*')
            .where({ id: testRecipe.id })
            .first()
            .then(row => {
              expect(row).to.be.empty;
            });
        });
    });
  });
});
