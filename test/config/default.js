var path = require('path')
var containerized = require('containerized')()

var API_PREFIX = '/api'

module.exports = {
  port: process.env.PORT || 8081,

  apiPath: API_PREFIX,
  domain: 'www.kalisio.xyz',
  host: 'localhost',
  paginate: {
    default: 10,
    max: 50
  },
  authentication: {
    secret: 'b5KqXTye4fVxhGFpwMVZRO3R56wS5LNoJHifwgGOFkB5GfMWvIdrWyQxEJXswhAC',
    strategies: [
      'jwt',
      'local'
    ],
    path: API_PREFIX + '/authentication',
    service: API_PREFIX + '/users'
  },
  mailer: {
    service: 'gmail',
    auth: {
      user: 'support@kaelia-tech.com',
      pass: '2017kalisio'
    },
    templateDir: path.join(__dirname, '..', 'email-templates')
  },
  logs: {
    Console: {
      colorize: true,
      level: 'verbose'
    },
    DailyRotateFile: {
      filename: path.join(__dirname, '..', 'test-log-'),
      datePattern: 'yyyy-MM-dd.log'
    }
  },
  db: {
    adapter: 'mongodb',
    url: (containerized ? 'mongodb://mongodb:27017/kalisio-test' : 'mongodb://127.0.0.1:27017/kalisio-test')
  }
}
