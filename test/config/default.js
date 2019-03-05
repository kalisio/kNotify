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
    service: API_PREFIX + '/users',
    passwordPolicy: {
      minLength: 8
    }
  },
  mailer: {
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_MAIL_USER,
      pass: process.env.GOOGLE_MAIL_PASSWORD
    },
    templateDir: path.join(__dirname, '..', 'email-templates')
  },
  pusher: {
    accessKeyId: process.env.SNS_ACCESS_KEY,
    secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
    region: 'eu-west-1',
    apiVersion: '2010-03-31',
    platforms: {
      ANDROID: process.env.SNS_ANDROID_ARN
    },
    topicName: (object) => object._id.toString()
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
    url: (containerized ? 'mongodb://mongodb:27017/kdk-test' : 'mongodb://127.0.0.1:27017/kdk-test')
  },
  storage: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET
  },
  gmailApi: {
    user: process.env.GMAIL_API_USER,
    clientEmail: process.env.GMAIL_API_CLIENT_EMAIL,
    // The private key file is set as an environment variable containing \n
    // So we need to parse it such as if it came from a JSON file
    privateKey: JSON.parse('{ "key": "' + process.env.GMAIL_API_PRIVATE_KEY + '" }').key
  }
}
