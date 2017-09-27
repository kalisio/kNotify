import _ from 'lodash'
import { GeneralError } from 'feathers-errors'
import SNS from 'sns-mobile'
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kNotify:pusher')
const defaultTopicField = 'topics'

export default function (name, app, options) {
  const config = app.get('pusher')
  // Instanciate a SNS interface for each platform found in config
  let snsApplications = []
  _.forOwn(config.platforms, (platformArn, platform) => {
    const snsConfig = Object.assign({
      platform,
      platformApplicationArn: platformArn
    }, _.omit(config, ['platforms']))
    let snsApplication = new SNS(snsConfig)
    debug('SNS application created with config ', snsConfig)
    snsApplications.push(snsApplication)
  })
  return {
    // Used to retrieve the underlying interface for a platform
    getSnsApplication (platform) {
      return _.find(snsApplications, application => application.platform === platform)
    },
    registerDevice (deviceId, devicePlatform, user) {
      return new Promise((resolve, reject) => {
        let application = this.getSnsApplication(devicePlatform)
        if (!application) {
          reject(new Error('Cannot register device ' + deviceId + ' because there is no platform application for ' + devicePlatform))
          return
        }
        let userService = app.getService('users')
        // Check if already registered
        let devices = user.devices || []
        let device = _.find(user.devices, device => device.id === deviceId)
        if (device) {
          resolve(device.arn)
          return
        }
        application.addUser(deviceId, '', (err, endpointArn) => {
          if (err) {
            reject(err)
          } else {
            // Register new user device
            let device = { platform: devicePlatform, id: deviceId, arn: endpointArn }
            devices.push(device)
            resolve(
              userService.patch(user._id, { devices })
              .then(user => device)
            )
          }
        })
      })
    },
    unregisterDevice (deviceId, user) {
      return new Promise((resolve, reject) => {
        let userService = app.getService('users')
        // Check if already registered
        let devices = user.devices || []
        let device = _.find(user.devices, device => device.id === deviceId)
        if (!device) {
          resolve()
          return
        }
        let application = this.getSnsApplication(device.platform)
        if (!application) {
          reject(new Error('Cannot register device ' + deviceId + ' because there is no platform application for ' + device.platform))
          return
        }
        application.deleteUser(device.arn, (err) => {
          if (err) {
            reject(err)
          } else {
            devices = _.remove(devices, device => device.id === deviceId)
            resolve(
              userService.patch(user._id, { devices })
              .then(user => device)
            )
          }
        })
      })
    },
    createPlatformTopics (object, service, topicField) {
      // Process with each registered platform
      let topicPromises = []
      snsApplications.forEach(application => {
        topicPromises.push(new Promise((resolve, reject) => {
          // The topic name will be the object ID
          application.createTopic(object._id.toString(), (err, topicArn) => {
            if (err) {
              reject(err)
            } else {
              resolve({ [application.platform]: topicArn })
            }
          })
        }))
      })
      return Promise.all(topicPromises)
      .then(results => results.reduce((topics, topic) => Object.assign(topics, topic), {}))
      .then(topics => service.patch(object._id, { [topicField]: topics }))
    },
    publishToPlatformTopics (object, message, topicField) {
      // Process with each registered platform
      let messagePromises = []
      snsApplications.forEach(application => {
        messagePromises.push(new Promise((resolve, reject) => {
          application.publishToTopic(_.get(object, topicField + '.' + application.platform), { default: message }, (err, messageId) => {
            if (err) {
              reject(err)
            } else {
              resolve({ [application.platform]: messageId })
            }
          })
        }))
      })
      return Promise.all(messagePromises)
      .then(results => results.reduce((messageIds, messageId) => Object.assign(messageIds, messageId), {}))
    },
    removePlatformTopics (object, service, topicField) {
      // Process with each registered platform
      let topicPromises = []
      snsApplications.forEach(application => {
        topicPromises.push(new Promise((resolve, reject) => {
          application.deleteTopic(_.get(object, topicField + '.' + application.platform), (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(_.get(object, topicField + '.' + application.platform))
            }
          })
        }))
      })
      return Promise.all(topicPromises)
      .then(_ => service.patch(object._id, { [topicField]: null }))
    },
    createPlatformSubscriptions (object, users, topicField) {
      // Process with each registered platform
      let subscriptionPromises = []
      snsApplications.forEach(application => {
        // Then each target user
        users.forEach(user => {
          let devices = user.devices || []
          // Then each target device
          devices.forEach(device => {
            if (device.platform === application.platform) {
              subscriptionPromises.push(new Promise((resolve, reject) => {
                // The topic name will be the object ID
                application.subscribe(device.arn, _.get(object, topicField + '.' + application.platform), (err, subscriptionArn) => {
                  if (err) {
                    reject(new GeneralError(err, { [device.id]: { user: user._id } }))
                  } else {
                    resolve({ [device.id]: { user: user._id, arn: subscriptionArn } })
                  }
                })
              }))
            }
          })
        })
      })
      // We should be tolerent to faulty subscriptions
      return Promise.all(subscriptionPromises.map(promise => promise.catch(error => error)))
      .then(results => results.reduce((subscriptions, subscription) => Object.assign(subscriptions, subscription), {}))
    },
    removePlatformSubscriptions (object, users, topicField) {
      // First get all subscribers of the topic because we do not store them
      // Process with each registered platform
      let subscriptionPromises = []
      snsApplications.forEach(application => {
        subscriptionPromises.push(new Promise((resolve, reject) => {
          // The topic name will be the object ID
          application.getSubscriptions(_.get(object, topicField + '.' + application.platform), (err, subscriptions) => {
            if (err) {
              reject(err)
            } else {
              resolve(subscriptions)
            }
          })
        }))
      })
      return Promise.all(subscriptionPromises)
      .then(platformSubscriptions => {
        let unsubscriptionPromises = []
        // Process with each registered platform
        platformSubscriptions.forEach(subscriptions => {
          // Remove the given subscribers from the topic
          subscriptions.forEach(subscription => {
            users.forEach(user => {
              let devices = user.devices || []
              devices.forEach(device => {
                if (device.arn === subscription.Endpoint) {
                  unsubscriptionPromises.push(new Promise((resolve, reject) => {
                    this.getSnsApplication(device.platform).unsubscribe(subscription.SubscriptionArn, (err) => {
                      if (err) {
                        reject(new GeneralError(err, { [device.id]: { user: user._id } }))
                      } else {
                        resolve({ [device.id]: { user: user._id, arn: subscription.SubscriptionArn } })
                      }
                    })
                  }))
                }
              })
            })
          })
          return Promise.all(unsubscriptionPromises)
        })
      })
    },
    // Used to perform service actions such as create a user, a push notification, a topic, etc.
    create (data, params) {
      debug(`pusher service called for create action=${data.action}`)

      switch (data.action) {
        case 'device':
          return this.registerDevice(data.deviceId, data.devicePlatform, params.user)
        case 'topic':
          return this.createPlatformTopics(params.pushObject, params.pushObjectService, data.topicField || defaultTopicField)
        case 'subscriptions':
          return this.createPlatformSubscriptions(params.pushObject, params.users, data.topicField || defaultTopicField)
        case 'message':
          return this.publishToPlatformTopics(params.pushObject, data.message, data.topicField || defaultTopicField)
      }
    },
    // Used to perform service actions such as remove a user, a topic, etc.
    remove (id, params) {
      const query = params.query
      debug(`pusher service called for remove action=${query.action}`)

      switch (query.action) {
        case 'device':
          return this.unregisterDevice(id, params.user)
        case 'topic':
          return this.removePlatformTopics(params.pushObject, params.pushObjectService, query.topicField || defaultTopicField)
        case 'subscriptions':
          return this.removePlatformSubscriptions(params.pushObject, params.users, query.topicField || defaultTopicField)
      }
    }
  }
}
