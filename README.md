# L2 Arb Bots

Arbitrage bots for forks of Uniswap AMM on L2 exchanges.

# Get started

### Install

```
npm i
```

Create a `.env` file - see `.env.sample` for parameters

### Run

```
npm run pangolin
npm run zero
npm run cross-avax
npm run quick
npm run fantom-sushi
```

# Requirements

*  WebSocket provider for L2 available
*  L2 account with wrapped L2 balance for trading and L2 balance for fees

# Public endpoints

### Avalanche

* https://ava.spacejelly.network/api/ext/bc/C/rpc
* https://learn.figment.io/network-documentation/avalanche/tutorials/deploy-a-smart-contract-on-avalanche-using-remix-and-metamask
* https://api.avax.network/ext/bc/C/rpc

### Matic

* https://rpc-mainnet.matic.network
* wss://ws-mainnet.matic.network


### Fantom

* wss://wsapi.fantom.network
* https://rpc.fantom.network'
