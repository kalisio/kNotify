import logger from 'loglevel'
import { Platform } from 'quasar'
import { Store, utils as kCoreUtils } from '@kalisio/kdk-core/client'
import * as mixins from './mixins'
import * as hooks from './hooks'

// We faced a bug in babel so that transform-runtime with export * from 'x' generates import statements in transpiled code
// Tracked here : https://github.com/babel/babel/issues/2877
// We tested the workaround given here https://github.com/babel/babel/issues/2877#issuecomment-270700000 with success so far

// FIXME: we don't build vue component anymore, they are processed by webpack in the application template
// export * from './components'

export * from '../common'
export { mixins }
export { hooks }

export default function init () {
  const api = this

  logger.debug('Initializing kalisio notify')

  api.declareService('account')
  api.declareService('devices')

  // -----------------------------------------------------------------------
  // | After this we should only have specific cordova initialisation code |
  // -----------------------------------------------------------------------
  if (!Platform.is.cordova) return

  /* NOT SURE IF THIS IS REQUIRED
  let permissionsPlugin = cordova.plugins.permissions
  const notificationPermissions = [
    permissionsPlugin.INTERNET,
    permissionsPlugin.ACCESS_NETWORK_STATE,
    permissionsPlugin.WAKE_LOCK,
    permissionsPlugin.VIBRATE
  ]

  function permissionsError() {
    const message = 'Required permissions for push notifications are missing or have been rejected, the application will not work as expected'
    logger.error(message)
    utils.toast({
      message,
      timeout: 10000
    })
  }
  function permissionsCheckSuccess(status) {
    // Request again if not given
    if (!status.hasPermission) {
      permissionsPlugin.requestPermissions(notificationPermissions, status => { if (!status.hasPermission) permissionsError() }, permissionsError)
    }
  }
  */

  document.addEventListener('deviceready', _ => {
    // Check for permissions, will launch permission request on failure
    // NOT SURE IF THIS IS REQUIRED
    // permissionsPlugin.hasPermission(notificationPermissions, permissionsCheckSuccess, null)
    if (!window.device) {
      logger.error('Unable to reach device information')
      return
    }

    const notifier = window.PushNotification.init({
      android: { vibrate: true, sound: true, forceShow: true },
      ios: { alert: true, badge: true, sound: true },
      windows: { }
    })
    notifier.on('registration', async (data) => {
      logger.debug('Push registrationID changed: ' + data.registrationId)
      // Store the registrationId
      window.device.registrationId = data.registrationId
      // update the user device
      const user = Store.get('user')
      if (user && window.device && window.device.registrationId) {
        const devicesService = api.getService('devices')
        const device = await devicesService.update(window.device.registrationId, window.device)
        logger.debug(`device ${device.uuid} updated with the id ${device.registrationId}`)
      }
    })
    notifier.on('notification', (data) => {
      // data.message,
      // data.title,
      // data.count,
      // data.sound,
      // data.image,
      // data.additionalData
    })
    notifier.on('error', (error) => {
      logger.error(error)
      kCoreUtils.toast({
        message: error.message,
        timeout: 10000
      })
    })
    api.on('authenticated', async response => {
      const devicesService = api.getService('devices')
      // Only possible if registration ID already retrieved
      if (window.device && window.device.registrationId) {
        const device = await devicesService.update(window.device.registrationId, window.device)
        logger.debug(`device ${device.uuid} registered with the id ${device.registrationId}`)
      }
    })
  }, false)
}
