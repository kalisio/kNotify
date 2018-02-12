import makeDebug from 'debug'
import _ from 'lodash'
import { getItems } from 'feathers-hooks-common'
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

export async function createTopic (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'createTopic' hook should only be used as a 'before' hook.`)
  }

  let pusherService = hook.app.getService('pusher')
  hook.result = await pusherService.create(
    { action: 'topic' }, {
    pushObject: hook.result,
    pushObjectService: hook.service
  })
  debug('Added topic to object ' + hook.result._id.toString() + ' from service ' + hook.service.path)
  return hook
}

export async function removeTopic (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'removeTopic' hook should only be used as a 'before' hook.`)
  }
  
  let pusherService = hook.app.getService('pusher')
  await pusherService.remove(hook.result._id.toString(), {
    query: { action: 'topic' },
    pushObject: hook.result,
    pushObjectService: hook.service,
    patch: hook.method !== 'remove' // Do not patch object when it is deleted
  })
  debug('Removed topic on object ' + hook.result._id.toString() + ' from service ' + hook.service.path)
  return hook
}

export async function subscribeSubjectsToResourceTopic (hook) {
  if (!hook.params.resource || !hook.params.resource.topics) return Promise.resolve(hook)

  let pusherService = hook.app.getService('pusher')
  await pusherService.create(
    { action: 'subscriptions' }, {
      pushObject: hook.params.resource,
      pushObjectService: hook.params.resourcesService,
      users: hook.params.subjects
  })
  debug('Subscribed users on topic object ' + hook.params.resource._id.toString() + ' from service ' + (hook.params.resourcesService.path || hook.params.resourcesService.name), hook.params.subjects)
  return hook
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
    debug('Unsubscribed users on topic object ' + hook.params.resource._id.toString() + ' from service ' + (hook.params.resourcesService.path || hook.params.resourcesService.name), hook.params.subjects)
    return hook
  })
}

export function updateSubjectSubscriptions (field, service, filter) {
  return async function (hook) {
    function isTopicEqual(topic1, topic2) {
      return topic1.arn === topic2.arn
    }

    let item = getItems(hook)
    let topics = _.get(item, field)
    if (!topics) {
      return Promise.resolve(hook)
    }
    
    // Service can be contextual, look for context on initiator service
    const itemService = hook.app.getService(service, hook.service.context)
    let pusherService = hook.app.getService('pusher')
    topics = (Array.isArray(topics) ? topics : [topics])
    // Retrieve previous version of the item
    let previousTopics = _.get(hook.params.previousItem, field)
    if (previousTopics) {
      previousTopics = (Array.isArray(previousTopics) ? previousTopics : [previousTopics])
      // Find common topics
      const commonTopics = _.intersectionWith(topics, previousTopics, isTopicEqual)
      // Unsubscribe removed topics
      let removedTopics = _.pullAllWith(previousTopics, commonTopics, isTopicEqual)
      // Apply filter if any
      if (typeof filter === 'function') {
        removedTopics = filter('unsubscribe', removedTopics)
      }
      debug('Removing topic subscriptions for object ' + item._id.toString(), removedTopics, hook.params.user)
      const unsubscribePromises = removedTopics.map(topic => pusherService.remove(topic._id.toString(), {
        query: { action: 'subscriptions' },
        pushObject: topic,
        pushObjectService: itemService,
        users: [hook.params.user]
      }))
      // And subscribe new ones
      let addedTopics = _.pullAllWith(topics, commonTopics, isTopicEqual)
      // Apply filter if any
      if (typeof filter === 'function') {
        addedTopics = filter('subscribe', addedTopics)
      }
      debug('Adding topic subscriptions for object ' + item._id.toString(), addedTopics, hook.params.user)
      const subscribePromises = addedTopics.map(topic => pusherService.create(
      { action: 'subscriptions' }, {
        pushObject: topic,
        pushObjectService: itemService,
        users: [hook.params.user]
      }))
      await Promise.all(unsubscribePromises.concat(subscribePromises))
    } else {
      // Subscribed new topics
      debug('Adding topic subscriptions for object ' + item._id.toString(), topics, hook.params.user)
      // Apply filter if any
      if (typeof filter === 'function') {
        topics = filter('subscribe', topics)
      }
      const subscribePromises = topics.map(topic => pusherService.create(
      { action: 'subscriptions' }, {
        pushObject: topic,
        pushObjectService: itemService,
        users: [hook.params.user]
      }))
      await Promise.all(subscribePromises)
    }
    
    return hook
  }
}

