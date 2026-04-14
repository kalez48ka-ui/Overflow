// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReentrancyAttacker
 * @notice Helper contract for testing reentrancy protection on Overflow platform contracts.
 * @dev Attempts to re-enter a target function when receiving ETH via receive().
 */
contract ReentrancyAttacker {
    address public target;
    bytes public reentrantCalldata;
    bool public attacking;
    bool public attackSucceeded;

    /**
     * @notice Set up the attack target and calldata, then forward the call.
     * @param _target The contract to attack.
     * @param data The calldata to re-enter with.
     */
    function attack(address _target, bytes calldata data) external payable {
        target = _target;
        reentrantCalldata = data;
        attacking = true;
        attackSucceeded = false;

        (bool success, ) = _target.call{value: msg.value}(data);
        require(success, "Initial call failed");
    }

    /**
     * @notice Proxy call: call a target function without reentrancy (for setup operations).
     */
    function proxyCall(address _target, bytes calldata data) external payable {
        (bool success, ) = _target.call{value: msg.value}(data);
        require(success, "Proxy call failed");
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Attempt to re-enter the target
            (bool success, ) = target.call(reentrantCalldata);
            attackSucceeded = success;
        }
    }
}
