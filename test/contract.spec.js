/* global describe, it, before */

import chai from 'chai'
import Web3 from 'web3'
import Dagger from '../src/index'
import { abi as ERCABI, TransferLog } from './bat-token-abi'

const expect = chai.expect
const web3 = new Web3()

const BATAddress = '0x0d8775f648430679a709e98d2b0cb6250d2887ef'
const GNTAddress = '0xa74476443119a942de498590fe1f2454d7d4ac0d'

const TransferABI =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ApprovalABI =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'

describe('Contract', () => {
  describe('Initialization', () => {
    let dagger
    let contract

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      contract = dagger.contract(new web3.eth.Contract(ERCABI, BATAddress))
    })

    it('should set route', () => {
      // Transfer method
      let subscription = contract.events.Transfer()
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      )

      subscription = contract.events.Transfer({ filter: { _to: GNTAddress } })
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${TransferABI}/+/${web3.utils.leftPad(
          GNTAddress,
          64
        )}`
      )

      // Approval method
      subscription = contract.events.Approval()
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${ApprovalABI}/+/+`
      )

      subscription = contract.events.Approval({
        filter: { _spender: GNTAddress }
      })
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${ApprovalABI}/+/${web3.utils.leftPad(
          GNTAddress,
          64
        )}`
      )

      subscription = contract.events.Approval({
        filter: { _spender: GNTAddress, _owner: BATAddress }
      })
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${ApprovalABI}/${web3.utils.leftPad(
          BATAddress,
          64
        )}/${web3.utils.leftPad(GNTAddress, 64)}`
      )
    })

    it('should set route for all events', () => {
      // allEvents method
      const subscription = contract.events.allEvents()
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/#`
      )
    })

    it('should set room', () => {
      let subscription = contract.events.Transfer({ room: 'confirmed' })
      expect(subscription.route).to.be.equal(
        `confirmed:log/${BATAddress}/filter/${TransferABI}/+/+`
      )

      subscription = contract.events.Approval({ room: 'confirmed' })
      expect(subscription.route).to.be.equal(
        `confirmed:log/${BATAddress}/filter/${ApprovalABI}/+/+`
      )

      subscription = contract.events.Transfer({ room: 'latest' })
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      )

      subscription = contract.events.Approval({ room: 'latest' })
      expect(subscription.route).to.be.equal(
        `latest:log/${BATAddress}/filter/${ApprovalABI}/+/+`
      )
    })

    it('should set room for all events', () => {
      // allEvents method
      const subscription = contract.events.allEvents({ room: 'confirmed' })
      expect(subscription.route).to.be.equal(
        `confirmed:log/${BATAddress}/filter/#`
      )
    })
  })

  describe('Subscribe and unsubscribe', () => {
    let dagger
    let contract
    let subscription
    let noop
    let emitMatch

    before(() => {
      dagger = new Dagger('ws://localhost:1883')
      contract = dagger.contract(new web3.eth.Contract(ERCABI, BATAddress))
      noop = () => {}
      emitMatch = (eventName, data) => {
        dagger.getMatchingTopics(eventName).forEach(topic => {
          dagger.emit(topic, data)
        })
      }
    })

    it('should watch', () => {
      subscription = contract.events.Transfer()
      expect(subscription.watch).to.throw('callback is required!')

      // start watching
      subscription.watch(noop)
      expect(dagger.getSubscriptions()).to.deep.equal([
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      ])

      // start watching again
      subscription.watch(noop)
      expect(dagger.getSubscriptions()).to.deep.equal([
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      ])
    })

    it('should stop watching', () => {
      // start watching
      subscription.stopWatching()
      expect(dagger.getSubscriptions()).to.deep.equal([])

      // start watching
      subscription.watch(noop)
      expect(dagger.getSubscriptions()).to.deep.equal([
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      ])

      // stop watching
      subscription.stopWatching()
    })

    it('should watch once', () => {
      subscription = contract.events.Transfer()

      // start watching
      subscription.watchOnce(log => {
        expect(log.returnValues._to).to.not.equal(null)
        expect(log.returnValues._from).to.not.equal(null)
        expect(log.returnValues._value).to.not.equal(null)
      })
      expect(dagger.getSubscriptions()).to.deep.equal([
        `latest:log/${BATAddress}/filter/${TransferABI}/+/+`
      ])

      // emit
      emitMatch(
        `latest:log/${BATAddress}/filter/${TransferABI}/0x1/0x2`,
        TransferLog
      )
      expect(dagger.getSubscriptions()).to.deep.equal([])
    })
  })
})
