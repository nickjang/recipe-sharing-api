const knex = require('knex');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const helpers = require('./test-helpers');
const { expect } = require('chai');

describe('Users Endpoints', function () {
  let db;

  const { testUsers } = helpers.makeProjectsFixtures();
  const testUser = testUsers[0];

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

  describe('POST /api/users', () => {
    context('User Validation', () => {
      beforeEach('insert users', () =>
        helpers.seedUsers(
          db,
          testUsers
        )
      );

      const requiredFields = ['email', 'password', 'full_name'];

      requiredFields.forEach(field => {
        const registerAttemptBody = {
          email: 'test email',
          password: 'test password',
          full_name: 'test full_name',
          nickname: 'test nickname',
        };

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field];

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`,
            });
        });
      });

      it('responds 400 \'Password must be at least 8 characters\' when empty password', () => {
        const userShortPassword = {
          email: 'test email',
          password: '1234567',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(userShortPassword)
          .expect(400, { error: 'Password must be at least 8 characters' });
      });

      it('responds 400 \'Password be less than 72 characters\' when long password', () => {
        const userLongPassword = {
          email: 'test email',
          password: '*'.repeat(73),
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(userLongPassword)
          .expect(400, { error: 'Password be less than 72 characters' });
      });

      it('responds 400 error when password starts with spaces', () => {
        const userPasswordStartsSpaces = {
          email: 'test email',
          password: ' 1Aa!2Bb@',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordStartsSpaces)
          .expect(400, { error: 'Password must not start or end with empty spaces' });
      });

      it('responds 400 error when password ends with spaces', () => {
        const userPasswordEndsSpaces = {
          email: 'test email',
          password: '1Aa!2Bb@ ',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordEndsSpaces)
          .expect(400, { error: 'Password must not start or end with empty spaces' });
      });

      it('responds 400 error when password isn\'t complex enough', () => {
        const userPasswordNotComplex = {
          email: 'test email',
          password: '11AAaabb',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordNotComplex)
          .expect(400, { error: 'Password must contain one upper case, lower case, number and special character' });
      });

      it('responds 400 \'Email already taken\' when email isn\'t unique', () => {
        const duplicateUser = {
          email: testUser.email,
          password: '11AAaa!!',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(duplicateUser)
          .expect(400, { error: 'email already taken' });
      });
    });

    context('Happy path', () => {
      it('responds 201, serialized user, storing bcryped password', () => {
        const newUser = {
          email: 'test email',
          password: '11AAaa!!',
          full_name: 'test full_name',
        };
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id');
            expect(res.body.email).to.eql(newUser.email);
            expect(res.body.full_name).to.eql(newUser.full_name);
            expect(res.body.nickname).to.eql('');
            expect(res.body).to.not.have.property('password');
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`);
            const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' });
            const actualDate = new Date(res.body.date_created).toLocaleString();
            expect(actualDate).to.eql(expectedDate);
          })
          .expect(res =>
            db
              .from('users')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.email).to.eql(newUser.email);
                expect(row.full_name).to.eql(newUser.full_name);
                expect(row.nickname).to.eql(null);
                const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' });
                const actualDate = new Date(row.date_created).toLocaleString();
                expect(actualDate).to.eql(expectedDate);

                return bcrypt.compare(newUser.password, row.password);
              })
              .then(compareMatch => {
                expect(compareMatch).to.be.true;
              })
          );
      });
    });
  });

  describe('PATCH /api/users', () => {
    context('User update', () => {
      beforeEach('insert users', () =>
        helpers.seedUsers(
          db,
          testUsers
        )
      );

      it('responds 200, serialized user, storing new email and bcryped password', () => {
        const updates = {
          email: 'test email',
          password: '11AAaa!!',
        };
        return supertest(app)
          .patch('/api/users')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(updates)
          .expect(200)
          .expect(res => {
            expect(res.body).to.have.property('id');
            expect(res.body.email).to.eql(updates.email);
            expect(res.body).to.not.have.property('password');
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`);
          })
          .expect(res =>
            db
              .from('users')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.email).to.eql(updates.email);
                expect(row.nickname).to.eql(null);
                return bcrypt.compare(updates.password, row.password);
              })
              .then(compareMatch => {
                expect(compareMatch).to.be.true;
              })
          );
      });
    });
  });

  describe('DELETE /api/users', () => {
    context('User delete', () => {
      beforeEach('insert users', () =>
        helpers.seedUsers(
          db,
          testUsers
        )
      );

      it('responds 200 and deletes user', () => {
        return supertest(app)
          .delete('/api/users')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(204)
          .expect(res => {
            return db
              .from('users')
              .select('*')
              .where({ id: testUser.id })
              .first()
              .then(row => {
                expect(row).to.be.empty;
              });
          });
      });
    });
  });
});
