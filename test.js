const Dagger = require('./')
const dagger = new Dagger('mqtt://localhost:1883')

dagger.once(
  'latest:log/+/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/0x31271fffeb10f0e3b7d4f132a278fa9a0110448b/+',
  result => {
    console.log('function result', result)
  }
)
