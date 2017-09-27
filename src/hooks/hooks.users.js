import makeDebug from 'debug'
const verifyHooks = require('feathers-authentication-management').hooks
const debug = makeDebug('kalisio:kNotify:users:hooks')

export function sendVerificationEmail (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'sendVerificationEmail' hook should only be used as a 'after' hook.`)
  }

  // Check for by-passing
  if (hook.params.noVerificationEmail) return Promise.resolve(hook)

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

export function registerDevice (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'registerDevice' hook should only be used as a 'after' hook.`)
  }

  // check if registered from mobile app
  if (!hook.data.deviceId || !hook.data.devicePlatform) return Promise.resolve(hook)

  let app = hook.app
  return app.passport.verifyJWT(hook.result.accessToken, { secret: app.get('authentication').secret })
  .then(data => {
    let userService = app.getService('users')
    return userService.get(data.userId)
  })
  .then(user => {
    debug('Registering device for user ', user)
    let pusherService = app.getService('pusher')
    return pusherService.create({ action: 'device', deviceId: hook.data.deviceId, devicePlatform: hook.data.devicePlatform }, { user })
  })
  .then(result => hook)
}

export function unregisterDevices (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'unregisterDevices' hook should only be used as a 'before' hook.`)
  }

  debug('Unregistering devices for user ', hook.params.user)
  let pusherService = hook.app.getService('pusher')
  let user = hook.params.user
  // Process with each registered device
  let unregisterPromises = []
  user.devices.forEach(device => {
    unregisterPromises.push(pusherService.remove(device.id, { query: { action: 'device' }, user: hook.params.user }))
  })

  return Promise.all(unregisterPromises)
  .then(results => hook)
}
