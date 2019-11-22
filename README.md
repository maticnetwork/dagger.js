### eth-dagger

[![Build Status](https://travis-ci.org/maticnetwork/eth-dagger.js.svg?branch=master)](https://travis-ci.org/maticnetwork/eth-dagger.js)

eth-dagger is library for dagger project written in node.js and browser. It uses dagger server to get realtime updates from Ethereum Network.

**About dagger**

Dagger helps users to develop faster and better Ethereum DApps. For more information:

- [Installation](#install)
- [Example](#example)
- [Network](#network)
- [Events](#events)
- [API](#api)
- [Examples](#examples)
- [Support](#support)
- [License](#license)

<a name="install"></a>

## Installation

#### NPM
---
```sh
# Using Yarn
yarn add eth-dagger

# Using NPM
npm install @maticnetwork/eth-dagger --save
```

#### Direct `<script>` Include
---

Simply download `lib/eth-dagger.min.js` and include with a script tag. `Dagger` will be registered as a global variable.

Usage:
```js
var Dagger = window.Dagger
```

##### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/eth-dagger/lib/eth-dagger.min.js"></script>
```

Matic is also available on [unpkg](https://unpkg.com/eth-dagger/lib/eth-dagger.min.js)

<a name="network"></a>

## Network

**Mainnet**

```
Websocket: wss://mainnet.dagger.matic.network
Socket: mqtts://mainnet.dagger.matic.network (You can also use `ssl://` protocol)
```

**Kovan**

```
Websocket: wss://kovan.dagger.matic.network
Socket: mqtts://kovan.dagger.matic.network (You can also use `ssl://` protocol)
```

**Ropsten**

```
Websocket: wss://ropsten.dagger.matic.network
Socket: mqtts://ropsten.dagger.matic.network (You can also use `ssl://` protocol)
```

**Matic testnet**

```
Websocket: wss://matic.dagger2.matic.network
Socket: mqtts://matic.dagger2.matic.network (You can also use `ssl://` protocol)
```

<a name="example"></a>

## Example

```javascript
var Dagger = require(" @maticnetwork/eth-dagger");

// connect to Dagger ETH main network (network id: 1) over web socket
var dagger = new Dagger("wss://mainnet.dagger.matic.network"); // dagger server

// Use mqtt protocol for node (socket)
// var dagger = new Dagger('mqtts://mainnet.dagger.matic.network'); // dagger server

// get new block as soon as it gets created
dagger.on("latest:block", function(result) {
  console.log("New block created: ", result);
});

// get only block number (as it gets created)
dagger.on("latest:block.number", function(result) {
  console.log("Current block number: ", result);
});
```

**Test dagger server**

This library consists `woodendagger` executable which is test dagger server on your local machine. So you can test with TestRPC.

Please do not use `woodendagger` in production. It's only for development purpose. It doesn't support `removed` flag.

```bash
$ woodendagger --url=https://mainnet.infura.io # or http://localhost:8545 for local json-rpc

# If you want to start dagger server on different ports,
# sockport: socket port for backend connection over TCP
# wsport: websocket port for frontend connection over websocket
$ woodendagger --url=http://localhost:8545 --sockport=1883 --wsport=1884

# To connect from dagger:
var dagger = new Dagger('mqtt://localhost:1883')
```

<a name="events"></a>

## Events

**Ethereum events**

Every ethereum event has room, and there are two rooms: `latest` and `confirmed`. `latest` events are fired immediately block included in chain. `confirmed` events are fired after 12 confirmations.

If you want to show updates on UI in your DApp, use `latest` events. It will help to make UI/UX better and user friendly.

Use `confirmed` events for irreversible tasks from server or on UI. Like sending email, notifications or allow user to do subsequent task on UI after one transaction gets confirmed.

Every event has to start with room:

```javascript
// latest block number
dagger.on("latest:block.number", function(result) {
  console.log("Current block number: ", result.data);
});

// confirmed (irreversible) incoming transaction
dagger.on("confirmed:addr/0xa7447.../tx/in", function(result) {
  // send email to user about new transaction she received
});

// confirmed (irreversible) contract deployment
dagger.on("confirmed:tx/0xd66169d..../receipt", function(result) {
  // send notification to user saying - her contract has been deployed successfully
});
```

You can use wildcard for events too. There are two type of wildcards: `+` (for single) and `#` (for multiple). Use with caution as it will fetch more data then you need, and can bombard with data to your DApp.

```javascript
// Listen for every outgoing transaction for any address
dagger.on('latest:addr/+/tx/out', ...)

// Triggers when 1 GNT (Golem token) get transferred to Golem multisig wallet
dagger.on('latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/+/0x7da82c7ab4771ff031b66538d2fb9b0b047f6cf9/#', ...)

// Triggers when any amount of GNT (Golem token) get sent from Golem multisig wallet
dagger.on('latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/0x7da82c7ab4771ff031b66538d2fb9b0b047f6cf9/#', ...)

// Listen for every Golem token transfer (notice `#` at the end)
dagger.on('latest:log/0xa74476443119a942de498590fe1f2454d7d4ac0d/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/#', ...)
```

| Ethereum event                                 | When?                                                                   | `removed` flag |
| ---------------------------------------------- | ----------------------------------------------------------------------- | -------------- |
| block.number                                   | For every new block number created                                      |                |
| block.hash                                     | For every new block hash created                                        | Yes            |
| block                                          | For every new block created                                             | Yes            |
| block/`number`                                 | When particular block in future included in chain                       | Yes            |
| addr/`address`/tx                              | On every new transaction for `address`                                  | Yes            |
| addr/`address`/tx/out                          | On every new outgoing transaction for `address`                         | Yes            |
| addr/`address`/tx/in                           | On every new incoming transaction for `address`                         | Yes            |
| tx/`txId`                                      | When given `txId` included in block                                     | Yes            |
| tx/`txId`/success                              | When tx status is success (included in block) for `txId`                | Yes            |
| tx/`txId`/fail                                 | When tx fails (included in block) for `txId`                            | Yes            |
| tx/`txId`/receipt                              | When receipt is generated (included in block) for `txId`                | Yes            |
| addr/`contractAddress`/deployed                | When new `contractAddress` included in block                            | Yes            |
| log/`contractAddress`                          | When new log generated for `contractAddress`                            | Yes            |
| log/`contractAddress`/filter/`topic0`/`topic1` | When new log with `topic0` and `topic1` generated for `contractAddress` | Yes            |

**Dagger events**

| Dagger event      | When?                          | args           |
| ----------------- | ------------------------------ | -------------- |
| connection.status | When connection status changes | value: Boolean |

> Event names are case-sensitive. `address`, `txId` and `topics` must be in lowercase.

<a name="api"></a>

## API

- <a href="#connect"><code>Dagger.<b>connect()</b></code></a>
- <a href="#on"><code>dagger.<b>on()</b></code></a>
- <a href="#once"><code>dagger.<b>once()</b></code></a>
- <a href="#off"><code>dagger.<b>off()</b></code></a>
- <a href="#of"><code>dagger.<b>of()</b></code></a>
- <a href="#end"><code>dagger.<b>end()</b></code></a>
- <a href="#contract"><code>dagger.<b>contract()</b></code></a>

---

<a name="connect"></a>

### Dagger.connect(url, options)

Connects to the dagger specified by the given url and options. It returns a Dagger object.

---

<a name="on"></a>

### dagger.on(event, fn)

Subscribe to a topic

- `event` is a `String` topic to subscribe to. `event` wildcard characters are supported (`+` - for single level and `#` - for multi level)
- `fn` - `function (data, removed)`
  fn will be executed when event occurred:
  - `data` data from event
  - `removed` flag saying if data is removed from blockchain due to re-organization.

---

<a name="once"></a>

### dagger.once(event, fn)

Same as `on` but will be fired only once.

---

<a name="off"></a>

### dagger.off(event, fn)

Unsubscribe from a topic

- `event` is a `String` topic to unsubscribe from
- `fn` - `function (data, removed)`

---

<a name="of"></a>

### dagger.of(room)

Create room out of dagger. `room` has to be one out of two values: `latest` and `confirmed`

- `room` object has following methods:
  - `on` same as dagger `on`
  - `once` same as dagger `once`
  - `off` same as dagger `off`

---

<a name="end"></a>

### dagger.end([force])

Close the dagger, accepts the following options:

- `force`: passing it to true will close the dagger right away. This parameter is optional.

---

<a name="contract"></a>

### dagger.contract(web3Contract)

Creates web3 contract wrapper to support dagger.

- `web3Contract`: contract object web3. Example: `new web3.eth.Contract(abi, address)`

  ```javascript
  // web3 contract
  var web3Contract = new web3.eth.Contract(abi, address);

  // dagger contract
  var contract = dagger.contract(web3Contract);
  var filter = contract.events.Transfer({
    filter: { from: "0x123456..." },
    room: "latest"
  });
  // watch
  filter.watch(function(data, removed) {
    // data.returnValues.to : address to which it has been transferred to
    // data.returnValues.value : value which has been transferred
  });
  // watch only once
  filter.watchOnce(function(data, removed) {
    // data.returnValues.to : address to which it has been transferred to
    // data.returnValues.value : value which has been transferred
  });
  // stop watching
  filter.stopWatching();
  ```

<a name="examples"></a>

## Examples

**To listen ERC20 transfer event**

Use following topic to listen ERC20 transfer event. Use `+` instead of <contract-address> or <from-address> or <to-address> if you want to listen for `any` value.

For latest events:

```
latest:log/<contract-address>/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/<from-address>/<to-address>
```

For confirmed events:

```
confirmed:log/<contract-address>/filter/0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef/<from-address>/<to-address>
```


<a name="support"></a>

## Support

If you have any queries, feedback or feature requests, feel free to reach out to us on telegram: https://t.me/maticnetwork

<a name="license"></a>

## License

MIT
