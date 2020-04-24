/* global describe, it, before */

import chai from 'chai'
import MqttRegex from '../src/mqtt-regex'

chai.expect()

const expect = chai.expect
const topics = [
  {
    topic: 'connected',
    tokens: ['connected'],
    matches: { connected: true }
  },
  {
    topic: 'latest:block.number',
    tokens: ['latest:block.number'],
    matches: { 'latest:block.number': true, 'latest/block.number': false }
  },
  {
    topic: 'latest:block',
    tokens: ['latest:block'],
    matches: { 'latest:block': true, 'latest/block': false }
  },
  {
    topic: 'latest:addr/0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359/tx',
    tokens: ['latest:addr', '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359', 'tx'],
    matches: {
      'latest:addr/0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359/tx': true,
      'latest:addr/any/tx': false
    }
  },
  {
    topic: 'latest:addr/+/tx',
    tokens: ['latest:addr', '+', 'tx'],
    matches: {
      'latest:addr/0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359/tx': true,
      'latest:addr/0xfb6916095ca1df60bb79ce92ce3ea74c37c5d360/tx': true,
      'latest:addr/0xfb6916095/tx': true
    }
  },
  {
    topic: 'latest:log/+/filter/#',
    tokens: ['latest:log', '+', 'filter', '#'],
    matches: {
      'latest:log/0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359/filter/0x12345': true,
      'latest:log/0xfb6916095ca1df60bb79ce92ce3ea74c37c5d360/filter/0x12345/0x123456': true
    }
  }
]

describe('MqttRegex', () => {
  describe('Initialization', () => {
    let mqttRegex
    const topic = 'latest:block.number'
    before(() => {
      mqttRegex = new MqttRegex(topic)
    })

    it('should return topic properly', () => {
      expect(mqttRegex.topic).to.be.equal(topic)
    })
  })

  describe('Static methods', () => {
    it('should tokanize', () => {
      topics.forEach(t => {
        expect(MqttRegex.tokanize(t.topic)).to.deep.equal(t.tokens)
      })
    })
  })

  describe('Exec should work', () => {
    it('should match topic', () => {
      topics.forEach(t => {
        const mqttRegex = new MqttRegex(t.topic)
        Object.keys(t.matches).forEach(key => {
          const value = t.matches[key]
          expect(mqttRegex.exec(key) != null).to.be.equal(value)
        })
      })
    })
  })
})
