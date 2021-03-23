// SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.4;

abstract contract UniswapRouter {
    function getAmountsOut(uint amountIn, address[] memory path) public virtual view returns (uint[] memory amounts);
}

contract UniswapV2Proxy {

    function getOutputAmount(address _routerAddress, uint _inputAmount, address[] memory path) external view returns (uint) {
        UniswapRouter router = UniswapRouter(_routerAddress);
        try router.getAmountsOut(_inputAmount, path) returns (uint[] memory amounts) {
            return amounts[1];
        } catch {
            return uint(0);
        }
    }
}
