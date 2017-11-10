<template>
  <k-screen :title="title">
    <div slot="screen-content">
      <div class="column justify-center sm-gutter">
          <div :class="textClass">
            <p>
              <q-icon name="check" v-show="changed && success"/>
              <q-icon name="error" v-show="changed && !success"/>
              &nbsp;&nbsp;
              {{ message }}.
            </p>
            <p v-show="changed && success">
              <q-icon name="keyboard_backspace"/>
              &nbsp;&nbsp;
              <a @click="$router.push({name: 'home'})">
              Back to home
              </a>
            </p>
          </div>
          <div>
            <k-form ref="form" :schema="schema" />
          </div>
          <div>
            <div class="row justify-around">
              <q-btn color="primary" loader @click="onChange">Change</q-btn>
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
  name: 'k-change-password',
  components: {
    QBtn,
    QIcon
  },
  data () {
    return {
      title: '',
      message: '',
      success: false,
      changed: false,
      schema: {
        "$schema": "http://json-schema.org/draft-06/schema#",
        "$id": "http://kalisio.xyz/schemas/change-password.json#",
        "title": "Change Password form",
        "description": "Change password form",
        "type": "object",
        "properties": {
          "oldPassword": { 
            "type": "string", 
            "field": {
              "component": "form/KPasswordField",
              "label": "Old password",
              "helper": "Enter your old password",
            }
          },
          "password": { 
            "type": "string",
            "field": {
              "component": "form/KPasswordField",
              "label": "New password",
              "helper": "Type your new password",
            }
          },
          "confirmPassword": { 
            "const": { 
              "$data": "1/password" 
            },
            "field": {
              "component": "form/KPasswordField",
              "label": "Confirm new password",
              "helper": "Type your new password again",
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
      if (this.changed) {
        classObject['text-positive'] = this.success
        classObject['text-negative'] = !this.success
      }
      return classObject
    }
  },
  mixins: [mixins.account],
  methods: {
    onChange (event, done) {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        this.changePassword(this.$store.get('user.email'), result.values.oldPassword, result.values.password)
        .then(_ => {
          this.message = 'Password changed, you will receive a confirmation email'
          this.changed = true
          this.success = true
          done()
        })
        .catch(error => {
          const type = _.get(error, 'errors.$className')
          switch (type) {
            case 'badParams':
              this.message = 'Your password has already been changed or your account has been removed'
              break
            default:
              this.message = 'Error while trying to change password, please try again later'
          }
          this.changed = true
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
    this.title = 'Change password'
    this.message = 'Please enter your old and new passwords to proceed'
  }
}
</script>
