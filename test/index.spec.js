/* global describe, it, before */

import chai from 'chai'
import Dagger from '../src/index'

const expect = chai.expect
const removeItem = (array, item) => {
  const index = array.indexOf(item)
  if (index > -1) {
    array.splice(index, 1)
  }
}

describe('Dagger', () => {
  describe('Initialization', () => {
    it('should throw error for no url', () => {
      expect(() => new Dagger()).to.throw(
        '`url` (string) is required as first argument'
      )
    })

    it('should create instance with url', () => {
      const dagger = new Dagger('ws://localhost:1883')
      expect(dagger.url).to.be.equal('ws://localhost:1883')
    })
  })

  describe('Subscribe', () => {
    let dagger
    let noop
    let subscriptions

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      noop = () => {}
      subscriptions = []
    })

    it('should add simple subscription', () => {
      // add subscription
      dagger.on('connected', noop)
      subscriptions.push('connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // add subscription
      dagger.on('latest:block', noop)
      subscriptions.push('latest:block')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // add subscription
      dagger.on('latest:block.number', noop)
      subscriptions.push('latest:block.number')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })

    it('should add subscription with complex topic', () => {
      // add subscription
      dagger.on('latest:addr/0x123456/tx', noop)
      subscriptions.push('latest:addr/0x123456/tx')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // add subscription
      dagger.on('latest:log/0x123456/filter/0x12345678/+', noop)
      subscriptions.push('latest:log/0x123456/filter/0x12345678/+')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })
    it('should add subscription with zerofill topics', () => {
      // add subscription
      const url =
        'latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3cf/0x00000000000000000000000000000000000007da82c7ab4771ff031b66536cf9/0x00000000000000000000000000000000000007da82c7ab4771ff031b66536cf9/+'
      dagger.on(url, noop)
      subscriptions.push(url)
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })
  })

  describe('Unsubscribe', () => {
    let dagger
    let noop
    let subscriptions

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      noop = () => {}
      subscriptions = ['connected', 'latest:block', 'latest:block.number']

      dagger.on('connected', noop)
      dagger.on('latest:block', noop)
      dagger.on('latest:block.number', noop)
    })

    it('should remove subscription', () => {
      // remove subscription
      dagger.off('connected', noop)
      removeItem(subscriptions, 'connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // remove subscription
      dagger.off('latest:block', noop)
      removeItem(subscriptions, 'latest:block')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // remove subscription
      dagger.off('latest:block.number', noop)
      removeItem(subscriptions, 'latest:block.number')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })
    it('should remove subscription zerofill topics ', () => {
      // remove subscription
      const url =
        'latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3cf/0x7da82c7ab4771ff031b66536cf9/0x7da82c7ab4771ff031b66536cf9/+'
      dagger.off(url, noop)
      removeItem(
        subscriptions,
        'latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3cf/0x7da82c7ab4771ff031b66536cf9/0x7da82c7ab4771ff031b66536cf9/+'
      )
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })

    it('should not remove subscription if atleast one subscription is there', () => {
      const noop2 = () => {}

      dagger.on('connected', noop)
      dagger.on('connected', noop2)
      dagger.on('latest:block', noop)
      dagger.on('latest:block.number', noop)
      subscriptions = ['connected', 'latest:block', 'latest:block.number']
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      dagger.off('connected', noop)
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      dagger.off('connected', noop2)
      removeItem(subscriptions, 'connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })

    it('should remove all subscriptions', () => {
      const noop2 = () => {}
      const noop3 = () => {}

      dagger.on('connected', noop)
      dagger.on('connected', noop2)
      dagger.on('connected', noop3)
      subscriptions.push('connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      dagger.off('connected', noop)
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      dagger.removeAllListeners('connected')
      removeItem(subscriptions, 'connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })
  })

  describe('Subscribe once', () => {
    let dagger
    let noop
    let subscriptions
    let emitMatch

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      noop = () => {}
      subscriptions = []
      emitMatch = (eventName, data) => {
        dagger.getMatchingTopics(eventName).forEach(topic => {
          dagger.emit(topic, data)
        })
      }
    })

    it('should add simple subscription for once', () => {
      // add subscription
      dagger.once('connected', noop)
      subscriptions.push('connected')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // emit
      emitMatch('connected', false) // should have removed subscription
      expect(dagger.getSubscriptions()).to.deep.equal([])
      // remove item from subscription
      removeItem(subscriptions, 'connected') // remove 'connected'

      // add subscription
      dagger.once('latest:block', noop)
      dagger.once('latest:block.number', noop)

      subscriptions.push('latest:block')
      subscriptions.push('latest:block.number')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      // emit
      emitMatch('latest:block', { number: 1 }) // should have removed subscription
      removeItem(subscriptions, 'latest:block') // remove 'latest:block'
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      const noop2 = () => {}
      dagger.on('latest:block.number', noop2)

      // emit (will not remove subscriptions as there were two subscription)
      emitMatch('latest:block.number', 1)
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
      expect(dagger.getSubscriptions()).not.deep.equal([])

      // remove remaining callback
      dagger.off('latest:block.number', noop2)
      expect(dagger.getSubscriptions()).not.deep.equal(subscriptions)
      expect(dagger.getSubscriptions()).to.deep.equal([])
    })

    it('should add complex subscription once', () => {
      dagger.once('latest:addr/+/tx', noop)
      expect(dagger.getSubscriptions()).to.deep.equal(['latest:addr/+/tx'])

      emitMatch('latest:addr/0x123456/tx', { tx: 1 })
      expect(dagger.getSubscriptions()).to.deep.equal([])

      dagger.once('latest:log/0x12A456/filter/#', noop)
      expect(dagger.getSubscriptions()).to.deep.equal([
        'latest:log/0x12a456/filter/#'
      ])

      emitMatch('latest:log/0x12a456/filter/0x1/0x2', { id: 'log1' })
      expect(dagger.getSubscriptions()).to.deep.equal([])
    })
  })

  describe('Room', () => {
    let dagger
    let room
    let noop
    let subscriptions

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      noop = () => {}
      subscriptions = []
    })

    it('should add subscriptions based on room: latest', () => {
      room = dagger.of('latest')
      room.on('block', noop)
      subscriptions.push('latest:block')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      room.on('addr/0x123456/tx', noop)
      subscriptions.push('latest:addr/0x123456/tx')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })

    it('should add subscriptions based on room: confirmed', () => {
      room = dagger.of('confirmed')
      room.on('block.number', noop)
      subscriptions.push('confirmed:block.number')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)

      room.on('addr/0x123456/tx', noop)
      subscriptions.push('confirmed:addr/0x123456/tx')
      expect(dagger.getSubscriptions()).to.deep.equal(subscriptions)
    })
  })

  describe('Match', () => {
    let dagger
    let noop

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      noop = () => {}
    })

    it('should match simple topics', () => {
      dagger.on('connected', noop)
      expect(dagger.getMatchingTopics('connected')).to.deep.equal(['connected'])

      dagger.on('latest:block.number', noop)
      expect(dagger.getMatchingTopics('latest:block.number')).to.deep.equal([
        'latest:block.number'
      ])
    })

    it('should match wildcard + topics', () => {
      dagger.on('latest:addr/+/tx', noop)
      expect(dagger.getMatchingTopics('latest:addr/0x123456/tx')).to.deep.equal(
        ['latest:addr/+/tx']
      )
      expect(dagger.getMatchingTopics('latest:addr/0xabcdef/tx')).to.deep.equal(
        ['latest:addr/+/tx']
      )
      expect(dagger.getMatchingTopics('latest:addr/tx')).to.deep.equal([])

      dagger.on('latest:addr/+/tx/+', noop)
      expect(
        dagger.getMatchingTopics('latest:addr/0x123456/tx/in')
      ).to.deep.equal(['latest:addr/+/tx/+'])
      expect(
        dagger.getMatchingTopics('latest:addr/0xabcdef/tx/in')
      ).to.deep.equal(['latest:addr/+/tx/+'])
      expect(dagger.getMatchingTopics('latest:addr/tx/in')).to.deep.equal([])
      expect(
        dagger.getMatchingTopics('latest:addr/0x123456/tx/out')
      ).to.deep.equal(['latest:addr/+/tx/+'])
      expect(
        dagger.getMatchingTopics('latest:addr/0xabcdef/tx/out')
      ).to.deep.equal(['latest:addr/+/tx/+'])
      expect(dagger.getMatchingTopics('latest:addr/tx/in')).to.deep.equal([])
    })

    it('should match wildcard # topics', () => {
      dagger.on('latest:log/0x1234567/filter/#', noop)
      expect(
        dagger.getMatchingTopics('latest:log/0x1234567/filter')
      ).to.deep.equal(['latest:log/0x1234567/filter/#'])
      expect(
        dagger.getMatchingTopics('latest:log/0x1234567/filter/0x9876543')
      ).to.deep.equal(['latest:log/0x1234567/filter/#'])
      expect(
        dagger.getMatchingTopics('latest:log/0x1234567/filter/0x9876543/0xface')
      ).to.deep.equal(['latest:log/0x1234567/filter/#'])
      expect(
        dagger.getMatchingTopics(
          'latest:log/0x1234567/filter/0x9876543/0xdeadbeef'
        )
      ).to.deep.equal(['latest:log/0x1234567/filter/#'])
      expect(
        dagger.getMatchingTopics('latest:log/0xabcdefg/filter')
      ).to.deep.equal([])
    })
  })
})
