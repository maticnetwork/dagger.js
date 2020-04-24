const Dagger = require('./')
const dagger = new Dagger('https://ropsten.dagger.matic.network/')

dagger.once(
  'latest:block.number',
  result => {
    console.log('function result', result)
  }
)
