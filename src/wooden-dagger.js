/* eslint-disable no-console */

import 'babel-polyfill';
import yargs from 'yargs';
import mosca from 'mosca';
import mqtt from 'async-mqtt';
import Web3 from 'web3';

// parse arguments
const argv = yargs.parse(process.argv);

// config object
const config = {
  url: argv.url,
  verbose: !!argv.verbose,
  poll: parseInt(argv.poll || 5, 10) * 1000, // default: 5 second
  mosca: {
    port: parseInt(argv.sockport || 1883, 10),
    http: {
      port: parseInt(argv.wsport || 1884, 10),
    },
  },
};

if (!config.url) {
  console.log('`url` is required!');
  process.exit();
}

// wooden
const wooden = {
  // web3 object
  web3: new Web3(new Web3.providers.HttpProvider(config.url)),
  // mqtt client
  mqttClient: null,
  // stores last block number
  lastBlockNumber: null,

  // mqtt broker
  startMqttBroker () {
    const server = new mosca.Server(config.mosca);
    server.on('clientConnected', (client) => {
      if (config.verbose) {
        console.log('[Socket] client connected', client.id);
      }
    });

    server.on('published', (packet, client) => {
      if (config.verbose && !packet.topic.startsWith("$SYS")) {
        console.log('[MQTT] Message published at topic: ', packet.topic);
      }
    });

    server.on('ready', () => {
      // mqtt client
      this.mqttClient = mqtt.connect(`mqtt://0.0.0.0:${config.mosca.port}`);

      console.log(`Ethereum node: ${config.url}`);
      console.log(`Socket port: ${config.mosca.port}, Websocket port: ${config.mosca.http.port}`);
      console.log('⚔️   Starting (wooden) dagger fight...');
    });
  },

  startTask () {
    this.pollBlockNumber = this.pollBlockNumber.bind(this);
    this.pollBlockNumber();
  },

  async pollBlockNumber () {
    setTimeout(this.pollBlockNumber, config.poll);
    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      if (blockNumber === this.lastBlockNumber) {
        return;
      }

      if (this.lastBlockNumber === null) {
        this.lastBlockNumber = blockNumber === 0 ? 0 : blockNumber - 1;
      }

      while (this.lastBlockNumber < blockNumber) {
        this.lastBlockNumber += 1;
        if (config.verbose) {
          console.log('New block found', this.lastBlockNumber);
        }

        // publish latest and confirmed events
        const p = [this.publishEvents(this.lastBlockNumber, 'latest')];
        if (this.lastBlockNumber > 12) {
          p.push(this.publishEvents(this.lastBlockNumber - 12, 'confirmed'));
        }

        Promise.all(p);
      }
    } catch (e) {
      console.log(e);
    }
  },

  async publishEvents (blockNumber, room) {
    const data = await this.fetchBlock(blockNumber);
    this.publishMessagesForBlock(room, data.block);
    this.publishMessagesForTx(room, data.block, data.transactions, data.receipts);
  },

  async fetchBlock (blockNumber) {
    const block = await this.web3.eth.getBlock(blockNumber);
    const data = await Promise.all([
      this.fetchTransactions(block.transactions),
      this.fetchTransactionReceipts(block.transactions),
    ]);

    return {
      block,
      transactions: data[0],
      receipts: data[1],
    };
  },

  fetchTransactions (txs) {
    return new Promise((resolve) => {
      const result = [];
      let _resolved = false;

      const callback = (err, obj) => {
        if (_resolved) return;
        result.push(err ? null : obj);
        if (result.length >= txs.length) {
          _resolved = true;
          resolve(result);
        }
      };

      if (txs.length > 0) {
        const batch = new this.web3.BatchRequest();
        txs.forEach((tx) => {
          batch.add(this.web3.eth.getTransaction.request(tx, callback));
        });
        batch.execute();
      } else {
        resolve(result);
      }
    });
  },

  fetchTransactionReceipts (txs) {
    return new Promise((resolve) => {
      const result = [];
      let _resolved = false;

      const callback = (err, obj) => {
        if (_resolved) return;
        result.push(err ? null : obj);
        if (result.length >= txs.length) {
          _resolved = true;
          resolve(result);
        }
      };

      if (txs.length > 0) {
        const batch = new this.web3.BatchRequest();
        txs.forEach((tx) => {
          batch.add(this.web3.eth.getTransactionReceipt.request(tx, callback));
        });
        batch.execute();
      } else {
        resolve(result);
      }
    });
  },

  _wrapMessage (room, route, message) {
    const key = `${room}:${route}`;
    const value = JSON.stringify({ data: message, removed: false, room });
    return {
      key,
      value,
    };
  },

  addHexPrefix (str) {
    if (str.startsWith('0x')) {
      return str;
    }
    return `0x${str}`;
  },

  publishMessagesForBlock (room, block, removed = false) {
    if (config.verbose) {
      console.log('Publishing block', block.number, room);
    }

    // mqtt client
    const messages = [
      this._wrapMessage(room, 'block.hash', block.hash, removed),
      this._wrapMessage(room, 'block', block, removed),
      this._wrapMessage(room, `block/${block.number}`, block, removed),
    ];

    if (!removed) {
      messages.push.apply(messages, [
        this._wrapMessage(room, 'block.number', block.number, removed),
      ]);
    }

    // publish block messages
    messages.forEach((m) => {
      this.mqttClient.publish(m.key, m.value);
    });
  },

  publishMessagesForTx (room, block, transactions, receipts, removed = false) {
    if (config.verbose) {
      console.log('Publishing txs/receipts', block.number, room);
    }

    // messages
    const messages = [];

    // for each transaction
    transactions.forEach((tx, i) => {
      const receipt = receipts[i];
      if (!receipt) return;

      const txFrom = this.addHexPrefix(tx.from).toLowerCase();
      let txTo = null;
      let isContractCreated = false;

      if (tx.to && this.web3.utils.isAddress(this.addHexPrefix(tx.to))) {
        txTo = tx.to;
      } else if (receipt.contractAddress
        && this.web3.utils.isAddress(this.addHexPrefix(receipt.contractAddress))) {
        txTo = receipt.contractAddress;
        isContractCreated = true;
      }

      if (txTo) {
        txTo = this.addHexPrefix(txTo).toLowerCase();
      }

      messages.push.apply(messages, [
        this._wrapMessage(room, `tx/${tx.hash}`, tx, removed),
        this._wrapMessage(room, `addr/${txFrom}/tx`, tx, removed),
        this._wrapMessage(room, `addr/${txFrom}/tx/out`, tx, removed),
        this._wrapMessage(room, `tx/${receipt.transactionHash}/receipt`, receipt, removed),
      ]);

      if (txTo) {
        messages.push.apply(messages, [
          this._wrapMessage(room, `addr/${txTo}/tx`, tx, removed),
          this._wrapMessage(room, `addr/${txTo}/tx/in`, tx, removed),
        ]);

        // contract created
        if (isContractCreated) {
          messages.push.apply(messages, [
            this._wrapMessage(room, `addr/${txTo}/deployed`, receipt, removed),
          ]);
        }
      }

      const addressLogs = {};
      receipt.logs.forEach((log) => {
        const a = log.address.toLowerCase();
        addressLogs[a] = addressLogs[a] || [];
        addressLogs[a].push(log);
      });

      Object.keys(addressLogs).forEach((address) => {
        messages.push.apply(messages, [
          this._wrapMessage(room, `log/${address}`, addressLogs[address], removed),
        ]);

        const topicBasedMessages = [];
        addressLogs[address].forEach((l) => {
          if (l.topics && l.topics.length > 0) {
            const key = `log/${address}/filter/${l.topics.join('/')}`;
            topicBasedMessages.push(this._wrapMessage(room, key, l, removed));
          }
        });

        // add into messages
        messages.push(...topicBasedMessages);
      });
    });

    // publish block messages
    messages.forEach((m) => {
      this.mqttClient.publish(m.key, m.value);
    });
  },
};

// start mqtt broker
wooden.startMqttBroker();
// start dagger wooden task
wooden.startTask();
