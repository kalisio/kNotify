import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import notify from '../src'

describe('kNotify:notifications', () => {
  let app, server, port, baseUrl, authenticationService, userService, pusherService, sns, userObject
  const deviceId = 'myfakeId'
  const devicePlatform = 'ANDROID'

  before(() => {
    chailint(chai, util)

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
    authenticationService = app.getService('authentication')
    expect(authenticationService).toExist()
    app.configure(notify)
    pusherService = app.getService('pusher')
    expect(pusherService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('setup access to SNS', () => {
    // For now we only test 1 platform, should be sufficient due to SNS facade
    sns = pusherService.getSnsApplication(devicePlatform)
    expect(sns).toExist()
  })

  it('creates a user', () => {
    return userService.create({
      email: 'test@kalisio.xyz',
      password: 'test-password',
      name: 'test-user'
    }, { noVerificationEmail: true })
    .then(user => {
      userObject = user
    })
  })

  it('authenticates a user should register its device', () => {
    return request
    .post(`${baseUrl}/authentication`)
    .send({ email: 'test@kalisio.xyz', password: 'test-password', strategy: 'local', deviceId, devicePlatform })
    .then(response => {
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      userObject = users.data[0]
      // Added registered device
      expect(userObject.devices).toExist()
      expect(userObject.devices.length > 0).beTrue()
      expect(userObject.devices[0].id).to.equal(deviceId)
      expect(userObject.devices[0].platform).to.equal(devicePlatform)
      expect(userObject.devices[0].endpoint).toExist()
    })
  })

  it('removes a user should unregister its device', (done) => {
    userService.remove(userObject._id, { user: userObject })
    sns.on('userDeleted', endpointArn => {
      expect(userObject.devices[0].endpoint).to.equal(endpointArn)
      done()
    })
  })

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
