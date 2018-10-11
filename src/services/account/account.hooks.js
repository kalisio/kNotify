import { when } from 'feathers-hooks-common'
import { populateAccountUser } from '../../hooks'
import { hooks as coreHooks } from '@kalisio/kdk-core'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ when(hook => hook.data.action === 'resetPwdLong' || hook.data.action === 'passwordChange',
              populateAccountUser, coreHooks.enforcePasswordPolicy({ userAsItem: false, passwordField: 'value.password' })) ],
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
