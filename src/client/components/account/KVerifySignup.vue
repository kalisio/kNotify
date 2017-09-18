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
              {{ message }}.
            </p>
          </div>
          <div class="self-center">
            <a @click="$router.push({name: 'resend-verify-signup'})">
              Resend verification email -
            </a>
            &nbsp;&nbsp;
            <a @click="$router.push({name: 'login'})">
              Log in or back to home
            </a>
          </div>
      </div>
    </div>
  </k-screen>
</template>

<script>
import _ from 'lodash'
import { QSpinner, QIcon } from 'quasar'
import { mixins as coreMixins } from 'kCore/client'
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
      verified: false
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
  created () {
    // Retrieve the loadComponent function and load the components
    // We need this so that we can dynamically load the component
    // with a function that has previously been statically analyzed by the bundler (eg webpack)
    let loadComponent = this.$store.get('loadComponent')
    this.$options.components['k-screen'] = loadComponent('frame/KScreen')
  },
  mounted () {
    this.title = 'Email verification'
    this.message = 'Please wait while verifying your email'
    this.verifySignup(this.$route.params.token)
    .then(user => {
      this.title = 'Email verified'
      this.message = `Your email address ${user.email} has been verified`
      this.verified = true
      this.verifying = false
    })
    .catch(error => {
      this.title = 'Email verification error'
      const type = _.get(error, 'errors.$className')
      switch (type) {
        case 'isNotVerified':
        case 'nothingToVerify':
          this.message = 'Your email address has already been verified'
          break
        case 'badParams':
          this.message = 'Your email address has already been verified or your account has been removed'
          break
        case 'verifyExpired':
          this.message = 'The delay to verify has expired, please resend the verification email with the link below'
          break
        default:
          this.message = 'Your email address has not been verified'
      }
      this.verified = false
      this.verifying = false
    })
  }
}
</script>
