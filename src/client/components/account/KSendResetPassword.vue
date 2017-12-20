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
  name: 'k-send-reset-password',
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
        "$id": "http://kalisio.xyz/schemas/send-reset-password#",
        "title": "Send reset password form",
        "description": "Send reset password form",
        "type": "object",
        "properties": {
          "email": { 
            "type": "string", 
            "format": "email",
            "field": {
              "component": "form/KEmailField",
              "label": "Email",
              "helper": "Enter your email address",
            }
          }
        },
        "required": ["email"],
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
        this.sendResetPassword(result.values.email)
        .then(_ => {
          this.message = 'Email sent, please check your inbox'
          this.sent = true
          this.success = true
          done()
        })
        .catch(error => {
          const type = _.get(error, 'errors.$className')
          switch (type) {
            case 'isVerified':
              this.message = 'Check your inbox and verify your email address first'
              break
            default:
              this.message = 'Error while sending email, please check the address and send it again or try again later'
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
    this.$options.components['k-screen'] = this.$load('frame/KScreen')
    this.$options.components['k-form'] = this.$load('form/KForm')
  },
  mounted () {
    this.title = 'Send reset password email'
    this.message = 'We\'ll email you instructions on how to reset your password'
  }
}
</script>
