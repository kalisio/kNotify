// Hook computing default abilities for a given user
export function defineUserAbilities (subject, can, cannot) {
  // Verification email, reset password, etc.
  can('service', 'account')
  can('create', 'account')
  can('service', 'devices')
  can('update', 'devices')
}
