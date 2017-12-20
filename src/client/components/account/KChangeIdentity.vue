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
              {{ message }}.
            </p>
          </div>
          <div class="self-center">
            <a @click="$router.push({name: 'send-change-identity'})">
              Resend change email -
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
      applied: false
    }
  },
  computed: {
    textClass () {
      let classObject = {}
      if (!this.applying) {
        classObject['text-positive'] = this.applied
        classObject['text-negative'] = !this.applied
      }
      return classObject
    }
  },
  mixins: [coreMixins.authentication, mixins.account],
  created () {
    // Retrieve the loadComponent function and load the components
    // We need this so that we can dynamically load the component
    // with a function that has previously been statically analyzed by the bundler (eg webpack)
    this.$options.components['k-screen'] = this.$load('frame/KScreen')
  },
  mounted () {
    this.title = 'Changes verification'
    this.message = 'Please wait while applying your changes'
    this.verifySignup(this.$route.params.token)
    .then(user => {
      this.title = 'Changes applied'
      this.message = `Your email address ${user.email} has been changed`
      this.applied = true
      this.applying = false
    })
    .catch(error => {
      this.title = 'Changes error'
      const type = _.get(error, 'errors.$className')
      switch (type) {
        case 'isNotVerified':
        case 'nothingToVerify':
          this.message = 'Your changes have already been applied'
          break
        case 'badParams':
          this.message = 'Your changes have already been verified or your account has been removed'
          break
        case 'verifyExpired':
          this.message = 'The delay to apply your changes has expired, please resend the changes email with the link below'
          break
        default:
          this.message = 'Your changes have not been applied'
      }
      this.applied = false
      this.applying = false
    })
  }
}
</script>
