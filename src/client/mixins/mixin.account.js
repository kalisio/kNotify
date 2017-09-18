let accountMixin = {
  methods: {
    resendVerifySignup(email) {
      return this.accountService.create({
        action: 'resendVerifySignup',
        value: { email }
      })
    },
    verifySignup(token) {
      return this.accountService.create({
        action: 'verifySignupLong',
        value: token
      })
    },
    sendResetPassword(email) {
      return this.accountService.create({
        action: 'sendResetPwd',
        value: { email }
      })
    },
    resetPassword(token, password) {
      return this.accountService.create({
        action: 'resetPwdLong',
        value: {
          token,
          password
        }
      })
    },
    changePassword(email, oldPassword, password) {
      return this.accountService.create({
        action: 'passwordChange',
        value: {
          user: { email },
          oldPassword,
          password
        }
      })
    },
    changeIdentity(email, token, password) {
      return this.accountService.create({
        action: 'identityChange',
        value: {
          user: email,
          oldPassword,
          password
        }
      })
    },
    verifyIdentityChange(token) {
      return this.verifySignup(token)
    }
  },
  created () {
    this.accountService = this.$api.getService('account')
  }
}

export default accountMixin
