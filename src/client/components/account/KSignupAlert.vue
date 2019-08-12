<template>
  <q-dialog 
    v-model="isVisible" 
    full-width
    position="bottom">
    <q-card class="bg-warning q-pa-md">
      {{$t('KSignupAlert.TITLE')}}
      <q-expansion-item icon="explore" :label="$t('KSignupAlert.HELP_LABEL')">
        <q-card class="bg-warning">
          <q-card-section>
            <p v-html="$t('KSignupAlert.HELP_TEXT')" />
          </q-card-section>
        </q-card>
      </q-expansion-item>
      <q-expansion-item icon="explore" :label="$t('KSignupAlert.EMAIL_LABEL')">
        <q-card class="bg-warning">
          <q-card-section>
            <p v-html="$t('KSignupAlert.EMAIL_TEXT')" />
          </q-card-section>
        </q-card>
      </q-expansion-item>
      <q-card-actions align="right">
        <q-btn flat color="black" :label="$t('KSignupAlert.ACTION')" @click="resendVerifySignup(email)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import mixins from '../../mixins'

export default {
  name: 'k-signup-alert',
  mixins: [mixins.account],
  props: {
    isVerified: {
      type: Boolean,
      required: false
    },
    email: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      isVisible: false
    }
  },
  created () {
    this.isVisible = !this.isVerified
  }
}
</script>
