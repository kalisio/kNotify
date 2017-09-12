const verifyHooks = require('feathers-authentication-management').hooks

export function sendVerificationEmail (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendVerificationEmail' hook should only be used as a 'after' hook.`)
  }

  let accountService = hook.app.getService('account')
  return accountService.options.notifier('resendVerifySignup', hook.result)
  .then(result => {
    return hook
  })
}

export function addVerification (hook) {
  let accountService = hook.app.getService('account')
  return verifyHooks.addVerification(accountService.getPath(true))(hook)
}

export function removeVerification (hook) {
  return verifyHooks.removeVerification()(hook)
}
