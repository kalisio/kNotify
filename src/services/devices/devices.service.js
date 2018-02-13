import makeDebug from 'debug'
import _ from 'lodash'

const debug = makeDebug('kalisio:kNotify:devices')

export default function (name, app, options) {
    // Keep track of config
  Object.assign(options, app.get('devices'))
  debug('devices service created with config ', options)
  return {
    async update (id, data, params) {
      // id: userId
      // data: device
      debug('devices service call for update', id, data)
      const usersService = app.getService('users')
      const pusherService = app.getService('pusher')

      // Retrieve the user's devices
      let user = params.user
      let devices = user.devices || []

      // Check whether we need to update or to register the device
      let device = _.find(devices, { 'uuid': data.uuid })
      if (device) {
        debug('device already registered')
        if (device.registrationId === id) return device
        debug('unbinding the device from the pusher service')
        await pusherService.remove(device.registrationId, { query: { action: 'device' }, user: user })
        device.registrationId = data.registrationId
      } else {
        debug('device not found: registering the device')
        device = Object.assign({}, data)
        devices.push(device)
      }
      // Bind the device
      debug(`binding the device to the pusher service with the registrationId ${device.registrationId}`)
      device.arn = await pusherService.create({ action: 'device', device: data }, { user })

      await usersService.patch(user._id, { devices }, { user, checkAuthorisation: true })
      // Update user for hooks
      params.user.devices = devices
      return device
    }
  }
}
