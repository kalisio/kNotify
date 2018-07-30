module.exports = {
  all: (data, context) => app.channel('authenticated').filter(connection => false)
}
