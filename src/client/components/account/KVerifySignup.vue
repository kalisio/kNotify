<template>
  <k-screen :title="title">
    <div slot="screen-content">
      <div class="column justify-center">
          <div :class="textClass">
            <p>
              <q-spinner v-show="verifying"/>
              <q-icon name="check" v-show="verified && !verifying"/>
              <q-icon name="error" v-show="!verified && !verifying"/>
              &nbsp;&nbsp;
              {{message}}.
            </p>
          </div>
          <div class="self-center">
            <a v-if="!verifying && !verified" @click="$router.push({name: 'resend-verify-signup'})">
              {{$t('KVerifySignup.RESEND_LINK')}}
            </a>
            <span v-if="!verifying && !verified">&nbsp;-&nbsp;</span>
            <a @click="$router.push({name: (authenticated ? 'home' : 'login')})">
              {{$t('KVerifySignup.BACK_LINK')}}
            </a>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import _ from 'lodash'
import { QSpinner, QIcon, Events } from 'quasar'
import { mixins as coreMixins } from '@kalisio/kCore/client'
import mixins from '../../mixins'

export default {
  name: 'k-verify-signup',
  components: {
    QSpinner,
    QIcon
  },
  data () {
    return {
      title: '',
      message: '',
      verifying: true,
      verified: false,
      authenticated: false
    }
  },
  computed: {
    textClass () {
      let classObject = {}
      if (!this.verifying) {
        classObject['text-positive'] = this.verified
        classObject['text-negative'] = !this.verified
      }
      return classObject
    }
  },
  mixins: [coreMixins.authentication, mixins.account],
  methods: {
    refreshUser () {
      this.authenticated = !_.isNil(this.$store.get('user'))
    }
  },
  created () {
    this.$options.components['k-screen'] = this.$load('frame/KScreen')
    // Check if logged in
    Events.$on('user-changed', this.refreshUser)
  },
  beforeDestroy () {
    Events.$off('user-changed', this.refreshUser)
  },
  mounted () {
    this.title = this.$t('KVerifySignup.TITLE')
    this.message = this.$t('KVerifySignup.MESSAGE')
    this.verifySignup(this.$route.params.token)
    .then(user => {
      this.title = this.$t('KVerifySignup.SUCCESS_TITLE')
      this.message = this.$t('KVerifySignup.SUCCESS_MESSAGE', { email: user.email })
      this.verified = true
      this.verifying = false
    })
    .catch(error => {
      this.title = this.$t('KVerifySignup.ERROR_TITLE')
      const type = _.get(error, 'errors.$className')
      switch (type) {
        case 'isNotVerified':
        case 'nothingToVerify':
          this.message = this.$t('KVerifySignup.ERROR_MESSAGE_NOTHING_TO_VERIFY')
          break
        case 'badParams':
          this.message = this.$t('KVerifySignup.ERROR_MESSAGE_BAD_PARAMS')
          break
        case 'verifyExpired':
          this.message = this.$t('KVerifySignup.ERROR_MESSAGE_VERIFY_EXPIRED')
          break
        default:
          this.message = this.$t('KVerifySignup.ERROR_MESSAGE_DEFAULT')
      }
      this.verified = false
      this.verifying = false
    })
  }
}
</script>
