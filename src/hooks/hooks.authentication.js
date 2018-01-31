import makeDebug from 'debug'
const debug = makeDebug('kalisio:kNotify:authentication:hooks')

export function verifyGuest (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'verifyGuest' hook should only be used as a 'after' hook.`)
  }
  let user = hook.params.user
  // Check whether the user has been inivted. If not, nothing to do
  if (! user.sponsor) return hook
  // Check whether has been already verified. If yes, nothing to do
  if (user.isVerified) return hook
  // The user is a guest and need to be verified
  let userService = hook.app.getService('users')
  return userService.patch(user._id, { 'isVerified' : true })
  .then(user => hook)
}