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
    registerDevice (device, user) {
      return new Promise((resolve, reject) => {
        let application = this.getSnsApplication(device.platform)
        if (!application) {
          reject(new Error('Cannot register device ' + device.registrationId + ' because there is no platform application for ' + device.platform))
          return
        }
        let userService = app.getService('users')
        // Check if already registered
        let devices = user.devices || []
        if (_.find(devices, userDevice => userDevice.registrationId === device.registrationId)) {
          debug('Already registered device ' + device.registrationId + ' with ARN ' + device.arn + ' for user ' + user._id.toString())
          resolve(device.arn)
          return
        }
        application.addUser(device.registrationId, '', (err, endpointArn) => {
          if (err) {
            reject(err)
          } else {
            // Register new user device
            devices.push(Object.assign({ arn: endpointArn }, device))
            debug('Registered device ' + device.registrationId + ' with ARN ' + endpointArn + ' for user ' + user._id.toString())
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
        let device = _.find(devices, device => device.registrationId === deviceId)
        if (!device) {
          resolve()
          return
        }
        let application = this.getSnsApplication(device.platform)
        if (!application) {
          reject(new Error('Cannot unregister device ' + device.registrationId + ' because there is no platform application for ' + device.platform))
          return
        }
        application.deleteUser(device.arn, (err) => {
          if (err) {
            reject(err)
          } else {
            devices = _.remove(devices, userDevice => userDevice.registrationId === deviceId)
            debug('Unregistered device ' + device.registrationId + ' with ARN ' + device.arn + ' for user ' + user._id.toString())
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
              debug('Created topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform)
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
          const topicArn = _.get(object, topicField + '.' + application.platform)
          application.publishToTopic(topicArn, { default: message }, (err, messageId) => {
            if (err) {
              reject(err)
            } else {
              debug('Published message ' + messageId + ' to topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform + ': ' + message)
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
          const topicArn = _.get(object, topicField + '.' + application.platform)
          application.deleteTopic(topicArn, (err) => {
            if (err) {
              reject(err)
            } else {
              debug('Removed topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform)
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
                const topicArn = _.get(object, topicField + '.' + application.platform)
                application.subscribeWithProtocol(device.arn, topicArn, 'application', (err, subscriptionArn) => {
                  if (err) {
                    reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                  } else {
                    debug('Subscribed device ' + device.registrationId + ' with ARN ' + device.arn + ' to application topic with ARN ' + topicArn)
                    // Register for SMS as well
                    if (device.number) {
                      application.subscribeWithProtocol(device.number, topicArn, 'sms', (err, smsSubscriptionArn) => {
                        if (err) {
                          reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                        } else {
                          debug('Subscribed device number  ' + device.number + ' with ARN ' + device.arn + ' to SMS topic with ARN ' + topicArn)
                          resolve({
                            [device.registrationId]: { user: user._id, arn: subscriptionArn },
                            [device.number]: { user: user._id, arn: smsSubscriptionArn }
                          })
                        }
                      })
                    } else {
                      resolve({ [device.registrationId]: { user: user._id, arn: subscriptionArn } })
                    }
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
          const topicArn = _.get(object, topicField + '.' + application.platform)
          application.getSubscriptions(topicArn, (err, subscriptions) => {
            if (err) {
              reject(err)
            } else {
              debug('Retrieved subscriptions for topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform)
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
                // check for number as well for SMS subscriptions
                if ((device.arn === subscription.Endpoint) || (device.number === subscription.Endpoint)) {
                  unsubscriptionPromises.push(new Promise((resolve, reject) => {
                    let application = this.getSnsApplication(device.platform)
                    const topicArn = _.get(object, topicField + '.' + application.platform)
                    application.unsubscribe(subscription.SubscriptionArn, (err) => {
                      if (err) {
                        reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                      } else {
                        debug('Unsubscribed device ' + device.registrationId + ' with ARN ' + device.arn + ' from topic with ARN ' + topicArn)
                        resolve({ [device.registrationId]: { user: user._id, arn: subscription.SubscriptionArn } })
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
      debug(`pusher service called for create action=${data.action}`, data)

      switch (data.action) {
        case 'device':
          return this.registerDevice(data.device, params.user)
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
      debug(`pusher service called for remove action=${query.action}`, params)

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
