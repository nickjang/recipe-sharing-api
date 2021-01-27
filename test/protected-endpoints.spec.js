const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Protected endpoints', function () {
  let db;

  const {
    testUsers,
    testRecipes,
    testIngredients,
    testInstructions,
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

  beforeEach('insert recipes', () =>
    helpers.seedRecipesTables(
      db,
      testUsers,
      testRecipes,
      testIngredients,
      testInstructions
    )
  );

  const protectedEndpoints = [
    {
      name: 'POST /api/recipes',
      path: '/api/recipes',
      method: supertest(app).post,
    },
    {
      name: 'PATCH /api/recipes/1',
      path: '/api/recipes/1',
      method: supertest(app).patch,
    },
    {
      name: 'DELETE /api/recipes/1',
      path: '/api/recipes/1',
      method: supertest(app).delete,
    },
    {
      name: 'POST /api/auth/refresh',
      path: '/api/auth/refresh',
      method: supertest(app).post,
    },
  ];

  protectedEndpoints.forEach(endpoint => {
    describe(endpoint.name, () => {
      it('responds 401 \'Missing bearer token\' when no bearer token', () => {
        return endpoint.method(endpoint.path)
          .expect(401, { error: 'Missing bearer token' });
      });

      it('responds 401 \'Unauthorized request\' when invalid JWT secret', () => {
        const validUser = testUsers[1];
        const invalidSecret = 'bad-secret';
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(validUser, invalidSecret))
          .expect(401, { error: 'Unauthorized request' });
      });

      it('responds 401 \'Unauthorized request\' when invalid sub in payload', () => {
        const invalidUser = { email: 'user-not-existy', id: 1 };
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(invalidUser))
          .expect(401, { error: 'Unauthorized request' });
      });
    });
  });
});
