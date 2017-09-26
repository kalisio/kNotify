import _ from 'lodash'
import google from 'googleapis'
import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import notify from '../src'

describe('kNotify:account', () => {
  let app, server, port, baseUrl,
    userService, mailerService, accountService, jwtClient, gmail, userObject

  // Helper function used to check if a given email has been retrieved in GMail inbox
  // Erase it after check
  function checkEmail (user, fromValue, subjectValue, done) {
    gmail.users.messages.list({
      auth: jwtClient,
      userId: user.email
    }, (err, response) => {
      if (err) done(err)
      expect(response.messages).toExist()
      expect(response.messages.length > 0).beTrue()
      gmail.users.messages.get({
        auth: jwtClient,
        id: response.messages[0].id,
        userId: user.email
      }, (err, response) => {
        if (err) done(err)
        expect(response.payload).toExist()
        expect(response.payload.headers).toExist()
        const from = _.find(response.payload.headers, header => header.name === 'From')
        expect(from.value).to.equal(fromValue)
        const subject = _.find(response.payload.headers, header => header.name === 'Subject')
        expect(subject.value).to.equal(subjectValue)
        // Remove message to not pollute the mailbox
        // or simply call done for debug
        // done()
        gmail.users.messages.delete({
          auth: jwtClient,
          id: response.id,
          userId: user.email
        }, (err, response) => {
          done(err)
        })
      })
    })
  }

  before(() => {
    chailint(chai, util)

    gmail = google.gmail('v1')
    app = kalisio()
    port = app.get('port')
    baseUrl = `http://localhost:${port}${app.get('apiPath')}`
    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the services', (done) => {
    app.configure(core)
    userService = app.getService('users')
    expect(userService).toExist()
    app.configure(notify)
    mailerService = app.getService('mailer')
    expect(mailerService).toExist()
    accountService = app.getService('account')
    expect(accountService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('setup access to gmail', (done) => {
    const key = app.get('googleApiKey')
    jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.readonly'], // an array of auth scopes
      'test@kalisio.xyz'
    )

    jwtClient.authorize((err, tokens) => {
      done(err)
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a user', () => {
    return userService.create({
      email: 'test@kalisio.xyz',
      password: 'test-password',
      name: 'test-user'
    })
    .then(user => {
      userObject = user
      expect(userObject.isVerified).toExist()
      expect(userObject.isVerified).beFalse()
      expect(userObject.verifyToken).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check signup verification email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Confirm your signup', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('verify user signup', () => {
    return accountService.create({
      action: 'verifySignupLong',
      value: userObject.verifyToken
    })
    .then(user => {
      userObject = user
      expect(userObject.isVerified).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check signup verified email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Thank you, your email has been verified', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('ask password reset for a user', () => {
    return accountService.create({
      action: 'sendResetPwd',
      value: { email: userObject.email }
    })
    .then(user => {
      // Because the account service filters for client hidden security attributes we need to fetch the user manually
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      expect(userObject.resetToken).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check reset password request email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Reset your password', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('reset user password', () => {
    return accountService.create({
      action: 'resetPwdLong',
      value: {
        token: userObject.resetToken,
        password: 'reset-password'
      }
    })
    .then(user => {
      // Because the account service filters for client hidden security attributes we need to fetch the user manually
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      expect(userObject.resetToken).beNull()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check reset password email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Your password was reset', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('authenticates a user with reset password', () => {
    return request
    .post(`${baseUrl}/authentication`)
    .send({ email: userObject.email, password: 'reset-password', strategy: 'local' })
    .then(response => {
      expect(response.body.accessToken).toExist()
    })
  })

  it('change user password', () => {
    return accountService.create({
      action: 'passwordChange',
      value: {
        user: { email: userObject.email },
        oldPassword: 'reset-password',
        password: 'changed-password'
      }
    })
    .then(user => {
      // Because the account service filters for client hidden security attributes we need to fetch the user manually
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      expect(userObject.resetToken).beNull()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check changed password email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Your password was changed', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('authenticates a user with changed password', () => {
    return request
    .post(`${baseUrl}/authentication`)
    .send({ email: userObject.email, password: 'changed-password', strategy: 'local' })
    .then(response => {
      expect(response.body.accessToken).toExist()
    })
  })

  it('ask user identity change', () => {
    return accountService.create({
      action: 'identityChange',
      value: {
        user: { email: userObject.email },
        password: 'changed-password',
        changes: { email: 'support@kalisio.xyz' }
      }
    })
    .then(user => {
      // Because the account service filters for client hidden security attributes we need to fetch the user manually
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      expect(userObject.verifyToken).toExist()
      expect(userObject.verifyChanges).toExist()
      expect(userObject.verifyChanges.email).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('check identity change email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(_ => {
      checkEmail(userObject, mailerService.options.auth.user, 'Your account information was changed', done)
    }, 5000)
  })
  // Let enough time to process
  .timeout(10000)

  it('verify user changes', () => {
    return accountService.create({
      action: 'verifySignupLong',
      value: userObject.verifyToken
    })
    .then(user => {
      // Because the account service filters for client hidden security attributes we need to fetch the user manually
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      expect(userObject.email).to.equal('support@kalisio.xyz')
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('authenticates a user with changed identity', () => {
    return request
    .post(`${baseUrl}/authentication`)
    .send({ email: userObject.email, password: 'changed-password', strategy: 'local' })
    .then(response => {
      expect(response.body.accessToken).toExist()
    })
  })

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
