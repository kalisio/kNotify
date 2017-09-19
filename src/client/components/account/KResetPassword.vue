<template>
  <k-screen :title="title">
    <div slot="screen-content">
      <div class="column justify-center sm-gutter">
          <div :class="textClass">
            <p>
              <q-icon name="check" v-show="reset && success"/>
              <q-icon name="error" v-show="reset && !success"/>
              &nbsp;&nbsp;
              {{ message }}.
            </p>
          </div>
          <div>
            <k-form ref="form" :schema="schema" />
          </div>
          <div>
            <div class="row justify-around">
              <q-btn color="primary" loader @click="onReset">Reset</q-btn>
            </div>
          </div>
          <div class="self-center">
            <a @click="$router.push({name: 'send-reset-password'})">
              Resend reset password email
            </a>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import { QBtn, QIcon } from 'quasar'
import mixins from '../../mixins'

export default {
  name: 'k-reset-password',
  components: {
    QBtn,
    QIcon
  },
  data () {
    return {
      title: '',
      message: '',
      success: false,
      reset: false,
      schema: {
        "$schema": "http://json-schema.org/draft-06/schema#",
        "$id": "http://kalisio.xyz/schemas/reset-password.json#",
        "title": "Reset Password form",
        "description": "Reset password form",
        "type": "object",
        "properties": {
          "password": { 
            "type": "string", 
            "field": {
              "component": "form/KPasswordField",
              "label": "Password",
              "helper": "Enter your password",
            }
          }
        },
        "required": ["password"],
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
      if (this.reset) {
        classObject['text-positive'] = this.success
        classObject['text-negative'] = !this.success
      }
      return classObject
    }
  },
  mixins: [mixins.account],
  methods: {
    onReset (event, done) {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        this.resetPassword(this.$route.params.token, result.values.password)
        .then(_ => {
          this.message = 'Password reset, you will receive a confirmation email'
          this.reset = true
          this.success = true
          done()
        })
        .catch(error => {
          const type = _.get(error, 'errors.$className')
          switch (type) {
            case 'badParams':
              this.message = 'Your password has already been reset or your account has been removed'
              break
            case 'verifyExpired':
              this.message = 'The delay to reset has expired, please resend the reset password email with the link below'
              break
            default:
              this.message = 'Error while trying to reset password, please try again later'
          }
          this.reset = true
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
    this.title = 'Reset password'
    this.message = 'Please enter your new password to proceed'
  }
}
</script>
