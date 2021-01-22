function makeProjectsArray() {
  return [
    {
      id: 1,
      date_created: '2029-01-22T16:28:32.615Z',
      title: 'First test post!',
      owner_id: 1
    },
    {
      id: 2,
      date_created: '2100-05-22T16:28:32.615Z',
      title: 'Second test post!',
      owner_id: 1
    },
    {
      id: 3,
      date_created: '1919-12-22T16:28:32.615Z',
      title: 'Third test post!',
      owner_id: 1
    },
    {
      id: 4,
      date_created: '1919-12-22T16:28:32.615Z',
      title: 'Fourth test post!',
      owner_id: 1
    },
  ];
}

function makeMaliciousProject() {
  const maliciousProject = {
    id: 911,
    date_created: new Date().toISOString(),
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    owner_id: 1
  }
  const expectedProject = {
    ...maliciousProject,
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
  }
  return {
    maliciousProject,
    expectedProject,
  }
}


module.exports = {
  makeProjectsArray,
  makeMaliciousProject
};