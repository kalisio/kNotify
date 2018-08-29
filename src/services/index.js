import path from 'path'
// const modelsPath = path.join(__dirname, '..', 'models')
const servicesPath = path.join(__dirname, '..', 'services')

module.exports = function () {
  const app = this

  app.createService('mailer', { servicesPath, events: ['created', 'updated', 'removed', 'patched'] }) // Internal use only, no events
  app.createService('pusher', { servicesPath, events: ['created', 'updated', 'removed', 'patched'] }) // Internal use only, no events
  app.createService('account', { servicesPath })
  app.createService('devices', { servicesPath })
}
