import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import notify from '../src'

describe('kNotify', () => {
  let app, server, port, userService, mailerService, accountService, userObject

  before(() => {
    chailint(chai, util)

    app = kalisio()
    port = app.get('port')
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

  it('creates a user', () => {
    return userService.create({
      email: 'luc.claustres@kalisio.xyz',
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

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
