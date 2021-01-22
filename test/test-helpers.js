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

function makeProjectsArray(users) {
  return [
    {
      id: 1,
      title: 'First test post!',
      owner_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      title: 'Second test post!',
      owner_id: users[1].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      title: 'Third test post!',
      owner_id: users[2].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 4,
      title: 'Fourth test post!',
      owner_id: users[3].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ]
}

function makeLogsArray(users, projects) {
  return [
    {
      id: 1,
      project_id: projects[0].id,
      user_id: users[0].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: null,
      format_sec: null
    },
    {
      id: 2,
      project_id: projects[0].id,
      user_id: users[0].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 1,
      format_sec: 1
    },
    {
      id: 3,
      project_id: projects[0].id,
      user_id: users[0].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 1,
      format_sec: 0
    },
    {
      id: 4,
      project_id: projects[0].id,
      user_id: users[0].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 0,
      format_sec: 0
    },
    {
      id: 5,
      project_id: projects[projects.length - 1].id,
      user_id: users[3].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 10,
      format_sec: 0
    },
    {
      id: 6,
      project_id: projects[projects.length - 1].id,
      user_id: users[3].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 5,
      format_sec: 5
    },
    {
      id: 7,
      project_id: projects[3].id,
      user_id: users[3].id,
      start_time: new Date('2029-01-22T16:28:32.615Z'),
      end_time: new Date('2029-01-22T17:28:32.615Z'),
      format_min: 45,
      format_sec: 45
    },
  ];
}

function makeExpectedProject(users, project) {
  const owner = users
    .find(user => user.id === project.owner_id)

  return {
    id: project.id,
    title: project.title,
    date_created: project.date_created.toISOString(),
    owner: {
      id: owner.id,
      email: owner.email,
      full_name: owner.full_name,
      nickname: owner.nickname,
      date_created: owner.date_created.toISOString(),
      date_modified: owner.date_modified || null,
    },
  }
}

function makeExpectedProjectLogs(users, project_id, logs) {
  const expectedLogs = logs
    .filter(log => log.project_id === project_id)

  return expectedLogs.map(log => {
    const logUser = users.find(user => user.id === log.user_id)
    return {
      id: log.id,
      project_id: log.project_id,
      start_time: log.start_time.toISOString(),
      end_time: log.end_time.toISOString(),
      format: {
        minutes: log.format_min,
        seconds: log.format_sec
      },
      user: {
        id: logUser.id,
        email: logUser.email,
        full_name: logUser.full_name,
        nickname: logUser.nickname,
        date_created: logUser.date_created.toISOString(),
        date_modified: logUser.date_modified || null,
      }
    }
  })
}

function makeMaliciousProject(user) {
  const maliciousProject = {
    id: 911,
    date_created: new Date(),
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    owner_id: user.id,
  }
  const expectedProject = {
    ...makeExpectedProject([user], maliciousProject),
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
  }
  return {
    maliciousProject,
    expectedProject,
  }
}

function makeProjectsFixtures() {
  const testUsers = makeUsersArray()
  const testProjects = makeProjectsArray(testUsers)
  const testLogs = makeLogsArray(testUsers, testProjects)
  return { testUsers, testProjects, testLogs }
}

function cleanTables(db) {
  return db.transaction(trx =>
    trx.raw(
      `TRUNCATE
        projects,
        users,
        logs
      `
    )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE projects_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE users_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE logs_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('projects_id_seq', 0)`),
          trx.raw(`SELECT setval('users_id_seq', 0)`),
          trx.raw(`SELECT setval('logs_id_seq', 0)`),
        ])
      )
  )
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

function seedProjectsTables(db, users, projects, logs = []) {
  // use a transaction to group the queries and auto rollback on any failure
  return db.transaction(async trx => {
    await seedUsers(trx, users)
    await trx.into('projects').insert(projects)
    // update the auto sequence to match the forced id values
    await trx.raw(
      `SELECT setval('projects_id_seq', ?)`,
      [projects[projects.length - 1].id],
    )
    // only insert logs if there are some, also update the sequence counter
    if (logs.length) {
      await trx.into('logs').insert(logs)
      await trx.raw(
        `SELECT setval('logs_id_seq', ?)`,
        [logs[logs.length - 1].id],
      )
    }
  })
}

function seedMaliciousProject(db, user, project) {
  return seedUsers(db, [user])
    .then(() =>
      db
        .into('projects')
        .insert([project])
    )
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
  makeProjectsArray,
  makeExpectedProject,
  makeExpectedProjectLogs,
  makeMaliciousProject,
  makeLogsArray,

  makeProjectsFixtures,
  cleanTables,
  seedProjectsTables,
  seedMaliciousProject,
  makeAuthHeader,
  seedUsers,
}
