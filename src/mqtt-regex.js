import escapeRegex from 'escape-string-regexp'
import { addHexPrefix, bufferToHex, setLengthLeft } from 'ethereumjs-util'
//
// Inspired from mqtt-regex (from RangerMauve) https://github.com/RangerMauve/mqtt-regex
//

// Mqtt Regexp
export default class MqttRegex {
  constructor(rawTopic) {
    const topic = rawTopic.toLowerCase()

    // tokens
    const tokens = MqttRegex.tokanize(topic)

    // set params
    this.topic = tokens.join('/')
    this.rawTopic = topic
    this.regex = MqttRegex.makeRegex(tokens.map(MqttRegex.processToken))
    this.exec = this.exec.bind(this)
  }

  exec(rawTopic) {
    const topic = rawTopic.toLowerCase()
    return this.regex.exec(topic)
  }

  static tokanize(rawTopic) {
    const topic = rawTopic.toLowerCase()
    const tokens = topic.split('/')
    if (tokens.length >= 4 && tokens[0].includes(':log')) {
      for (let i = 4; i < tokens.length; i++) {
        if (tokens[i] !== '+' && tokens[i] !== '#') {
          tokens[i] = bufferToHex(setLengthLeft(addHexPrefix(tokens[i]), 32))
        }
      }
    }

    return tokens
  }

  static makeRegex(tokens) {
    const lastToken = tokens[tokens.length - 1]
    const regexTokens = tokens.map((token, index) => {
      const isLast = lastToken === token
      const beforeMulti =
        index === tokens.length - 2 && lastToken.type === 'multi'
      return isLast || beforeMulti ? token.last : token.piece
    })
    return new RegExp(`^${regexTokens.join('')}$`)
  }

  static processToken(token, index, tokens) {
    const last = index === tokens.length - 1

    if (!token || token.trim().length === 0) {
      throw new Error('Topic must not be empty in pattern path.')
    }

    // trim token
    const cleanToken = token.trim()

    if (cleanToken[0] === '+') {
      return {
        type: 'single',
        name: '',
        piece: '([^/#+]+/)',
        last: '([^/#+]+/?)'
      }
    } else if (cleanToken[0] === '#') {
      if (!last) {
        throw new Error('# wildcard must be at the end of the pattern')
      }

      return {
        type: 'multi',
        name: '#',
        piece: '((?:[^/#+]+/)*)',
        last: '((?:[^/#+]+/?)*)'
      }
    }

    const escapedToken = escapeRegex(cleanToken)
    return {
      type: 'raw',
      name: token, // changed from mqtt-regex (RangerMauve)
      piece: `${escapedToken}/`,
      last: `${escapedToken}/?`
    }
  }
}
