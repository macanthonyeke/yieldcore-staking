pragma solidity >0.8.18;

import "forge-std/Test.sol";
import "src/YieldCore.sol";
import "src/YieldCoreToken.sol";

contract YieldCoreHandler is Test {
    YieldCore vault;
    YieldCoreToken public token;

    uint public totalRewardsFunded;
    uint public totalRewardsPaid;

    address public lastUser;
    uint public lastIndex;

    uint256 internal _totalUserPrincipal;
    address[] public users;

    constructor(YieldCore _vault, IERC20 _token) {
        vault = _vault;
        token = new YieldCoreToken("Yield", "YLD", 1_000_000 ether);
    }

    function stake(uint amount, uint lock) external {
        amount = bound(amount, 1 ether, 100 ether);
        token.approve(address(vault), amount);
        vault.stake(amount, lock);
        _totalUserPrincipal += amount;

        lastUser = msg.sender;
        lastIndex = vault.getStakeCount(msg.sender) - 1;
    }

    function claim(uint index) external {
        uint reward = vault.calculateReward(msg.sender, index);
        if (reward > 0) {
            vault.claimReward(index);
            totalRewardsPaid += reward;
        }
    }

    function fund(uint amount) external {
        amount = bound(amount, 1 ether, 1_000 ether);
        token.approve(address(vault), amount);
        vault.fundRewardPool(amount);
        totalRewardsFunded += amount;
    }

    function userTotalEarned(address user, uint256 index)
      external
      view
      returns (uint256)
    {
        return vault.getRewardsClaimed(user, index)
             + vault.calculateReward(user, index);
    }

    function totalUserPrincipal() external view returns (uint256) {
        return _totalUserPrincipal;
    }

    function userCount() external view returns (uint256) { 
        return users.length;
    }

    function isExpired(address user, uint256 index) external view returns (bool) {
    (
        ,
        uint256 startTime,
        ,
        uint256 lockPeriod,
        ,
        bool active,
        bool expired
    ) = vault.getStake(user, index);

    if (!active && expired) return true;

    return block.timestamp >= startTime + lockPeriod;
}
}