export function checkUnique (hook) {
  const accountService = hook.app.getService('account')
  return accountService.create({
    action: 'checkUnique',
    value: { email: hook.data.email }
  })
    .then(() => hook)
}
