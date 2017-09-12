import path from 'path'
// const modelsPath = path.join(__dirname, '..', 'models')
const servicesPath = path.join(__dirname, '..', 'services')

module.exports = async function () {
  const app = this

  app.createService('mailer', { servicesPath })
  app.createService('account', { servicesPath })
  // Add hook to automatically add verification atributes when creating a new user,
  // send verification email, etc.
  app.configureService('users', app.getService('users'), servicesPath)
}
