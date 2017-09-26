import path from 'path'
// const modelsPath = path.join(__dirname, '..', 'models')
const servicesPath = path.join(__dirname, '..', 'services')

module.exports = async function () {
  const app = this

  app.createService('mailer', { servicesPath })
  app.createService('pusher', { servicesPath })
  app.createService('account', { servicesPath })
  // Add hook to automatically add verification attributes when creating a new user,
  // send verification email, register devices, etc.
  app.configureService('users', app.getService('users'), servicesPath)
  app.configureService('authentication', app.getService('authentication'), servicesPath)
}
