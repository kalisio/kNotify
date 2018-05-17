import makeDebug from 'debug'
const debug = makeDebug('kalisio:kNotify:authentication:hooks')

export async function verifyGuest (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'verifyGuest' hook should only be used as a 'after' hook.`)
  }
  let app = hook.app
  let user = hook.params.user
  debug('verifyGuest hook called on ', user._id)

  // Check whether the user has been inivted. If not, nothing to do
  if (!user.sponsor) {
    debug('Logged user is not a guest')
    return hook
  }

  // Check whether has been already verified. If yes, nothing to do
  if (user.isVerified) {
    debug('Logged guest is already verified')
    return hook
  }

  // The user is a guest and need to be verified
  debug('Verifying logged guest')
  let userService = app.getService('users')
  await userService.patch(user._id, { isVerified: true })

  return hook
}

export async function consentGuest (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'consentGuest' hook should only be used as a 'after' hook.`)
  }
  let app = hook.app
  let user = hook.params.user
  debug('consentGuest hook called on ', user._id)

  // Check whether the user has been inivted. If not, nothing to do
  if (!user.sponsor) {
    debug('Logged user is not a guest')
    return hook
  }

  // Check whether consent has been already checked. If yes, nothing to do
  if (user.isVerified) {
    debug('Logged guest is already verified')
    return hook
  }

  // The user is a guest and need to be verified
  debug('Consenting logged guest')
  let userService = app.getService('users')
  await userService.patch(user._id, { consentTerms: true, expireAt: null })

  return hook
}

