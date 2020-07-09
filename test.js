const Dagger = require('./')
const dagger = new Dagger('wss://mainnet.dagger.matic.network')

const fn = function(d) {
  console.log(d)
}

dagger.on('latest:block', fn)
