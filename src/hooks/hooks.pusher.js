// import makeDebug from 'debug'
import { hooks } from 'kCore'
// const debug = makeDebug('kalisio:kNotify:pusher:hooks')

export function populatePushObject (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'populatePushObject' hook should only be used as a 'before' hook.`)
  }

  // This hook is only for some of the operations
  let action = ''
  if (hook.data) {
    action = hook.data.action
  } else if (hook.params && hook.params.query) {
    action = hook.params.query.action
  }

  if (action === 'device') return Promise.resolve(hook)
  else return hooks.populateObject({ serviceField: 'pushObjectService', idField: 'pushObject', throwOnNotFound: true })(hook)
}
