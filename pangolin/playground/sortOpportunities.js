const ethers = require('ethers')


let opps = [
    {
      inputAmount: ethers.BigNumber.from('0x029649e0ce68dd3257'),
      grossProfit: ethers.BigNumber.from('0x14cdade7c36dd952'),
      netProfit: ethers.BigNumber.from('0x0ac3dd55bb9dfff2'),
      gasPrice: ethers.BigNumber.from('0x020a938a8fa0'),
      gasCost: ethers.BigNumber.from('0x0a09d09207cfd960'),
      path: {
        id: 'I00014',
        symbol: 'wmatic=>usdc=>weth=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '322279'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xc14040f75510f301'),
      grossProfit: ethers.BigNumber.from('0x01db7be0534607e5'),
      netProfit: ethers.BigNumber.from('0x0194ea84055b33e5'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x46915c4dead400'),
      path: {
        id: 'I00031',
        symbol: 'wmatic=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '257962'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x01d3f70766a747400a'),
      grossProfit: ethers.BigNumber.from('0x042bd238c03c5298'),
      netProfit: ethers.BigNumber.from('0x03d360425c7bb098'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x5871f663c0a200'),
      path: {
        id: 'I00035',
        symbol: 'wmatic=>usdc=>usdt=>weth=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '323313'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x02628f97d04c7ad305'),
      grossProfit: ethers.BigNumber.from('0x06a8e465738a0143'),
      netProfit: ethers.BigNumber.from('0x064f2f3d873e1143'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x59b527ec4bf000'),
      path: {
        id: 'I00036',
        symbol: 'wmatic=>usdc=>usdt=>quick=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '327928'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x9587b01ab700ba6a'),
      grossProfit: ethers.BigNumber.from('0x021811354f5d3b49'),
      netProfit: ethers.BigNumber.from('0x01bde125d1655549'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x5a300f7df7e600'),
      path: {
        id: 'I00315',
        symbol: 'wmatic=>dai=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '329683'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x9367ea3d4113e34c'),
      grossProfit: ethers.BigNumber.from('0x011356ee9781f099'),
      netProfit: ethers.BigNumber.from('0xb99f9ae6ec8299'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x59b753b0956e00'),
      path: {
        id: 'I00487',
        symbol: 'wmatic=>quick=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '327959'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xaa81ce3e837670d0'),
      grossProfit: ethers.BigNumber.from('0x017140e8ff4ff8c0'),
      netProfit: ethers.BigNumber.from('0x0118cc910e9992c0'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x587457f0b66600'),
      path: {
        id: 'I00676',
        symbol: 'wmatic=>weth=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '323347'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x8e69190afa98cbd1'),
      grossProfit: ethers.BigNumber.from('0x0182cc0af08e56d7'),
      netProfit: ethers.BigNumber.from('0x012914b73ff8e8d7'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x59b753b0956e00'),
      path: {
        id: 'I00841',
        symbol: 'wmatic=>easy=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '327959'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x3cee83a7cd8c24ef'),
      grossProfit: ethers.BigNumber.from('0x7a7c7a73e32701'),
      netProfit: ethers.BigNumber.from('0x2047cbb71d3d01'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x5a34aebcc5ea00'),
      path: {
        id: 'I01212',
        symbol: 'wmatic=>igg=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '329749'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xdec40a72c4279078'),
      grossProfit: ethers.BigNumber.from('0x0315caf0c88baa6a'),
      netProfit: ethers.BigNumber.from('0x02bb96420bc5c06a'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x5a34aebcc5ea00'),
      path: {
        id: 'I01599',
        symbol: 'wmatic=>ghst=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '329749'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x8e3b62b326f1c502'),
      grossProfit: ethers.BigNumber.from('0x01213fcf65abe368'),
      netProfit: ethers.BigNumber.from('0xc70b20a8e5f968'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x5a34aebcc5ea00'),
      path: {
        id: 'I02011',
        symbol: 'wmatic=>bzb=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '329749'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x31972fd74e7dd92c'),
      grossProfit: ethers.BigNumber.from('0x579e2fe3cf175d'),
      netProfit: ethers.BigNumber.from('0x058cdc057f575d'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03025',
        symbol: 'wmatic=>jpyc=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: true,
        gasAmount: '300000'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x52c50464202a9a65'),
      grossProfit: ethers.BigNumber.from('0x024fd997a082c81a'),
      netProfit: ethers.BigNumber.from('0x01e48ff54f8ac81a'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x6b49a250f80000'),
      path: {
        id: 'I03647',
        symbol: 'wmatic=>usdc=>weth=>coval=>quick=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: '392192'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xe45d5d84849f89e9'),
      grossProfit: ethers.BigNumber.from('0x021a5cb796927f00'),
      netProfit: ethers.BigNumber.from('0x01ae4c31dde24f00'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x6c1085b8b03000'),
      path: {
        id: 'I03784',
        symbol: 'wmatic=>usdc=>usdt=>dai=>weth=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: '395032'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x01e427f5a2620006c9'),
      grossProfit: ethers.BigNumber.from('0x04779b23eba04c72'),
      netProfit: ethers.BigNumber.from('0x040c080b2caf5a72'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x6b9318bef0f200'),
      path: {
        id: 'I03814',
        symbol: 'wmatic=>usdc=>usdt=>weth=>quick=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: '393241'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x5a9e0f5a07eb0e5f'),
      grossProfit: ethers.BigNumber.from('0x83e12e6bff1714'),
      netProfit: ethers.BigNumber.from('0x31cfda8daf5714'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03819',
        symbol: 'wmatic=>usdc=>usdt=>weth=>ghst=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x02a250651f7f8e28a5'),
      grossProfit: ethers.BigNumber.from('0x1ecdeac272762e38'),
      netProfit: ethers.BigNumber.from('0x1575c09e8a3fa238'),
      gasPrice: ethers.BigNumber.from('0x020a938a8fa0'),
      gasCost: ethers.BigNumber.from('0x09582a23e8368c00'),
      path: {
        id: 'I03824',
        symbol: 'wmatic=>usdc=>usdt=>weth=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xf65c23d7109ce4c3'),
      grossProfit: ethers.BigNumber.from('0x01872448ac9cde3c'),
      netProfit: ethers.BigNumber.from('0x013512f4ce4d1e3c'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03828',
        symbol: 'wmatic=>usdc=>usdt=>weth=>bzb=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x01a6ff2750e7aa7835'),
      grossProfit: ethers.BigNumber.from('0x0332db6a56b96913'),
      netProfit: ethers.BigNumber.from('0x02c743a06b6bb113'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x6b97c9eb4db800'),
      path: {
        id: 'I03840',
        symbol: 'wmatic=>usdc=>usdt=>quick=>weth=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: '393308'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x3ad2d553014fad5f'),
      grossProfit: ethers.BigNumber.from('0x6ccc7f78d53571'),
      netProfit: ethers.BigNumber.from('0x1abb2b9a857571'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03845',
        symbol: 'wmatic=>usdc=>usdt=>quick=>igg=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x432b4f59f0034523'),
      grossProfit: ethers.BigNumber.from('0x8d84fe9d619fad'),
      netProfit: ethers.BigNumber.from('0x3b73aabf11dfad'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03846',
        symbol: 'wmatic=>usdc=>usdt=>quick=>dai=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x1d2f8c8407537523'),
      grossProfit: ethers.BigNumber.from('0x5453cfa1feb3c8'),
      netProfit: ethers.BigNumber.from('0x02427bc3aef3c8'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03850',
        symbol: 'wmatic=>usdc=>usdt=>quick=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x0130b0cad7982755a4'),
      grossProfit: ethers.BigNumber.from('0x020b7705d3e5849f'),
      netProfit: ethers.BigNumber.from('0x01b965b1f595c49f'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03858',
        symbol: 'wmatic=>usdc=>usdt=>quick=>bzb=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x015f7834217179c2f5'),
      grossProfit: ethers.BigNumber.from('0x0243ae8c1bf02697'),
      netProfit: ethers.BigNumber.from('0x01f19d383da06697'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I03865',
        symbol: 'wmatic=>usdc=>usdt=>quick=>must=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x0151da89d07d817c6d'),
      grossProfit: ethers.BigNumber.from('0x08d45b2d8dec3513'),
      netProfit: ethers.BigNumber.from('0x088249d9af9c7513'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I04861',
        symbol: 'wmatic=>usdc=>ghst=>weth=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xa39eaae2f6c37dd9'),
      grossProfit: ethers.BigNumber.from('0x0288168c505c4c25'),
      netProfit: ethers.BigNumber.from('0x02360538720c8c25'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I05646',
        symbol: 'wmatic=>usdt=>usdc=>weth=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x8d933331b64aa436'),
      grossProfit: ethers.BigNumber.from('0x01c64d68a3e2b8f5'),
      netProfit: ethers.BigNumber.from('0x015a3a815e3cc4f5'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x6c12e745a5f400'),
      path: {
        id: 'I06855',
        symbol: 'wmatic=>dai=>weth=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: '395066'
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x018914789308ec4192'),
      grossProfit: ethers.BigNumber.from('0x0e1c7962bb014c44'),
      netProfit: ethers.BigNumber.from('0x04c44f3ed2cac044'),
      gasPrice: ethers.BigNumber.from('0x020a938a8fa0'),
      gasCost: ethers.BigNumber.from('0x09582a23e8368c00'),
      path: {
        id: 'I07143',
        symbol: 'wmatic=>dai=>usdc=>weth=>coval=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xd42d378f2be2a985'),
      grossProfit: ethers.BigNumber.from('0x02d2984eb597b4aa'),
      netProfit: ethers.BigNumber.from('0x028086fad747f4aa'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I07156',
        symbol: 'wmatic=>dai=>usdc=>usdt=>weth=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0xf8da9311cff90304'),
      grossProfit: ethers.BigNumber.from('0x03cf18881c738efe'),
      netProfit: ethers.BigNumber.from('0x037d07343e23cefe'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I07157',
        symbol: 'wmatic=>dai=>usdc=>usdt=>quick=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    },
    {
      inputAmount: ethers.BigNumber.from('0x209c9b3f733c8ed9'),
      grossProfit: ethers.BigNumber.from('0x736e73d957f622'),
      netProfit: ethers.BigNumber.from('0x215d1ffb083622'),
      gasPrice: ethers.BigNumber.from('0x11ed8ec200'),
      gasCost: ethers.BigNumber.from('0x521153de4fc000'),
      path: {
        id: 'I07830',
        symbol: 'wmatic=>dai=>ghst=>usdc=>usdt=>wmatic',
        tkns: [Array],
        pools: [Array],
        enabled: '1',
        gasAmount: 300000
      },
      blockNumber: 11485619
    }
  ]


function getParallelOpps(opps) {
    let parallelOpps = []
    let poolsUsed = []
    opps.forEach(opp => {
        let pathIncludesUsedPool = opp.path.pools.filter(poolId => {
            return poolsUsed.includes(poolId)
        }).length > 0
        if (!pathIncludesUsedPool) {
            poolsUsed = [...poolsUsed, ...opp.path.pools]
            parallelOpps.push(opp)
        }
    })
    return parallelOpps
}



function main() {
    opps.sort((a, b) => b.netProfit.gt(a.netProfit) ? 1 : -1)
    let parallel = getParallelOpps(opps) 
    let formatted = parallel.map(opp=>ethers.utils.formatEther(opp.netProfit))
    console.log(formatted)
}

main()