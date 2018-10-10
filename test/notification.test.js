import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from '@kalisio/kCore'
import { createGmailClient } from './utils'
import notify, { hooks } from '../src'

describe('kNotify:notifications', () => {
  let app, server, port, baseUrl, gmailClient, gmailUser,
    authenticationService, mailerService, userService, devicesService, pusherService,
    sns, publisherObject, subscriberObject
  const device = {
    registrationId: 'fakeId',
    platform: 'ANDROID',
    uuid: 'id'
  }
  const otherDevice = {
    registrationId: 'other-fakeId',
    platform: 'ANDROID',
    uuid: 'other-id'
  }
  const newDevice = Object.assign({}, device, { registrationId: 'new-fakeId' })

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
    userService.hooks({
      before: {
        remove: [ hooks.unregisterDevices ]
      }
    })
    authenticationService = app.getService('authentication')
    expect(authenticationService).toExist()
    app.configure(notify)
    devicesService = app.getService('devices')
    devicesService.hooks({
      after: {
        create: [ hooks.sendNewDeviceEmail ]
      }
    })
    expect(devicesService).toExist()
    mailerService = app.getService('mailer')
    expect(mailerService).toExist()
    pusherService = app.getService('pusher')
    expect(pusherService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })
  // Let enough time to process
  .timeout(5000)

  it('setup access to SNS', () => {
    // For now we only test 1 platform, should be sufficient due to SNS facade
    sns = pusherService.getSnsApplication(device.platform)
    expect(sns).toExist()
  })

  it('setup access to gmail', async () => {
    const gmailApiConfig = app.get('gmailApi')
    gmailUser = gmailApiConfig.user
    gmailClient = await createGmailClient(gmailApiConfig)
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a publisher', () => {
    return userService.create({
      email: 'publisher@kalisio.xyz',
      password: 'publisher-password',
      name: 'publisher-user'
    }, { noVerificationEmail: true })
    .then(user => {
      publisherObject = user
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('creates a subscriber', () => {
    return userService.create({
      email: gmailUser,
      password: 'subscriber-password',
      name: 'subscriber-user'
    }, { noVerificationEmail: true })
    .then(user => {
      subscriberObject = user
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('a subscriber should be able to register its devices', () => {
    let operation = request
    .post(`${baseUrl}/authentication`)
    .send({ email: gmailUser, password: 'subscriber-password', strategy: 'local' })
    .then(response => {
      return userService.find({ query: { email: gmailUser } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      subscriberObject = users.data[0]
      return devicesService.update(device.registrationId, device, { user: subscriberObject })
    })
    .then(device => {
      return userService.get(subscriberObject._id)
    })
    .then(user => {
      // Check registered device
      subscriberObject = user
      expect(subscriberObject.devices).toExist()
      expect(subscriberObject.devices.length === 1).beTrue()
      expect(subscriberObject.devices[0].uuid).to.equal(device.uuid)
      expect(subscriberObject.devices[0].registrationId).to.equal(device.registrationId)
      expect(subscriberObject.devices[0].platform).to.equal(device.platform)
      expect(subscriberObject.devices[0].arn).toExist()
      expect(subscriberObject.devices[0].lastActivity).toExist()
      return devicesService.update(otherDevice.registrationId, otherDevice, { user: subscriberObject })
    })
    .then(device => {
      return userService.get(subscriberObject._id)
    })
    .then(user => {
      // Check registered device
      subscriberObject = user
      expect(subscriberObject.devices).toExist()
      expect(subscriberObject.devices.length === 2).beTrue()
      expect(subscriberObject.devices[1].uuid).to.equal(otherDevice.uuid)
      expect(subscriberObject.devices[1].registrationId).to.equal(otherDevice.registrationId)
      expect(subscriberObject.devices[1].platform).to.equal(otherDevice.platform)
      expect(subscriberObject.devices[1].arn).toExist()
      expect(subscriberObject.devices[1].lastActivity).toExist()
    })
    let events = new Promise((resolve, reject) => {
      let count = 0
      sns.on('userAdded', (endpointArn, registrationId) => {
        expect(registrationId).to.satisfy(id => (id === device.registrationId) || (id === otherDevice.registrationId))
        count++
        if (count === 2) resolve()
      })
    })
    return Promise.all([operation, events])
  })
  // Let enough time to process
  .timeout(10000)

  it('check new device emails', (done) => {
    // Add some delay to wait for email reception
    setTimeout(() => {
      gmailClient.checkEmail(subscriberObject, mailerService.options.auth.user, 'Security alert - new device signin', (err) => {
        if (err) done(err)
        else gmailClient.checkEmail(subscriberObject, mailerService.options.auth.user, 'Security alert - new device signin', done)
      })
    }, 10000)
  })
  // Let enough time to process
  .timeout(15000)

  it('publishes a message on the subscriber devices', () => {
    let operation = pusherService.create({
      action: 'message',
      pushObject: subscriberObject._id.toString(),
      pushObjectService: 'users',
      message: 'test-message'
    })
    let events = new Promise((resolve, reject) => {
      let count = 0
      sns.on('messageSent', (endpointArn, messageId) => {
        expect(endpointArn).to.satisfy(arn => (arn === subscriberObject.devices[0].arn) || (arn === subscriberObject.devices[1].arn))
        count++
        if (count === 2) resolve()
      })
    })
    return Promise.all([operation, events])
  })
  // Let enough time to process
  .timeout(5000)

  it('creates the topic on the publisher object', (done) => {
    pusherService.create({
      action: 'topic',
      pushObject: publisherObject._id.toString(),
      pushObjectService: 'users'
    })
    sns.once('topicCreated', (topicArn, topicName) => {
      // Check for user object update
      userService.find({ query: { email: 'publisher@kalisio.xyz' } })
      .then(users => {
        expect(users.data.length > 0).beTrue()
        publisherObject = users.data[0]
        expect(publisherObject.topics).toExist()
        expect(publisherObject.topics[device.platform]).to.equal(topicArn)
        expect(publisherObject._id.toString()).to.equal(topicName)
        done()
      })
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('subscribes a user to the publisher topic', (done) => {
    pusherService.create({
      action: 'subscriptions',
      pushObject: publisherObject._id.toString(),
      pushObjectService: 'users'
    }, {
      users: [subscriberObject]
    })
    let count = 0
    sns.on('subscribed', (subscriptionArn, endpointArn, topicArn) => {
      expect(publisherObject.topics[device.platform]).to.equal(topicArn)
      expect(endpointArn).to.satisfy(arn => (arn === subscriberObject.devices[0].arn) || (arn === subscriberObject.devices[1].arn))
      count++
      if (count === 2) done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('publishes a message on the publisher topic', (done) => {
    pusherService.create({
      action: 'message',
      pushObject: publisherObject._id.toString(),
      pushObjectService: 'users',
      message: 'test-message'
    })
    sns.once('publishedMessage', (topicArn, messageId) => {
      expect(publisherObject.topics[device.platform]).to.equal(topicArn)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('unsubscribes a user from the publisher topic', (done) => {
    pusherService.remove(publisherObject._id.toString(), {
      query: {
        action: 'subscriptions',
        pushObjectService: 'users'
      },
      users: [subscriberObject]
    })
    sns.once('unsubscribed', (subscriptionArn) => {
      // We do not store subscription ARN
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('removes the topic on the publisher object', (done) => {
    pusherService.remove(publisherObject._id.toString(), {
      query: {
        action: 'topic',
        pushObjectService: 'users'
      }
    })
    sns.once('topicDeleted', (topicArn) => {
      expect(publisherObject.topics[device.platform]).to.equal(topicArn)
      // Check for user object update
      userService.find({ query: { email: 'publisher@kalisio.xyz' } })
      .then(users => {
        expect(users.data.length > 0).beTrue()
        publisherObject = users.data[0]
        expect(publisherObject.topics).beNull()
        done()
      })
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('a subscriber should be able to update its device when registration ID changes', () => {
    const previousDevice = Object.assign({}, subscriberObject.devices[0])
    let operation = devicesService.update(newDevice.registrationId, newDevice, { user: subscriberObject })
    .then(device => {
      return userService.get(subscriberObject._id)
    })
    .then(user => {
      // Check updated device
      subscriberObject = user
      expect(subscriberObject.devices).toExist()
      expect(subscriberObject.devices.length === 2).beTrue()
      expect(subscriberObject.devices[0].uuid).to.equal(newDevice.uuid)
      expect(subscriberObject.devices[0].registrationId).to.equal(newDevice.registrationId)
      expect(subscriberObject.devices[0].platform).to.equal(newDevice.platform)
      expect(subscriberObject.devices[0].arn).toExist()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('attributesUpdated', (endpointArn, attributes) => {
        expect(previousDevice.arn).to.equal(endpointArn)
        expect(attributes.Token).to.equal(newDevice.registrationId)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })
  // Let enough time to process
  .timeout(5000)

  it('a subscriber should be able to recover its device when disabled', () => {
    const previousDevice = Object.assign({}, subscriberObject.devices[1])
    let operation = new Promise((resolve, reject) => {
      sns.deleteUser(previousDevice.arn, (err) => {
        if (err) {
          reject(err)
          return
        }
        delete previousDevice.arn
        resolve(devicesService.update(otherDevice.registrationId, otherDevice, { user: subscriberObject })
        .then(device => {
          return userService.get(subscriberObject._id)
        })
        .then(user => {
          // Check updated device
          subscriberObject = user
          expect(subscriberObject.devices).toExist()
          expect(subscriberObject.devices.length === 2).beTrue()
          expect(subscriberObject.devices[1].uuid).to.equal(otherDevice.uuid)
          expect(subscriberObject.devices[1].registrationId).to.equal(otherDevice.registrationId)
          expect(subscriberObject.devices[1].platform).to.equal(otherDevice.platform)
          expect(subscriberObject.devices[1].arn).toExist()
        }))
      })
    })
    let event = new Promise((resolve, reject) => {
      sns.once('userAdded', (endpointArn, registrationId) => {
        expect(registrationId).to.equal(otherDevice.registrationId)
        expect(endpointArn).not.to.equal(previousDevice.arn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })
  // Let enough time to process
  .timeout(5000)

  it('check recovered device email', (done) => {
    // Add some delay to wait for email reception
    setTimeout(() => {
      gmailClient.checkEmail(subscriberObject, mailerService.options.auth.user, 'Security alert - new device signin', done)
    }, 10000)
  })
  // Let enough time to process
  .timeout(15000)

  it('a subscriber should be able to delete its device', () => {
    const previousDevice = Object.assign({}, subscriberObject.devices[1])
    let operation = devicesService.remove(otherDevice.registrationId, { user: subscriberObject })
    .then(device => {
      return userService.get(subscriberObject._id)
    })
    .then(user => {
      // Check updated device
      subscriberObject = user
      expect(subscriberObject.devices).toExist()
      expect(subscriberObject.devices.length === 1).beTrue()
      expect(subscriberObject.devices[0].uuid).to.equal(newDevice.uuid)
      expect(subscriberObject.devices[0].registrationId).to.equal(newDevice.registrationId)
      expect(subscriberObject.devices[0].platform).to.equal(newDevice.platform)
      expect(subscriberObject.devices[0].arn).toExist()
    })
    let event = new Promise((resolve, reject) => {
      sns.once('userDeleted', (endpointArn) => {
        expect(endpointArn).to.equal(previousDevice.arn)
        resolve()
      })
    })
    return Promise.all([operation, event])
  })
  // Let enough time to process
  .timeout(5000)

  it('removes a subscriber should unregister its device', (done) => {
    userService.remove(subscriberObject._id, { user: subscriberObject })
    sns.once('userDeleted', endpointArn => {
      expect(subscriberObject.devices[0].arn).to.equal(endpointArn)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  // Cleanup
  after(async () => {
    if (server) await server.close()
    app.db.instance.dropDatabase()
  })
})
