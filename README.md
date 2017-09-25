# kNotify

[![Build Status](https://travis-ci.org/kalisio/kNotify.png?branch=master)](https://travis-ci.org/kalisio/kNotify)
[![Code Climate](https://codeclimate.com/github/kalisio/kNotify/badges/gpa.svg)](https://codeclimate.com/github/kalisio/kNotify)
[![Test Coverage](https://codeclimate.com/github/kalisio/kNotify/badges/coverage.svg)](https://codeclimate.com/github/kalisio/kNotify/coverage)
[![Dependency Status](https://img.shields.io/david/kalisio/kNotify.svg?style=flat-square)](https://david-dm.org/kalisio/kNotify)

> Basic utils to support notifications (push, emails, etc.) for Kalisio applications and services

## Installation

```
npm install kNotify --save
// Or with Yarn
yarn add kNotify
```

## Documentation

The [kDocs](https://kalisio.gitbooks.io/kalisio/) are loaded with awesome stuff and tell you everything you need to know about using and configuring it.

## Tests

### Mailer

To make test run we need two gmail accounts:
* support@kalisio.xyz used as email sender
* test@kalisio.xyz used as user test email

The first one should authorise connection by email/password on https://myaccount.google.com/lesssecureapps.

The second one requires OAuth2 to be able to read emails using the GMail API. The simplest way is by creating a service account for a JWT-based authentication. Interesting issue to make all the configuration work can be found [here](https://stackoverflow.com/a/29328258).

Standard OAuth2 with refresh token might also be used as detailed [here](https://medium.com/@pandeysoni/nodemailer-service-in-node-js-using-smtp-and-xoauth2-7c638a39a37e) and [here](https://medium.com/@pandeysoni/nodemailer-service-in-node-js-using-smtp-and-xoauth2-7c638a39a37e).

Details on how to use Google APIs from Node.js [here](https://github.com/google/google-api-nodejs-client#authorizing-and-authenticating).

### Pusher

Push notifications rely on [sns-mobile](https://github.com/evanshortiss/sns-mobile).

Since 2017 Google Cloud Messaging (GCM) has become Firebase Cloud Messaging (FCM), to generate an API key follow [this issue](https://stackoverflow.com/questions/39417797/amazon-sns-platform-credentials-are-invalid-when-re-entering-a-gcm-api-key-th) and enter the server key when creating the SNS application on AWS. Although you use the Firebase console you should also see the created API through the Google Cloud console.

## License

Copyright (c) 2017 Kalisio

Licensed under the [MIT license](LICENSE).
