// SPDX-License-Identifier: MIT
pragma solidity >0.8.18;

import "forge-std/Test.sol";
import "../src/YieldCore.sol";
import "../src/YieldCoreToken.sol";
import "./handlers/YieldCoreHandler.sol";

contract YieldCoreInvariantTest is Test {
    YieldCoreToken token;
    YieldCore vault;
    YieldCoreHandler handler;

    function setUp() public {
    token = new YieldCoreToken("Yield Token", "YLD", 1_000_000 ether);

    vault = new YieldCore(IERC20(token));

    handler = new YieldCoreHandler(vault, token);

    targetContract(address(handler));
}

    /*//////////////////////////////////////////////////////////////
                            INVARIANTS
    //////////////////////////////////////////////////////////////*/

    function invariant_rewardPoolNeverNegative() public {
        assertGe(vault.rewardPool(), 0);
    }

    function invariant_rewardsPaidNeverExceedFunded() public {
        assertLe(handler.totalRewardsPaid(), handler.totalRewardsFunded());
    }

    function invariant_userNeverExceedsMaxReward() public {
        address user = handler.lastUser();
        uint index = handler.lastIndex();

        if (vault.getStakeCount(user) > index) {
            uint earned = handler.userTotalEarned(user, index);
            uint max = vault.maxReward(user, index);
            assertLe(earned, max);
        }
    }

    function invariant_ownerCannotDrainPrincipal() public {
        assertGe(
            vault.getContractBalance(),
            handler.totalUserPrincipal()
        );
    }

    function invariant_expiredStakeEarnsZero() public {
        uint256 userCount = handler.userCount();
        if (userCount == 0) return;

        address user = handler.users(0);

        uint256 count = vault.getStakeCount(user);
        if (count == 0) return;

        uint256 index = 0;

        if (!handler.isExpired(user, index)) return;

        uint256 reward = vault.calculateReward(user, index);
        assertEq(reward, 0);
    }
}