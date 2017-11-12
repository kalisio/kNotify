export function checkUnique (hook) {
  let accountService = hook.app.getService('account')
  return accountService.create({
    action: 'checkUnique',
    value: { email: hook.data.email }
  })
  .then(_ => hook)
}
