<template>
  <k-screen :title="title">
    <div slot="screen-content">
      <div class="column justify-center sm-gutter">
          <div :class="textClass">
            <p>
              <q-icon name="check" v-show="sent && success"/>
              <q-icon name="error" v-show="sent && !success"/>
              &nbsp;&nbsp;
              {{ message }}.
            </p>
          </div>
          <div>
            <k-form ref="form" :schema="schema" />
          </div>
          <div>
            <div class="row justify-around">
              <q-btn color="primary" loader @click="onSend">Send</q-btn>
            </div>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import { QBtn, QIcon } from 'quasar'
import mixins from '../../mixins'

export default {
  name: 'k-send-change-identity',
  components: {
    QBtn,
    QIcon
  },
  data () {
    return {
      title: '',
      message: '',
      success: false,
      sent: false,
      schema: {
        "$schema": "http://json-schema.org/draft-06/schema#",
        "$id": "http://kalisio.xyz/schemas/send-change-identity#",
        "title": "Send change identity form",
        "description": "Send change identity form",
        "type": "object",
        "properties": {
          "password": { 
            "type": "string",
            "field": {
              "component": "form/KPasswordField",
              "label": "Password",
              "helper": "Type your password",
            }
          },
          "email": { 
            "type": "string", 
            "format": "email",
            "field": {
              "component": "form/KEmailField",
              "label": "New email",
              "helper": "Enter your new email address",
            }
          }
        },
        "required": ["email", "password"],
        "form": {
          "type": "object",
          "properties":  {
            "icon": false,
            "label": true,
            "labelWidth": 3
          }
        }
      }
    }
  },
  computed: {
    textClass () {
      let classObject = {}
      if (this.sent) {
        classObject['text-positive'] = this.success
        classObject['text-negative'] = !this.success
      }
      return classObject
    }
  },
  mixins: [mixins.account],
  methods: {
    onSend (event, done) {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        this.sendChangeIdentity(this.$store.get('user.email'), result.values.email, result.values.password)
        .then(_ => {
          this.message = 'Email sent, please check your inbox'
          this.sent = true
          this.success = true
          done()
        })
        .catch(error => {
          const type = _.get(error, 'errors.$className')
          const password = _.get(error, 'errors.password')
          switch (type) {
            case 'badParams':
              this.message = (password ? 'Please enter your correct password and try again' : 'Your identity has already been changed or your account has been removed')
              break
            default:
              this.message = 'Error while sending email, please try again later'
          }
          this.sent = true
          this.success = false
          done()
        })
      } else {
        done()
      }
    },
  },
  created () {
    // Retrieve the loadComponent function and load the components
    // We need this so that we can dynamically load the component
    // with a function that has previously been statically analyzed by the bundler (eg webpack)
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-screen'] = loadComponent('frame/KScreen')
    this.$options.components['k-form'] = loadComponent('form/KForm')
  },
  mounted () {
    this.title = 'Change email'
    this.message = 'Please enter your password and new email address to proceed'
  }
}
</script>
