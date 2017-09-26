import _ from 'lodash'
import SNS from 'sns-mobile'
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kNotify:pusher')

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
          resolve(device.endpoint)
          return
        }
        application.addUser(deviceId, '', (err, endpointArn) => {
          if (err) {
            reject(err)
          } else {
            // Register new user device
            let device = { platform: devicePlatform, id: deviceId, endpoint: endpointArn }
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
        application.deleteUser(device.endpoint, (err) => {
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
    // Used to perform service actions such as create a user, a push notification, a topic, etc.
    create (data, params) {
      debug(`pusher service called for create action=${data.action}`)

      switch (data.action) {
        case 'device':
          return this.registerDevice(data.deviceId, data.devicePlatform, params.user)
        case 'topic':
          break
        case 'topicMessage':
          snsApplications.forEach(application => {
            application.publishToTopic(data[application.platform], data.message)
          })
          break
      }
    },
    // Used to perform service actions such as remove a user, a topic, etc.
    remove (id, params) {
      debug(`pusher service called for remove action=${params.action}`)

      switch (params.action) {
        case 'device':
          return this.unregisterDevice(id, params.user)
      }
    }
  }
}
