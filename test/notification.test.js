import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import notify, { hooks } from '../src'

describe('kNotify:notifications', () => {
  let app, server, port, baseUrl, authenticationService, userService, pusherService, sns, publisherObject, subscriberObject
  const device = {
    registrationId: 'myfakeId',
    platform: 'ANDROID'
  }

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
    authenticationService.hooks({
      after: {
        create: [ hooks.registerDevice ]
      }
    })
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
    sns = pusherService.getSnsApplication(device.platform)
    expect(sns).toExist()
  })

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

  it('creates a subscriber', () => {
    return userService.create({
      email: 'subscriber@kalisio.xyz',
      password: 'subscriber-password',
      name: 'subscriber-user'
    }, { noVerificationEmail: true })
    .then(user => {
      subscriberObject = user
    })
  })

  it('authenticates a subscriber should register its device', () => {
    return request
    .post(`${baseUrl}/authentication`)
    .send({ email: 'subscriber@kalisio.xyz', password: 'subscriber-password', strategy: 'local', device })
    .then(response => {
      return userService.find({ query: { email: 'subscriber@kalisio.xyz' } })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
      subscriberObject = users.data[0]
      // Added registered device
      expect(subscriberObject.devices).toExist()
      expect(subscriberObject.devices.length > 0).beTrue()
      expect(subscriberObject.devices[0].registrationId).to.equal(device.registrationId)
      expect(subscriberObject.devices[0].platform).to.equal(device.platform)
      expect(subscriberObject.devices[0].arn).toExist()
    })
  })

  it('creates the topic on the publisher object', (done) => {
    pusherService.create({
      action: 'topic',
      pushObject: publisherObject._id.toString(),
      pushObjectService: 'users'
    })
    sns.on('topicCreated', (topicArn, topicName) => {
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

  it('subscribes a user to the publisher topic', (done) => {
    pusherService.create({
      action: 'subscriptions',
      pushObject: publisherObject._id.toString(),
      pushObjectService: 'users'
    }, {
      users: [subscriberObject]
    }).catch(error => console.log(error))
    sns.on('subscribed', (subscriptionArn, endpointArn, topicArn) => {
      expect(publisherObject.topics[device.platform]).to.equal(topicArn)
      expect(subscriberObject.devices[0].arn).to.equal(endpointArn)
      done()
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
    sns.on('publishedMessage', (topicArn, messageId) => {
      expect(publisherObject.topics[device.platform]).to.equal(topicArn)
      done()
    })
  })

  it('unsubscribes a user from the publisher topic', (done) => {
    pusherService.remove(publisherObject._id.toString(), {
      query: {
        action: 'subscriptions',
        pushObjectService: 'users'
      },
      users: [subscriberObject]
    }).catch(error => console.log(error))
    sns.on('unsubscribed', (subscriptionArn) => {
      // We do not store subscription ARN
      done()
    })
  })

  it('removes the topic on the publisher object', (done) => {
    pusherService.remove(publisherObject._id.toString(), {
      query: {
        action: 'topic',
        pushObjectService: 'users'
      }
    })
    sns.on('topicDeleted', (topicArn) => {
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

  it('removes a subscriber should unregister its device', (done) => {
    userService.remove(subscriberObject._id, { user: subscriberObject })
    sns.on('userDeleted', endpointArn => {
      expect(subscriberObject.devices[0].arn).to.equal(endpointArn)
      done()
    })
  })

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
