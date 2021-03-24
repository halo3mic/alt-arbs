# L2 Arb Bots

Arbitrage bots for L2 AMM exchanges. Currently AMMs are limited to Uniswap clones.

Supported chains:
 - Avalanche
 - Matic
 - Fantom

# Get started

##### Install dependencies
```
npm i
```

##### Env
Create a `.env` file - see `.env.sample` for parameters.
User can store many private keys in the following fashion
`PK{n}={account address}:{account private key}` where n is an integer. 
Note, that at least PK1 needs to be defined as this is the default value. 

User can select between private keys by passing flag `--pk={n}`.

### Avalanche bot options
When running avalanche bot user has some options how and what to run:
- Simulate any transaction that would be sent with `eth_estimateGas` by passing `--simulate`.
- Make any gross profitable transaction go through by passing `--zero-gas`.
- To filter out internal-arb paths pass`--cross-only`. This is equivalent to running previous cross-dex bot.
- To filter out paths across multiple dexes pass `--internal-only`. This is equivalent to running previous internal bot.
- Select which dexes to run with `--dex={dex key}` from the following options *zeroExchange, sushiswap, yetiswap, pangolin, complus, elk*. User can pass multiple dexes seperated with comma. By default bot will run all dexes if this flag is not passed.

### Example commands

All these commands are run from root.

Simply not passing any command will start the bot with all exchanges checking paths between them as well as internally. 
```
node avalanche/server.js
```
We may want to concentrate the bot and only have it look on two exchanges internally and run it with different account.
```
node avalanche/server.js --dex=pangolin,zero --internal-only --pk=2
```
Run the bot without consideration for gas cost. This is more for debugging. 
```
node avalanche/server.js --zero-gas
```
Simulate transaction only to not worry about failure cost whilst debugging.
```
node avalanche/server.js --zero-gas --simulate
```

### Shortcuts

To avoid running long commands repeatedly use shortcuts.
Current shortcuts are listed below, but you can add more by editing `package.json`.

```
npm run pangolin
npm run zero
npm run yeti
npm run cross-avax
npm run quick
npm run yeti
npm run complus
npm run avalanche
```

# Requirements

*  WebSocket provider for L2 available
*  L2 account with L2 balance

# Resources
## Public APIs
### Avalanche

* https://ava.spacejelly.network/api/ext/bc/C/rpc
* https://learn.figment.io/network-documentation/avalanche/tutorials/deploy-a-smart-contract-on-avalanche-using-remix-and-metamask
* https://api.avax.network/ext/bc/C/rpc

### Matic
 * wss://ws-mainnet.matic.network
 * https://rpc-mainnet.matic.network

### Fantom
 * wss://wsapi.fantom.network
 * https://rpcapi.fantom.network
