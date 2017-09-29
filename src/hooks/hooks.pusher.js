import makeDebug from 'debug'
import { hooks } from 'kCore'
const debug = makeDebug('kalisio:kNotify:pusher:hooks')

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

export function createTopic (hook) {
  let pusherService = hook.app.getService('pusher')
  return pusherService.create(
    { action: 'topic' }, {
    pushObject: hook.result,
    pushObjectService: hook.service
  })
  .then(result => {
    debug('Added topic to object ' + hook.result._id.toString() + ' from service ' + hook.service.path)
    return hook
  })
}

export function removeTopic (hook) {
  let pusherService = hook.app.getService('pusher')
  return pusherService.remove(hook.result._id.toString(), {
    query: { action: 'topic' },
    pushObject: hook.result,
    pushObjectService: hook.service
  })
  .then(result => {
    debug('Removed topic on object ' + hook.result._id.toString() + ' from service ' + hook.service.path)
    return hook
  })
}

export function subscribeSubjectsToResourceTopic (hook) {
  if (!hook.params.resource || !hook.params.resource.topics) return Promise.resolve(hook)

  let pusherService = hook.app.getService('pusher')
  return pusherService.create(
    { action: 'subscriptions' }, {
    pushObject: hook.params.resource,
    pushObjectService: hook.params.resourcesService,
    users: hook.params.subjects
  })
  .then(result => {
    debug('Subscribed users on topic object ' + hook.params.resource._id.toString() + ' from service ' + (hook.params.resourcesService.path || hook.params.resourcesService.name))
    return pusherService.create({
      action: 'message',
      message: 'New user added'
    }, {
      pushObject: hook.params.resource,
      pushObjectService: hook.params.resourcesService
    })
  })
  .then(_ => hook)
}

export function unsubscribeSubjectsFromResourceTopic (hook) {
  if (!hook.params.resource || !hook.params.resource.topics) return Promise.resolve(hook)
  
  let pusherService = hook.app.getService('pusher')
  return pusherService.remove(hook.params.resource._id.toString(), {
    query: { action: 'subscriptions' },
    pushObject: hook.params.resource,
    pushObjectService: hook.params.resourcesService,
    users: hook.params.subjects
  })
  .then(result => {
    debug('Unsubscribed users on topic object ' + hook.params.resource._id.toString() + ' from service ' + (hook.params.resourcesService.path || hook.params.resourcesService.name))
    return hook
  })
}

