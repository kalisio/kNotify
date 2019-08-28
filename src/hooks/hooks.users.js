import makeDebug from 'debug'

const verifyHooks = require('feathers-authentication-management').hooks
const debug = makeDebug('kalisio:kNotify:users:hooks')

export function sendVerificationEmail (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'sendVerificationEmail\' hook should only be used as a \'after\' hook.')
  }

  // Check for by-passing OAuth2 providers
  for (const provider of hook.app.authenticationProviders) {
    if (hook.result[provider + 'Id']) return Promise.resolve(hook)
  }

  const accountService = hook.app.getService('account')
  return accountService.options.notifier('resendVerifySignup', hook.result)
    .then(result => {
      return hook
    })
}

export function sendInvitationEmail (hook) {
  // Before because we need to send the clear password by email
  if (hook.type !== 'before') {
    throw new Error('The \'sendInvitationEmail\' hook should only be used as a \'before\' hook.')
  }

  const accountService = hook.app.getService('account')
  return accountService.options.notifier('sendInvitation', hook.data)
    .then(result => {
      return hook
    })
}

export function addVerification (hook) {
  const accountService = hook.app.getService('account')

  return verifyHooks.addVerification(accountService.getPath(true))(hook)
    .then(hook => {
    // Check for OAuth2 providers
      let isVerified = false
      for (const provider of hook.app.authenticationProviders) {
        if (hook.data[provider + 'Id']) isVerified = true
      }
      hook.data.isVerified = isVerified
      return hook
    })
}

export function removeVerification (hook) {
  return verifyHooks.removeVerification()(hook)
}

export function unregisterDevices (hook) {
  debug('Unregistering devices for user ', hook.params.user)
  const pusherService = hook.app.getService('pusher')
  const user = hook.params.user
  // Process with each registered device
  const unregisterPromises = []
  if (user.devices) {
    user.devices.forEach(device => {
      unregisterPromises.push(
        pusherService.remove(device.registrationId,
          {
            query: { action: 'device' },
            user: hook.params.user
          })
      )
    })
  }
  return Promise.all(unregisterPromises)
    .then(results => hook)
}
