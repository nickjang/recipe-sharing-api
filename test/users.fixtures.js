function makeUsersArray() {
  return [
    {
      id: 1,
      date_created: '2029-01-22T16:28:32.615Z',
      fullname: 'Sam Gamgee',
      email: 'sam.gamgee@shire.com',
      password: 'secret',
      nickname: 'Sam'
    },
    {
      id: 2,
      date_created: '2100-05-22T16:28:32.615Z',
      fullname: 'Peregrin Took',
      email: 'peregrin.took@shire.com',
      password: 'secret',
      nickname: 'Pippin'
    }
  ];
}

module.exports = {
  makeUsersArray
};