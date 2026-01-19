// SPDX-License-Identifier: MIT
pragma solidity >0.8.18;

import "forge-std/Test.sol";
import "../src/YieldCore.sol";
import "../src/YieldCoreToken.sol";

contract YieldCoreTest is Test {
    YieldCore vault;
    YieldCoreToken token;

    address owner = address(this);
    address user = address(1);

    uint256 constant LOCK = 10 minutes;
    uint256 constant RATE = 10;      // daily %
    uint256 constant PENALTY = 10;   // %

    function setUp() public {
        token = new YieldCoreToken("Yield", "YLD", 1_000_000 ether);
        vault = new YieldCore(IERC20(token));

        // fund user
        token.transfer(user, 1_000 ether);

        // setup lock params
        vault.setLockParameters(LOCK, RATE, PENALTY);

        // fund reward pool
        token.approve(address(vault), 10_000 ether);
        vault.fundRewardPool(10_000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONAL TESTS
    //////////////////////////////////////////////////////////////*/

    function testStakeThenClaimThenCap() public {
        vm.startPrank(user);

        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);

        vm.warp(block.timestamp + 12 hours);
        vault.claimReward(0);

        vm.warp(block.timestamp + 12 hours);
        vault.claimReward(0);

        vm.warp(block.timestamp + 1 days);
        uint256 reward = vault.calculateReward(user, 0);

        assertEq(reward, 0);
        vm.stopPrank();
    }

    function testEarlyUnstakeIncreasesRewardPool() public {
        vm.startPrank(user);

        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);

        uint256 beforePool = vault.rewardPool();

        vm.warp(block.timestamp + 5 minutes);
        vault.unstake(0);

        uint256 afterPool = vault.rewardPool();
        assertGt(afterPool, beforePool);

        vm.stopPrank();
    }

    function testEmergencyWithdrawPrincipalOnly() public {
        vm.startPrank(user);

        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);

        vm.stopPrank();

        vault.pause();

        uint256 before = token.balanceOf(user);

        vm.prank(user);
        vault.emergencyWithdraw(0);

        uint256 afterBal = token.balanceOf(user);
        assertEq(afterBal - before, 100 ether);
    }

    function testRewardPoolNeverNegative() public {
        vm.startPrank(user);

        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);

        vm.warp(block.timestamp + 1 days);

        uint256 reward = vault.calculateReward(user, 0);
        assertLe(reward, vault.rewardPool());

        vm.stopPrank();
    }

    function testOwnerCannotStealUserPrincipal() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);
        vm.stopPrank();

        vault.pause();

        uint256 ownerBefore = token.balanceOf(owner);
        vault.withdrawExcessRewards();
        uint256 ownerAfter = token.balanceOf(owner);

        // owner must not receive user principal
        assertLe(ownerAfter - ownerBefore, vault.rewardPool());
    }

    function testPauseBlocksCoreActions() public {
        vault.pause();

        vm.startPrank(user);
        token.approve(address(vault), 100 ether);

        vm.expectRevert();
        vault.stake(100 ether, LOCK);

        vm.stopPrank();
    }

    function testUnpauseRestoresFunctionality() public {
        vault.pause();
        vault.unpause();

        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);
        vm.stopPrank();

        assertEq(vault.getStakeCount(user), 1);
    }

    /*//////////////////////////////////////////////////////////////
                        EXPIRATION + CLEANUP
    //////////////////////////////////////////////////////////////*/

    function testExpiredStakeCannotClaim() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);
        vm.stopPrank();

        vm.warp(block.timestamp + LOCK + vault.GRACE_PERIOD() + 1);

        vm.prank(owner);
        vault.cleanUpExpiredStake(user, 0);

        vm.prank(user);
        uint256 reward = vault.calculateReward(user, 0);
        assertEq(reward, 0);
    }

    /*//////////////////////////////////////////////////////////////
                        INVARIANT-STYLE CHECKS
    //////////////////////////////////////////////////////////////*/

    function testTotalRewardsPaidNeverExceedsFunded() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.stake(100 ether, LOCK);

        vm.warp(block.timestamp + 1 days);
        vault.claimReward(0);
        vm.stopPrank();

        uint256 paid = token.balanceOf(user) - 900 ether;
        assertLe(paid, 10_000 ether);
    }
}