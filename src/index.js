import mqtt from 'async-mqtt'
import EventEmitter from 'events'
import MqttRegex from './mqtt-regex'
import Room from './room'
import Contract from './contract'

const ROOMS = ['latest', 'confirmed']
export default class Dagger extends EventEmitter {
  constructor(url, options = {}) {
    super()
    if (!url || url instanceof String) {
      throw new Error('`url` (string) is required as first argument')
    }

    // set params
    this.url = url
    this.options = options

    // event params
    this._regexTopics = {}

    // mqtt client
    this._client = mqtt.connect(url, options)
    this._clientConnectPromise = new Promise(resolve => {
      this._client.on('connect', (...args) => {
        if (
          this._clientConnectPromise &&
          !this._clientConnectPromise.resolved
        ) {
          this._clientConnectPromise.resolved = true
          resolve(...args)
        }
      })
      this._client.on('reconnect', () => {
        console.log('reconnecting...')
      })
    })

    // mqtt client events
    this._client.on('message', this._onMessage.bind(this))
    ;['Connect', 'Reconnect', 'Offline', 'Close', 'Error'].forEach(name => {
      this._client.on(name.toLowerCase(), this[`_on${name}`].bind(this))
    })
  }

  _onMessage(topic, data) {
    let payload = data.toString()
    try {
      payload = JSON.parse(payload)
    } catch (e) {
      payload = {}
    }

    // get matching topics
    this.emit('message', payload)
    this.getMatchingTopics(topic).forEach(eventName => {
      this.emit(eventName, payload.data, !!payload.removed, payload)
    })
  }

  _onConnect() {
    this._changeConnectionStatus(true)
  }

  _onReconnect() {
    this.emit('reconnect', this)
  }

  _onOffline() {
    this._changeConnectionStatus(false)
  }

  _onClose() {
    this._changeConnectionStatus(false)
  }

  _onError(error) {
    this.emit('error', error)
  }

  /**
   * close - close connection
   *
   * @returns {Promise} promise - close connection promise
   * @param {Boolean} force - do not wait for all in-flight messages to be acked
   *
   * @api public
   */
  close(force) {
    return this._client.end(force)
  }

  //
  // connection promise
  //

  /**
   * onceConnected - connection promise
   *
   * @returns {Promise} promise - connection promise
   *
   * @api public
   */
  onceConnected() {
    return this._clientConnectPromise
  }

  //
  // core logic
  //

  on(...args) {
    return this.addListener(...args)
  }

  addListener(eventName, listener) {
    const mqttRegex = new MqttRegex(eventName)
    if (!this._regexTopics[mqttRegex.topic]) {
      // subscribe events from server using topic
      this._client.subscribe(mqttRegex.topic)
    }

    // add to listeners using super
    super.addListener(mqttRegex.topic, listener)
    this._regexTopics[mqttRegex.topic] = mqttRegex

    return this
  }

  prependListener(eventName, listener) {
    const mqttRegex = new MqttRegex(eventName)
    if (!this._regexTopics[mqttRegex.topic]) {
      // subscribe events from server using topic
      this._client.subscribe(mqttRegex.topic)
    }

    // add to listeners using super
    super.prependListener(mqttRegex.topic, listener)
    this._regexTopics[mqttRegex.topic] = mqttRegex

    return this
  }

  off(...args) {
    return this.removeListener(...args)
  }

  removeListener(eventName, listener) {
    const mqttRegex = new MqttRegex(eventName)

    // add to listeners using super
    super.removeListener(mqttRegex.topic, listener)

    // if listener count is zero, unsubscribe topic and delete from `_regexTopics`
    if (this.listenerCount(mqttRegex.topic) === 0) {
      // unsubscribe events from server
      this._client.unsubscribe(mqttRegex.topic)
      delete this._regexTopics[mqttRegex.topic]
    }

    return this
  }

  removeAllListeners(eventName) {
    const mqttRegex = new MqttRegex(eventName)

    // unsubscribe events from server
    this._client.unsubscribe(mqttRegex.topic)

    // add to listeners using super
    super.removeAllListeners(mqttRegex.topic)
    delete this._regexTopics[mqttRegex.topic]

    return this
  }

  getMatchingTopics(eventName) {
    const matching = []
    Object.keys(this._regexTopics).forEach(key => {
      const me = this._regexTopics[key]
      if (me && me.exec(eventName)) {
        matching.push(me.topic)
      }
    })

    return matching
  }

  getSubscriptions() {
    return Object.keys(this._regexTopics)
  }

  //
  // Connection status
  //

  /**
   * Get connnection status
   *
   * @returns {Boolean} status - connection status
   *
   * @api public
   */
  connectionStatus() {
    return !!this._changeConnectionStatus._v
  }

  /**
   * _changeConnectionStatus - connection statu change (internal method)
   */
  _changeConnectionStatus(value) {
    if (value !== this._changeConnectionStatus._v) {
      this._changeConnectionStatus._v = value
      this.emit('connection.status', value)
    }
  }

  //
  // Room related stuff
  //

  /**
   * Select room for events: chainable
   */
  of(room) {
    const cleanRoom = room && room.toLowerCase()
    if (!cleanRoom || ROOMS.indexOf(cleanRoom) === -1) {
      throw new Error(`Room must be one of these: ${ROOMS.join(', ')}`)
    }

    return new Room(this, cleanRoom)
  }

  //
  // Web3 stuff
  //

  /**
   * Contract injector
   */
  contract(c) {
    return new Contract(this, c)
  }
}
