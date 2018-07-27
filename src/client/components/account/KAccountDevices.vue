<template>
  <!-- 
    Devices collection
  -->
  <div class="content">
    <div class="column items-center">
      <q-icon size="2rem" name="error_outline" class="float-left"/>
      {{$t('KAccountDevices.DEVICES_USED')}}<br /><br />
    </div>
    <div v-if="items.length > 0" class="column justify-center">
      <div class="row">
        <k-device-card v-for="item in items" :id="item.uuid" :key="item.uuid" :item="item" />
      </div>
    </div>
    <div v-else class="column items-center">
      <div>
        <q-icon size="2rem" name="error_outline" />
      </div>
      <div class="message">
        {{$t('KGrid.EMPTY_GRID')}}
      </div>
    </div>
  </div>
</template>

<script>
import { QIcon, Events } from 'quasar'
import { mixins as coreMixins } from 'kCore/client'

export default {
  name: 'k-account-devices',
  components: {
    QIcon
  },
  data () {
    return {
    }
  },
  computed: {
  },
  mixins: [coreMixins.baseCollection],
  methods: {
    refreshCollection() {
      this.items = this.$store.get('user.devices', [])
      this.nbTotalItems = this.items.length
      this.$emit('collection-refreshed')
    }
  },
  created () {
    // Load the required components
    this.$options.components['k-device-card'] = this.$load('account/KDeviceCard')
    this.refreshCollection()
    // Whenever the user is updated, update collection as well
    Events.$on('user-changed', this.refreshCollection)
  },
  beforeDestroy () {
    Events.$off('user-changed', this.refreshCollection)
  },
  mounted () {
    
  }
}
</script>
