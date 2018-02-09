import escapeRegex from 'escape-string-regexp'

//
// Inspired from mqtt-regex (from RangerMauve) https://github.com/RangerMauve/mqtt-regex
//

// Mqtt Regexp
export default class MqttRegex {
  constructor(topic) {
    // tokens
    const tokens = MqttRegex.tokanize(topic).map(MqttRegex.processToken)

    // set params
    this.topic = topic
    this.regex = MqttRegex.makeRegex(tokens)
    this.exec = this.exec.bind(this)
  }

  exec(topic) {
    return this.regex.exec(topic)
  }

  static tokanize(topic) {
    return topic.split('/')
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
