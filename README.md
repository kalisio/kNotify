# kNotify

[![Build Status](https://travis-ci.org/kalisio/kNotify.png?branch=master)](https://travis-ci.org/kalisio/kNotify)
[![Code Climate](https://codeclimate.com/github/kalisio/kNotify/badges/gpa.svg)](https://codeclimate.com/github/kalisio/kNotify)
[![Test Coverage](https://codeclimate.com/github/kalisio/kNotify/badges/coverage.svg)](https://codeclimate.com/github/kalisio/kNotify/coverage)
[![Dependency Status](https://img.shields.io/david/kalisio/kNotify.svg?style=flat-square)](https://david-dm.org/kalisio/kNotify)

> Basic utils to support notifications (push, emails, etc.) for Kaelia applications and services

## Installation

```
npm install kNotify --save
// Or with Yarn
yarn add kNotify
```

## Documentation

The [kDocs](https://kalisio.gitbooks.io/kalisio/) are loaded with awesome stuff and tell you everything you need to know about using and configuring Kalisio.

## Tests

To make test run we need two gmail accounts:
* support@kalisio.xyz used as email sender
* test@kalisio.xyz used as user test email

The first one should authorise connection by email/password on https://myaccount.google.com/lesssecureapps.

The second one requires OAuth2 to be able to read emails using the GMail API. The simplest way is by creating a service account for a JWT-based authentication. Interesting issue to make all the configuration work can be found [here](https://stackoverflow.com/a/29328258).

Standard OAuth2 with refresh token might also be used as detailed [here](https://medium.com/@pandeysoni/nodemailer-service-in-node-js-using-smtp-and-xoauth2-7c638a39a37e) and [here](https://medium.com/@pandeysoni/nodemailer-service-in-node-js-using-smtp-and-xoauth2-7c638a39a37e).

Details on how to use Google APIs from Node.js [here](https://github.com/google/google-api-nodejs-client#authorizing-and-authenticating).

## License

Copyright (c) 2017 Kalisio

Licensed under the [MIT license](LICENSE).
