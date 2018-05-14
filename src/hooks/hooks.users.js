import makeDebug from 'debug'
import generatePassword from 'password-generator'
const verifyHooks = require('feathers-authentication-management').hooks
const debug = makeDebug('kalisio:kNotify:users:hooks')

export function sendVerificationEmail (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendVerificationEmail' hook should only be used as a 'after' hook.`)
  }

  // Check for by-passing OAuth2 providers
  for (let provider of hook.app.authenticationProviders) {
    if (hook.result[provider + 'Id']) return Promise.resolve(hook)
  }

  let accountService = hook.app.getService('account')
  return accountService.options.notifier('resendVerifySignup', hook.result)
  .then(result => {
    return hook
  })
}

export function sendInvitationEmail (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'sendInvitationEmail' hook should only be used as a 'before' hook.`)
  }
  // Generate a password
  let passwordRule = new RegExp('[\\w\\d\\?\\-]')
  hook.data.password = generatePassword(15, false, passwordRule)
  // Send the invitation mail
  let accountService = hook.app.getService('account')
  return accountService.options.notifier('sendInvitation', hook.data)
  .then(result => {
    return hook
  })
}

export function addVerification (hook) {
  let accountService = hook.app.getService('account')

  return verifyHooks.addVerification(accountService.getPath(true))(hook)
  .then(hook => {
    // Check for OAuth2 providers
    let isVerified = false
    for (let provider of hook.app.authenticationProviders) {
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
  let pusherService = hook.app.getService('pusher')
  let user = hook.params.user
  // Process with each registered device
  let unregisterPromises = []
  if (user.devices) {
    user.devices.forEach(device => {
      unregisterPromises.push(
        pusherService.remove(device.registrationId,
          { query: { action: 'device' },
            user: hook.params.user
          })
      )
    })
  }
  return Promise.all(unregisterPromises)
  .then(results => hook)
}
