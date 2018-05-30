import _ from 'lodash'
import moment from 'moment'
import { GeneralError } from 'feathers-errors'
import SNS from 'sns-mobile'
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kNotify:pusher:service')
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
      return _.find(snsApplications, application => application.platform === platform.toUpperCase())
    },
    getMessagePayload (message, platform) {
      // Transform in internal data structure if only a string is given
      if (typeof message === 'string') {
        message = { title: message, body: message }
      }
      // Add SMS protocol target in case we have some phone numbers registered to the topic
      let jsonMessage = { default: message.title, sms: message.body }
      // For stacking we need a unique increasing ID per notification on Android
      let notId = 1
      if (message.createdAt && message.updatedAt) {
        // Use the difference in seconds between creation/update time
        if (moment.isMoment(message.createdAt) && moment.isMoment(message.updatedAt)) {
          notId = message.updatedAt.diff(message.createdAt, 'seconds')
        } else if (message.createdAt instanceof Date && message.updatedAt instanceof Date) {
          notId = (message.updatedAt.getTime() - message.createdAt.getTime()) / 1000
        } else {
          // Assume strings
          notId = (new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime()) / 1000
        }
      }
      if (platform === SNS.SUPPORTED_PLATFORMS.IOS) {
        // iOS
        let data = {
          alert: message.title,
          notId
        }
        if (message.sound) data.sound = message.sound
        jsonMessage.APNS = JSON.stringify({ data })
      } else {
        // ANDROID
        let data = {
          title: message.title,
          message: message.body,
          notId
        }
        if (message.sound) data.soundname = message.sound
        if (message.vibration) data.vibrationPattern = message.vibration
        jsonMessage.GCM = JSON.stringify({ data })
      }
      return jsonMessage
    },
    createDevice (device, user) {
      return new Promise((resolve, reject) => {
        let application = this.getSnsApplication(device.platform)
        if (!application) {
          reject(new Error('Cannot register device ' + device.registrationId + ' because there is no platform application for ' + device.platform))
          return
        }
        // Check if already registered
        let devices = user.devices || []
        const previousDevice = _.find(devices, userDevice => userDevice.registrationId === device.registrationId)
        if (previousDevice) {
          debug('Already registered device ' + previousDevice.registrationId + ' with ARN ' + previousDevice.arn + ' for user ' + user._id.toString())
          resolve(device.arn)
          return
        }
        application.addUser(device.registrationId, '', (err, endpointArn) => {
          if (err) reject(err)
          else {
            debug('Registered device ' + device.registrationId + ' with ARN ' + endpointArn + ' for user ' + user._id.toString())
            resolve(endpointArn)
          }
        })
      })
    },
    removeDevice (registrationId, user) {
      return new Promise((resolve, reject) => {
        // Check if already registered
        let devices = user.devices || []
        let device = _.find(devices, device => device.registrationId === registrationId)
        if (!device) {
          resolve()
          return
        }
        let application = this.getSnsApplication(device.platform)
        if (!application) {
          reject(new Error('Cannot unbind device ' + device.registrationId + ' because there is no platform application for ' + device.platform))
          return
        }
        application.deleteUser(device.arn, (err) => {
          if (err) reject(err)
          else {
            debug('Unregistered device ' + device.registrationId + ' with ARN ' + device.arn + ' for user ' + user._id.toString())
            resolve(device)
          }
        })
      })
    },
    publishToDevices (user, message) {
      // Process with each registered platform
      let messagePromises = []
      const devices = user.devices || []
      devices.forEach(device => {
        let application = this.getSnsApplication(device.platform)
        messagePromises.push(new Promise((resolve, reject) => {
          if (!application) {
            reject(new Error('Cannot send message to device ' + device.registrationId + ' because there is no platform application for ' + device.platform))
            return
          }
          const jsonMessage = this.getMessagePayload(message, application.platform)
          application.sendMessage(device.arn, jsonMessage, (err, messageId) => {
            if (err) {
              // Be tolerant to SNS errors because some endpoints might have been revoked
              // reject(err)
              debug('Unable to publish message to device ' + device.registrationId + ' with ARN ' + device.arn + ' for platform ' + application.platform, jsonMessage, err)
              resolve({ [application.platform]: null })
            } else {
              debug('Published message ' + messageId + ' to device ' + device.registrationId + ' with ARN ' + device.arn + ' for platform ' + application.platform, jsonMessage)
              resolve({ [application.platform]: messageId })
            }
          })
        }))
      })
      return Promise.all(messagePromises)
      .then(results => results.reduce((messageIds, messageId) => Object.assign(messageIds, messageId), {}))
    },
    async createPlatformTopics (object, service, topicField, patch = true) {
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
      let results = await Promise.all(topicPromises)
      let topics = results.reduce((topics, topic) => Object.assign(topics, topic), {})
      if (patch) {
        return service.patch(object._id, { [topicField]: topics })
      } else {
        return topics
      }
    },
    publishToPlatformTopics (object, message, topicField) {
      // Process with each registered platform
      let messagePromises = []
      snsApplications.forEach(application => {
        messagePromises.push(new Promise((resolve, reject) => {
          const topicArn = _.get(object, topicField + '.' + application.platform)
          const jsonMessage = this.getMessagePayload(message, application.platform)
          application.publishToTopic(topicArn, jsonMessage, (err, messageId) => {
            if (err) {
              reject(err)
            } else {
              debug('Published message ' + messageId + ' to topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform, jsonMessage)
              resolve({ [application.platform]: messageId })
            }
          })
        }))
      })
      return Promise.all(messagePromises)
      .then(results => results.reduce((messageIds, messageId) => Object.assign(messageIds, messageId), {}))
    },
    async removePlatformTopics (object, service, topicField, patch = true) {
      // First get all subscribers of the topic because we do not store them
      // Process with each registered platform
      let platformSubscriptions = await this.getPlatformSubscriptions(object, topicField)
      // Process with each registered platform
      let unsubscriptionPromises = []
      let topicPromises = []
      snsApplications.forEach((application, i) => {
        const topicArn = _.get(object, topicField + '.' + application.platform)
        // Unsubscribe all users
        platformSubscriptions[i].forEach(subscription => {
          unsubscriptionPromises.push(new Promise((resolve, reject) => {
            application.unsubscribe(subscription.SubscriptionArn, (err) => {
              if (err) {
                reject(new GeneralError(err, { arn: subscription.SubscriptionArn }))
              } else {
                debug('Unsubscribed device with ARN ' + subscription.SubscriptionArn + ' from topic with ARN ' + topicArn)
                resolve({ arn: subscription.SubscriptionArn })
              }
            })
          }))
        })
        // Then delete topic
        topicPromises.push(new Promise((resolve, reject) => {
          application.deleteTopic(topicArn, (err) => {
            if (err) {
              reject(err)
            } else {
              debug('Removed topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform)
              resolve(topicArn)
            }
          })
        }))
      })
      await Promise.all(unsubscriptionPromises)
      let topicArns = await Promise.all(topicPromises)
      if (patch) {
        return service.patch(object._id, { [topicField]: null })
      } else {
        return topicArns
      }
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
            if (device.platform.toUpperCase() === application.platform) {
              subscriptionPromises.push(new Promise((resolve, reject) => {
                const topicArn = _.get(object, topicField + '.' + application.platform)
                application.subscribeWithProtocol(device.arn, topicArn, 'application', (err, subscriptionArn) => {
                  if (err) {
                    // Be tolerant to SNS errors because some endpoints might have been revoked
                    // reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                    debug('Unable to subscribe device ' + device.registrationId + ' with ARN ' + device.arn + ' to application topic with ARN ' + topicArn, err)
                    resolve({ [device.registrationId]: { user: user._id, arn: null } })
                  } else {
                    debug('Subscribed device ' + device.registrationId + ' with ARN ' + device.arn + ' to application topic with ARN ' + topicArn)
                    // Register for SMS as well
                    if (device.number) {
                      application.subscribeWithProtocol(device.number, topicArn, 'sms', (err, smsSubscriptionArn) => {
                        if (err) {
                          // Be tolerant to SNS errors because some endpoints might have been revoked
                          // reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                          debug('Unable to subscribe device number ' + device.number + ' with ARN ' + device.arn + ' to application topic with ARN ' + topicArn, err)
                          resolve({ [device.registrationId]: { user: user._id, arn: subscriptionArn } })
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
      // FIXME: We should be tolerent to faulty subscriptions > maybe better to adress errors specifically like above
      // return Promise.all(subscriptionPromises.map(promise => promise.catch(error => console.log(error))))
      // .then(results => results.reduce((subscriptions, subscription) => Object.assign(subscriptions, subscription), {}))
      return Promise.all(subscriptionPromises)
    },
    getPlatformSubscriptions (object, topicField) {
      let subscriptionPromises = []
      snsApplications.forEach(application => {
        subscriptionPromises.push(new Promise((resolve, reject) => {
          const topicArn = _.get(object, topicField + '.' + application.platform)
          application.getSubscriptions(topicArn, (err, subscriptions) => {
            if (err) {
              reject(err)
            } else {
              debug('Retrieved ' + subscriptions.length + ' subscriptions for topic ' + object._id.toString() + ' with ARN ' + topicArn + ' for platform ' + application.platform)
              resolve(subscriptions)
            }
          })
        }))
      })
      return Promise.all(subscriptionPromises)
    },
    removePlatformSubscriptions (object, users, topicField) {
      // First get all subscribers of the topic because we do not store them
      // Process with each registered platform
      return this.getPlatformSubscriptions(object, topicField)
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
                        // Be tolerant to SNS errors because some endpoints might have been revoked
                        // reject(new GeneralError(err, { [device.registrationId]: { user: user._id } }))
                        debug('Unable to unsubscribe device ' + device.registrationId + ' with ARN ' + device.arn + ' from topic with ARN ' + topicArn, err)
                        resolve({ [device.registrationId]: { user: user._id, arn: null } })
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
        })
        // FIXME: We should be tolerent to faulty unsubscriptions > maybe better to adress errors specifically like above
        // return Promise.all(unsubscriptionPromises.map(promise => promise.catch(error => console.log(error))))
        // .then(results => results.reduce((unsubscriptions, unsubscription) => Object.assign(unsubscriptions, unsubscription), {}))
        return Promise.all(unsubscriptionPromises)
      })
    },
    // Used to perform service actions such as create a user, a push notification, a topic, etc.
    create (data, params) {
      debug(`pusher service called for create action=${data.action}`)

      switch (data.action) {
        case 'device':
          // return this.registerDevice(data.device, params.user, params.patch)
          return this.createDevice(data.device, params.user)
        case 'topic':
          return this.createPlatformTopics(params.pushObject, params.pushObjectService, data.topicField || defaultTopicField, params.patch)
        case 'subscriptions':
          return this.createPlatformSubscriptions(params.pushObject, params.users, data.topicField || defaultTopicField)
        case 'message': {
          const topicField = data.topicField || defaultTopicField
          // If no topic we assume we want to publish on specific devices
          return _.get(params.pushObject, topicField)
            ? this.publishToPlatformTopics(params.pushObject, data.message, topicField)
            : this.publishToDevices(params.pushObject, data.message)
        }
      }
    },
    // Used to perform service actions such as remove a user, a topic, etc.
    remove (id, params) {
      const query = params.query
      debug(`pusher service called for remove action=${query.action}`)

      switch (query.action) {
        case 'device':
          // return this.unregisterDevice(id, params.user, params.patch)
          return this.removeDevice(id, params.user)
        case 'topic':
          return this.removePlatformTopics(params.pushObject, params.pushObjectService, query.topicField || defaultTopicField, params.patch)
        case 'subscriptions':
          return this.removePlatformSubscriptions(params.pushObject, params.users, query.topicField || defaultTopicField)
      }
    }
  }
}
