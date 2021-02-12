NETWORK = 1
HTTP_PROVIDER = 'alchemy'
// HTTP_PROVIDER = 'chainstackAsia'
WS_PROVIDER = 'chainstackAsia'
ARCHER_URL = 'https://api.archerdao.io/v1/submit-opportunity'

DEFAULT_GANACHE_PATH = 'http://localhost:8545'

DISPATCHER = '0xD30Ce37a6F2424593DaBe9b712d235781815445D'
GROUNDKEEPER = '0x103c7BEC38a948b738A430B2b685654dd95bE0A5'
WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

BOT_ID = '2'
ENV_PATH = "../config/.env"
ABIS_PATH = "../config/abis"
PROVIDERS_PATH = '../config/providers'
OPP_LOGS_PATH = './logs/opportunities.csv'
ARCHER_PASSES_PATH = './logs/responsesPass.csv'
ARCHER_FAILS_PATH = './logs/responsesFails.csv'
ARCHER_REQUESTS_PATH = './logs/requests.csv'

BASE_TOKENS = {}

FRAX = '0x853d955aCEf822Db058eb8505911ED77F175b99e'
FXS = '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0'
USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
FRAX_FRAX_USDC_POOL = '0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d'
UNI_FRAX_USDC_POOL = '0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D'
UNI_FXS_FRAX_POOL = '0xE1573B9D29e2183B1AF0e743Dc2754979A40D237'
UNIISH_ROUTER_PROXY = '0x121835e15703a1a7bab32626d0927D60F90A81D7'
UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
SUSHISWAP_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'
CRYPTO_ROUTER = '0xCeB90E4C17d626BE0fACd78b79c9c87d7ca181b3'
MOONISWAP_ROUTER = '0x798934cdcfAe18764ef4819274687Df3fB24B99B'
LINKSWAP_ROUTER = '0xA7eCe0911FE8C60bff9e99f8fAFcDBE56e07afF1'
POLYIENT_ROUTER = '0x5F54e90b296174709Bc00cfC0Cd2b69Cf55b2064'
WHITESWAP_ROUTER = '0x463672ffdED540f7613d3e8248e3a8a51bAF7217'
SAKESWAP_ROUTER = '0x9C578b573EdE001b95d51a55A3FAfb45f5608b1f'
SASHIMISWAP_ROUTER = '0xe4FE6a45f354E845F954CdDeE6084603CEDB9410'

ROUTERS = {
    UNISWAP_ROUTER,
    SUSHISWAP_ROUTER,
    CRYPTO_ROUTER,
    MOONISWAP_ROUTER,
    LINKSWAP_ROUTER, 
    UNIISH_ROUTER_PROXY,
    POLYIENT_ROUTER, 
    WHITESWAP_ROUTER, 
    SAKESWAP_ROUTER, 
    SASHIMISWAP_ROUTER
}

module.exports = {
    NETWORK, 
    HTTP_PROVIDER, 
    WS_PROVIDER,
    ENV_PATH, 
    ABIS_PATH, 
    DISPATCHER, 
    BASE_TOKENS, 
    PROVIDERS_PATH, 
    ROUTERS, 
    WETH_ADDRESS,
    OPP_LOGS_PATH, 
    ARCHER_REQUESTS_PATH, 
    ARCHER_FAILS_PATH,
    ARCHER_PASSES_PATH,
    BOT_ID, 
    ARCHER_URL, 
    FRAX, 
    FXS,
    USDC, 
    UNI_FRAX_USDC_POOL, 
    UNI_FXS_FRAX_POOL, 
    FRAX_FRAX_USDC_POOL, 
    DEFAULT_GANACHE_PATH, 
    GROUNDKEEPER
}