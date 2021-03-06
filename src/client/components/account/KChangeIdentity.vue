<template>
  <k-screen :title="title">
    <div slot="screen-content">
      <div class="column justify-center">
          <div :class="textClass">
            <p>
              <q-spinner v-show="applying"/>
              <q-icon name="check" v-show="applied && !applying"/>
              <q-icon name="error" v-show="!applied && !applying"/>
              &nbsp;&nbsp;
              {{message}}.
            </p>
          </div>
          <div class="self-center">
            <a v-if="!applying && !applied" @click="$router.push({name: 'send-change-identity'})">
              {{$t('KChangeIdentity.ACTION')}}
            </a>
            <span v-if="!applying && !applied">&nbsp;-&nbsp;</span>
            <a @click="$router.push({name: (authenticated ? 'home' : 'login')})">
              {{$t('KChangeIdentity.BACK_LINK')}}
            </a>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import _ from 'lodash'
import { QSpinner, QIcon } from 'quasar'
import { mixins as coreMixins } from '@kalisio/kdk-core/client'
import mixins from '../../mixins'

export default {
  name: 'k-change-identity',
  components: {
    QSpinner,
    QIcon
  },
  data () {
    return {
      title: '',
      message: '',
      applying: true,
      applied: false,
      authenticated: false
    }
  },
  computed: {
    textClass () {
      const classObject = {}
      if (!this.applying) {
        classObject['text-positive'] = this.applied
        classObject['text-negative'] = !this.applied
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
    // Retrieve the loadComponent function and load the components
    // We need this so that we can dynamically load the component
    // with a function that has previously been statically analyzed by the bundler (eg webpack)
    this.$options.components['k-screen'] = this.$load('frame/KScreen')
    // Check if logged in
    this.$events.$on('user-changed', this.refreshUser)
  },
  beforeDestroy () {
    this.$events.$off('user-changed', this.refreshUser)
  },
  async mounted () {
    this.title = this.$t('KChangeIdentity.VERIFICATION_TITLE')
    this.message = this.$t('KChangeIdentity.VERIFICATION_MESSAGE')
    try {
      const user = await this.verifySignup(this.$route.params.token)
      this.title = this.$t('KChangeIdentity.SUCCESS_TITLE')
      this.message = this.$t('KChangeIdentity.SUCCESS_MESSAGE', { email: user.email })
      this.applied = true
    } catch(error) {
      this.title = this.$t('KChangeIdentity.ERROR_TITLE')
      const type = _.get(error, 'errors.$className')
      switch (type) {
        case 'isNotVerified':
        case 'nothingToVerify':
          this.message = this.$t('KChangeIdentity.ERROR_MESSAGE_ALREADY_APPLIED')
          break
        case 'badParams':
          this.message = this.$t('KChangeIdentity.ERROR_MESSAGE_BAD_PARAMS')
          break
        case 'verifyExpired':
          this.message = this.$t('KChangeIdentity.ERROR_MESSAGE_VERIFY_EXPIRED')
          break
        default:
          this.message = this.$t('KChangeIdentity.ERROR_MESSAGE_DEFAULT')
      }
      this.applied = false
    }
    this.applying = false
  }
}
</script>
