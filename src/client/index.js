import logger from 'loglevel'
import accountManager from 'feathers-authentication-management'

// We faced a bug in babel so that transform-runtime with export * from 'x' generates import statements in transpiled code
// Tracked here : https://github.com/babel/babel/issues/2877
// We tested the workaround given here https://github.com/babel/babel/issues/2877#issuecomment-270700000 with success so far

// FIXME: we don't build vue component anymore, they are processed by webpack in the application template
// export * from './components'

export * as mixins from './mixins'

export default function init () {
  const app = this
/*
  app.configure(accountManager({
    service: 'users',
    path: app.getServicePath('account')
  }))
*/
  logger.debug('Initializing kalisio notify')
}
