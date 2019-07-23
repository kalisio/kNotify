<template>
  <q-banner
    rounded 
    class="bg-warning text-white"
    v-if="!isVerified"
  >
    {{$t('KSignupAlert.TITLE')}}
    <q-collapsible icon="explore" :label="$t('KSignupAlert.HELP_LABEL')">
      <p v-html="$t('KSignupAlert.HELP_TEXT')" />
    </q-collapsible>
    <q-collapsible icon="explore" :label="$t('KSignupAlert.EMAIL_LABEL')">
      <p v-html="$t('KSignupAlert.EMAIL_TEXT')" />
    </q-collapsible>
    <template v-slot:action>
      <q-btn flat color="white" label="$t('KSignupAlert.ACTION')" @click="resendVerifySignup(email)" />
    </template>
  </q-banner>
</template>

<script>
import mixins from '../../mixins'

export default {
  name: 'k-signup-alert',
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
