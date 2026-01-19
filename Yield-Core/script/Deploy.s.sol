// SPDX-License-Identifier: MIT
pragma solidity >0.8.18;

import "forge-std/Script.sol";
import "../src/YieldCore.sol";
import "../src/YieldCoreToken.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        YieldCoreToken token = new YieldCoreToken(
            "Yield Token",
            "YLD",
            1_000_000 ether
        );

        YieldCore vault = new YieldCore(IERC20(address(token)));

        token.approve(address(vault), 150_000 ether);
        vault.fundRewardPool(150_000 ether);

        vm.stopBroadcast();
    }
}