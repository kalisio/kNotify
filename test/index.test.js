import path from 'path'
import fs from 'fs-extra'
import request from 'superagent'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore'
import notify from '../src'

describe('kNotify', () => {
  let app, server, port, baseUrl, mailerService

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
    app.configure(notify)
    mailerService = app.getService('mailer')
    expect(mailerService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  // Cleanup
  after(() => {
    if (server) server.close()
  })
})
