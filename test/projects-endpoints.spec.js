const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Projects Endpoints', function () {
  let db

  const {
    testUsers,
    testProjects,
    testLogs,
  } = helpers.makeProjectsFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  describe(`GET /api/projects`, () => {
    context(`Given no projects`, () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      )

      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, [])
      })
    })

    context('Given there are projects in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testLogs
        )
      )

      it('responds with 200 and all of the projects', () => {
        const expectedProjects = testProjects
          .filter(project => project.owner_id === testUsers[0].id)
          .map(project =>
            helpers.makeExpectedProject(
              testUsers,
              project,
              testLogs
            )
          )
        return supertest(app)
          .get('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedProjects)
      })
    })

    context(`Given an XSS attack project`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousProject,
        expectedProject,
      } = helpers.makeMaliciousProject(testUser)

      beforeEach('insert malicious project', () => {
        return helpers.seedMaliciousProject(
          db,
          testUser,
          maliciousProject
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/projects`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[1]))
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedProject.title)
            expect(res.body[0].content).to.eql(expectedProject.content)
          })
      })
    })
  })

  describe(`GET /api/projects/:project_id`, () => {
    context(`Given no projects`, () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      )

      it(`responds with 404`, () => {
        const projectId = 123456
        return supertest(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Project doesn't exist` })
      })
    })

    context('Given there are projects in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testLogs,
        )
      )

      it('responds with 200 and the specified project', () => {
        const projectId = 2
        const expectedProject = helpers.makeExpectedProject(
          testUsers,
          testProjects[projectId - 1],
          testLogs,
        )

        return supertest(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[1]))
          .expect(200, expectedProject)
      })
    })

    context(`Given an XSS attack project`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousProject,
        expectedProject,
      } = helpers.makeMaliciousProject(testUser)

      beforeEach('insert malicious project', () => {
        return helpers.seedMaliciousProject(
          db,
          testUser,
          maliciousProject,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/projects/${maliciousProject.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedProject.title)
            expect(res.body.content).to.eql(expectedProject.content)
          })
      })
    })
  })

  describe(`GET /api/projects/:project_id/logs`, () => {
    context(`Given no projects`, () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      )

      it(`responds with 404`, () => {
        const projectId = 123456
        return supertest(app)
          .get(`/api/projects/${projectId}/logs`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Project doesn't exist` })
      })
    })

    context('Given there are logs for project in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testLogs,
        )
      )

      it('responds with 200 and the specified logs', () => {
        const projectId = 1
        const expectedLogs = helpers.makeExpectedProjectLogs(
          testUsers, projectId, testLogs
        )

        return supertest(app)
          .get(`/api/projects/${projectId}/logs`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedLogs)
      })
    })
  })
})
