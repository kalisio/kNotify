
import accountManager from 'feathers-authentication-management'
import emails from 'email-templates'
import path from 'path'
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kNotify:account')

export default function (name, app, options) {
  // Keep track of notifier
  options.notifier = function (type, user, notifierOptions) {
    const mailerService = app.getService('mailer')
    let email = {
      from: mailerService.options.auth.user,
      to: user.email
    }
    let domainPath = app.get('domain') + app.get('apiPath') + '/account/'
    // Build the subject & link to the app to perform the different actions
    switch (type) {
      case 'resendVerifySignup': // send another email with link for verifying user's email addr
        email.subject = 'Confirm your signup'
        email.link = domainPath + 'verifySignup/' + user.verifyToken
        break
      case 'verifySignup': // inform that user's email is now confirmed
        email.subject = 'Thank you, your email has been verified'
        break
      case 'sendResetPwd': // send email with link to reset password
        email.subject = 'Reset your password'
        email.link = domainPath + 'resetPassword/' + user.resetToken
        break
      case 'resetPwd': // inform that user's password is now reset
        email.subject = 'Your password was reset'
        break
      case 'passwordChange': // inform that user's password is now changed
        email.subject = 'Your password was changed'
        break
      case 'identityChange': // inform that user's email has now changed
        email.subject = 'Your account information was changed'
        email.link = domainPath + 'changeIdentity/' + user.verifyToken
    }
    const templateDir = path.join(mailerService.options.templateDir, type)
    const template = new emails.EmailTemplate(templateDir)
    return template.render({
      email,
      user
    }, user.locale || 'en-us')
    .then(emailContent => {
      // Update compiled content
      email.html = emailContent.html
      debug('Sending email ', email)
      return mailerService.create(email)
    })
  }

  const servicePath = app.get('apiPath') + '/account'
  const userService = app.getService('users')
  app.configure(accountManager({
    service: userService.getPath(true),
    path: servicePath,
    notifier: options.notifier
  }))

  return app.service(servicePath)
}
