<template>
  <q-alert
    color="warning"
    enter="bounceInRight"
    leave="bounceOutRight"
    v-if="!isVerified"
    position="bottom"
    appear
    dismissible
    :actions="[{label: 'Resend verification email', handler () { resendVerifySignup(email) } }]"
  >
    Your email address has not been verified, please check your mailbox.
    <q-collapsible icon="explore" label="Why should I verify my email address?">
      <p>
        Verifying your email address improves the security of your account. 
        Once you have verified your email address, both your password and access to your email account are required
        in order to make any changes to your account credentials, such as your password and contact email address.
        This helps further protect your account from being stolen by a potential phisher.
      </p>
    </q-collapsible>
    <q-collapsible icon="explore" label="I never received the verification email, what should I do?">
      <p>
        If you do not receive your signup verification email and you are running a Spam filter, check and make sure the message has not been filtered as spam. 
        Please try adding "email-notifications@kalisio.com" to your contacts or trusted senders list within your email client and attempt to re-verify your email address.
        You can also click the button below and we'll send you the email again.
      </p>
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
