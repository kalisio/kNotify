import { iff } from 'feathers-hooks-common'
const { authenticate } = require('feathers-authentication').hooks

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ iff(hook => hook.data.action === 'passwordChange' || hook.data.action === 'identityChange', authenticate('jwt')) ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
