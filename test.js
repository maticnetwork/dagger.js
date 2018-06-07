const Dagger = require('./').default
const dagger = new Dagger('mqtts://ropsten.dagger.matic.network')
dagger.once('latest:addr/+/tx/out', (result) => {
  console.log(result)
})
