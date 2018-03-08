<template>
  <q-alert
    color="warning"
    enter="bounceInRight"
    leave="bounceOutRight"
    v-if="!isVerified"
    position="bottom"
    appear
    dismissible
    :actions="[{label: $t('KSignupAlert.ACTION'), handler () { resendVerifySignup(email) } }]"
  >
    {{$t('KSignupAlert.TITLE')}}
    <q-collapsible icon="explore" :label="$t('KSignupAlert.HELP_LABEL')">
      <p v-html="$t('KSignupAlert.HELP_TEXT')" />
    </q-collapsible>
    <q-collapsible icon="explore" :label="$t('KSignupAlert.EMAIL_LABEL')">
      <p v-html="$t('KSignupAlert.EMAIL_TEXT')" />
    </q-collapsible>
  </q-alert>
</template>

<script>
import { QAlert, QCollapsible } from 'quasar'
import mixins from '../../mixins'

export default {
  name: 'k-signup-alert',
  components: {
    QAlert,
    QCollapsible
  },
  props: {
    isVerified: {
      type: Boolean,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  mixins: [mixins.account],
  computed: {
    showAlert () {
      return !this.isVerified
    }
  }
}
</script>
