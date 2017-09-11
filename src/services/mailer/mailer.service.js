import Mailer from 'feathers-mailer'
import smtpTransport from 'nodemailer-smtp-transport'

export default function (name, app, options) {
  return Mailer(smtpTransport({
    service: 'gmail',
    auth: {
      user: app.get('GMAIL'),
      pass: app.get('GMAIL_PASSWORD')
    }
  }))
}
