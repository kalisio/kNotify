import { addVerification, removeVerification, sendVerificationEmail, unregisterDevices } from '../../hooks'

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [ addVerification ],
    update: [],
    patch: [],
    remove: [ unregisterDevices ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [ sendVerificationEmail, removeVerification ],
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
