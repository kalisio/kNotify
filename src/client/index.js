import logger from 'loglevel'
import { Platform, Toast } from 'quasar'

// We faced a bug in babel so that transform-runtime with export * from 'x' generates import statements in transpiled code
// Tracked here : https://github.com/babel/babel/issues/2877
// We tested the workaround given here https://github.com/babel/babel/issues/2877#issuecomment-270700000 with success so far

// FIXME: we don't build vue component anymore, they are processed by webpack in the application template
// export * from './components'

export * as mixins from './mixins'

export default function init () {
  // const app = this

  logger.debug('Initializing kalisio notify')

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
    Toast.create.negative({
      html: message,
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
    //permissionsPlugin.hasPermission(notificationPermissions, permissionsCheckSuccess, null)

    let notifier = PushNotification.init({
      android: { vibrate: true, sound: true, forceShow: true },
      ios: { alert: true, badge: true, sound: true },
      windows: { }
    })
    notifier.on('registration', (data) => {
      logger.debug('Registered device with ID ' + data.registrationId)
      // Should be provided by cordova plugin
      if (window.device) window.device.registrationId = data.registrationId
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
      Toast.create.negative({
        html: error.message,
        timeout: 10000
      })
    })
  }, false)
}
