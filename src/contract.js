// private watch
const _watch = (subscription, method, c) => {
  if (!c) {
    throw new Error('callback is required!')
  }

  if (subscription.callback) {
    return subscription
  }

  subscription.callback = (log, ...args) => {
    // eslint-disable-line no-param-reassign
    const event = subscription._eventOptions.event
    const clonedLog = JSON.parse(JSON.stringify(log))
    const parsedLog = subscription.contract._decodeEventABI.call(
      event,
      clonedLog
    )
    c(parsedLog, ...args)
  }

  subscription.dagger[method](subscription.route, subscription.callback)
  return subscription
}

/**
 * Event subscription
 */
class EventSubscription {
  constructor(dagger, contract, name, options = {}) {
    this.dagger = dagger
    this.contract = contract
    this.name = name
    this.options = options

    // set room
    this.options.room = this.options.room || 'latest'
    this.options.filter = this.options.filter || {}

    // get event options
    this._eventOptions = this.contract._generateEventOptions(
      this.name,
      this.options
    )

    // build topics
    let topics = this._eventOptions.params.topics
    if (topics && topics.length > 0) {
      topics = topics.map(t => (t || '+').toLowerCase())
    } else {
      // for all events
      topics = ['#']
    }

    // set route
    const address = this.contract.options.address.toLowerCase()
    this.route = `${this.options.room}:log/${address}/filter/${topics.join(
      '/'
    )}`
  }

  watch(fn) {
    return _watch(this, 'on', fn)
  }

  watchOnce(fn) {
    return _watch(this, 'once', fn)
  }

  stopWatching() {
    if (!this.callback) {
      return this
    }

    this.dagger.off(this.route, this.callback)
    this.callback = null
    return this
  }
}

/**
 * @file contract.js
 *
 * To initialize a contract use:
 *
 *  var contract = new dagger.Contract(dagger, web3Contract);
 */
export default class Contract {
  constructor(dagger, contract) {
    // events
    this.events = {}

    // set properties
    this.dagger = dagger
    this.contract = contract
  }

  set contract(value) {
    this._contract = value

    // events
    Object.keys(this._contract.events).forEach(name => {
      this.events[name] = this.subscription.bind(this, name)
      // storing old subscription (in case)
      this.events[name]._oldSubscription = this._contract.events[name]
    })
  }

  get contract() {
    return this._contract
  }

  subscription(name, options) {
    if (!this.contract.options.address) {
      throw new Error('contract address is required for subscription')
    }

    return new EventSubscription(this.dagger, this.contract, name, options)
  }
}
