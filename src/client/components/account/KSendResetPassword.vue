<template>
  <k-screen :title="$t('KSendResetPassword.TITLE')">
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
              <q-btn color="primary" loader @click="onSend">
                {{$t('KSendResetPassword.ACTION')}}
              </q-btn>
            </div>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import _ from 'lodash'
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
      message: '',
      success: false,
      sent: false,
      schema: {
        '$schema': 'http://json-schema.org/draft-06/schema#',
        '$id': 'http://kalisio.xyz/schemas/send-reset-password#',
        'title': 'Send reset password form',
        'type': 'object',
        'properties': {
          'email': {
            'type': 'string',
            'format': 'email',
            'field': {
              'component': 'form/KEmailField',
              'helper': 'KSendResetPassword.EMAIL_FIELD_HELPER'
            }
          }
        },
        'required': ['email']
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
    onSend () {
      let result = this.$refs.form.validate()
      if (result.isValid) {
        this.sendResetPassword(result.values.email)
        .then(() => {
          this.message = this.$t('KSendResetPassword.SUCCESS_MESSAGE')
          this.sent = true
          this.success = true
          done()
        })
        .catch(error => {
          const type = _.get(error, 'errors.$className')
          switch (type) {
            case 'isVerified':
              this.message = this.$t('KSendResetPassword.ERROR_MESSAGE_IS_VERIFIED')
              break
            default:
              this.message = this.$t('KSendResetPassword.ERROR_MESSAGE_DEFAULT')
          }
          this.sent = true
          this.success = false
        })
      }
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-screen'] = this.$load('frame/KScreen')
    this.$options.components['k-form'] = this.$load('form/KForm')
    // Components initialization
    this.message = this.$t('KSendResetPassword.MESSAGE')
  }
}
</script>
