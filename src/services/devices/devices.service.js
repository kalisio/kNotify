import makeDebug from 'debug'
import _ from 'lodash'

const debug = makeDebug('kalisio:kNotify:devices:service')

export default function (name, app, options) {
    // Keep track of config
  Object.assign(options, app.get('devices'))
  debug('devices service created with config ', options)
  return {
    findDeviceByUuid (device, user) {
      const devices = user.devices || []
      // Input could be a device object or an ID
      const uuid = (typeof device === 'string' ? device : device.uuid)
      return _.find(devices, { uuid })
    },
    findDeviceByRegistrationId (device, user) {
      const devices = user.devices || []
      // Input could be a device object or an ID
      const registrationId = (typeof device === 'string' ? device : device.registrationId)
      return _.find(devices, { registrationId })
    },
    isDeviceRegistered (device, user) {
      // Find existing device if any
      const previousDevice = this.findDeviceByUuid(device, user)
      if (previousDevice) {
        return (previousDevice.registrationId === device.registrationId)
      } else {
        return false
      }
    },
    async update (id, data, params) {
      // id: registrationId
      // data: device
      debug('Devices service call for update', id, data)
      const usersService = app.getService('users')
      const pusherService = app.getService('pusher')

      // Retrieve the user's devices
      let user = params.user
      let devices = user.devices || []

      // Check whether we need to update or to register the device
      let device = this.findDeviceByUuid(data, user)
      if (device) {
        debug('Device already stored for user ', user._id)
        if (device.registrationId === id) return device
        await this.remove(device.registrationId, { user })
        // Remove device from user list
        devices = devices.filter(userDevice => userDevice.uuid !== device.uuid)
      }
      device = Object.assign({}, data)
      // Bind the device
      // FIXME: These operations can probably be done in parallel
      device = await this.create(device, { user })
      // Store new device
      devices.push(device)
      debug('Storing new device for user ', user)
      await usersService.patch(user._id, { devices }, { user, checkAuthorisation: true })
      return device
    },
    async create (data, params) {
      // data: device
      let user = params.user
      const pusherService = app.getService('pusher')
      // Bind the device
      debug('Binding new device', data)
      // FIXME: These operations can probably be done in parallel
      data.arn = await pusherService.create({ action: 'device', device: data }, { user })
      return data
    },
    async remove (id, params) {
      // id: registrationId
      let user = params.user
      const pusherService = app.getService('pusher')
      debug('Unbinding old device', id)
      await pusherService.remove(id, { query: { action: 'device' }, user })
    }
  }
}
