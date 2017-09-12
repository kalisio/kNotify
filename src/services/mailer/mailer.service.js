import mailer from 'feathers-mailer'
import smtpTransport from 'nodemailer-smtp-transport'

export default function (name, app, options) {
  // Keep track of config
  Object.assign(options, app.get('mailer'))
  return mailer(smtpTransport(options))
}
