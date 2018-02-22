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
      return _.find(devices, { uuid: device.uuid })
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
        debug('Unbinding old device', device)
        await pusherService.remove(device.registrationId, { query: { action: 'device' }, user })
        // Remove device from user list
        devices = devices.filter(userDevice => userDevice.uuid !== device.uuid)
      }
      device = Object.assign({}, data)
      // Bind the device
      debug('Binding new device', device)
      // FIXME: These operations can probably be done in parallel
      device.arn = await pusherService.create({ action: 'device', device: data }, { user })
      // Store new device
      devices.push(device)
      debug('Storing new device for user ', user)
      await usersService.patch(user._id, { devices }, { user, checkAuthorisation: true })
      return device
    }
  }
}
