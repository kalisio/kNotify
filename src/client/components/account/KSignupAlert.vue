<template>
  <div>
    <q-banner
      rounded 
      class="bg-warning text-black fixed"
      style="top: 18px"
      v-if="!isVerified"
    >
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
      <template v-slot:action>
        <q-btn flat color="black" :label="$t('KSignupAlert.ACTION')" @click="resendVerifySignup(email)" />
      </template>
    </q-banner>
  </div>
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
