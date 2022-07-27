// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error EquityManager__TotalValueGreaterThan100();
error EquityManager__StakeIsZero();
error EquityManager__TransactionFailed();
error EquityManager__InsufficientBalance();
error EquityManager__ContractUpdateWindowIsOpen();
error EquityManager__ContractUpdateWindowIsNotOpen();
error EquityManager__StakeHolderDoesNotExist();
error EquityManager__StakeHolderAlreadyExists();

/// @custom:security-contact info@impact3.io
contract EquityManager is Pausable, AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    // FundsReceived event is triggered when funds are recieved to the contract
    event FundsReceived(address indexed addr, uint256 amount);

    // FundsDistributed is triggered when funds are distributed from the contract
    event FundsDistributed(
        address stakeholder,
        uint256 amount,
        uint256 time_distributed
    );

    // StakeHolderAdded is triggered when a new stakeholder is added to the contract
    event StakeHolderAdded(address holder, uint256 stake, uint256 timeAdded);

    // StakeHolderStakeIncreased is triggered when an existing stakeholder equity is increased
    event StakeHolderStakeIncreased(
        address holder,
        uint256 stake,
        uint256 timeAdded
    );

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Equity Stake struct encapsulates an equity stake for a specific stakeholder
    struct Stake {
        uint256 stakePercentage;
        uint256 fundsLastReceived;
        uint256 equityLastUpdated;
    }

    // list of addresses that are stakeholders
    address[] public stakeHolderAddresses;

    // stakeHolder is a mapping from address to Stake of current stake holders
    mapping(address => Stake) public stakeHolders;

    // the address of the impact3 treasury fund
    address payable public impact3FundAddress;

    // intervalMilliseconds is the number of milliseconds of the update windows ie 30 days
    uint256 public immutable intervalMilliseconds;
    // updateWindowMilliseconds is number of milliseconds the interval of each update ie 7 days
    uint256 public immutable updateWindowMilliseconds;

    // lastEndOfWindowTimestamp is the last time stamp of when the interval ended
    uint256 public lastEndOfIntervalTimestamp;

    constructor(
        address _i3Fund,
        uint256 _interval,
        uint256 _window
    ) {
        // grant roles to deployer address
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);

        // set the i3Fund address
        setImpact3FundAddress(_i3Fund);

        // set the interval and window
        intervalMilliseconds = _interval;
        updateWindowMilliseconds = _window;
        lastEndOfIntervalTimestamp = block.timestamp;
    }

    /////////////////////
    // Main Functions //
    /////////////////////

    /*
     * @notice Method for distributing funds
     * @notice equity stake is updated at the every stipulated interval
     */
    function distributeFunds() public whenNotPaused nonReentrant {
        if (withinUpdateWindow()) {
            revert EquityManager__ContractUpdateWindowIsOpen();
        }

        uint256 fundsToDistribute = address(this).balance;
        uint256 fundsDistributed = 0;

        address[] memory currentHolderAddresses = stakeHolderAddresses;
        for (uint256 i = 0; i < currentHolderAddresses.length; i++) {
            // calculate amount to distribute
            uint256 stakeHolderPecentage = stakeHolders[
                currentHolderAddresses[i]
            ].stakePercentage;
            uint256 amount = fundsToDistribute.mul(stakeHolderPecentage).div(
                100
            );

            // update funds last received with timestamp
            stakeHolders[currentHolderAddresses[i]].fundsLastReceived = block
                .timestamp;
            fundsDistributed += amount;

            // send value to stake holder
            sendValue(payable(stakeHolderAddresses[i]), amount);
            emit FundsDistributed(
                stakeHolderAddresses[i],
                amount,
                block.timestamp
            );
        }

        // send remaining funds to impact 3 fund address
        sendValue(impact3FundAddress, address(this).balance);
        emit FundsDistributed(
            impact3FundAddress,
            fundsDistributed,
            block.timestamp
        );

        // update last timestamp with previous timestamp plus interval
        (, uint256 _closetimestamp) = getUpdateWindow();
        if (block.timestamp >= _closetimestamp) {
            lastEndOfIntervalTimestamp += intervalMilliseconds;
        }
    }

    function updateStakeHolder(address _holder, uint256 _stakeIncrease)
        public
        whenNotPaused
        onlyRole(MANAGER_ROLE)
    {
        // only continue if the update window is open
        if (!withinUpdateWindow()) {
            revert EquityManager__ContractUpdateWindowIsNotOpen();
        }

        // check if the stake is zero
        if (_stakeIncrease <= 0) {
            revert EquityManager__StakeIsZero();
        }

        // check if the new total stake is greater than 100%
        uint256 newTotalStake = totalStake(stakeHolderAddresses).add(
            _stakeIncrease
        );
        if (newTotalStake > 100) {
            revert EquityManager__TotalValueGreaterThan100();
        }

        // check if stake holder exists
        if (stakeHolders[_holder].stakePercentage == 0) {
            revert EquityManager__StakeHolderDoesNotExist();
        }

        // Updating equities of existing stakeholders
        uint256 newStake = stakeHolders[_holder].stakePercentage.add(
            _stakeIncrease
        );
        stakeHolders[_holder].stakePercentage = newStake;
        stakeHolders[_holder].equityLastUpdated = block.timestamp;

        // emit stake holder stake increased event
        emit StakeHolderStakeIncreased(
            _holder,
            _stakeIncrease,
            block.timestamp
        );
    }

    function addStakeHolder(address _holder, uint256 _initialStake)
        public
        whenNotPaused
        onlyRole(MANAGER_ROLE)
    {
        // only continue if the update window is open
        if (!withinUpdateWindow()) {
            revert EquityManager__ContractUpdateWindowIsNotOpen();
        }

        // check if the stake is zero
        if (_initialStake <= 0) {
            revert EquityManager__StakeIsZero();
        }

        // check if the new total stake is greater than 100%
        uint256 newTotalStake = totalStake(stakeHolderAddresses).add(
            _initialStake
        );
        if (newTotalStake > 100) {
            revert EquityManager__TotalValueGreaterThan100();
        }

        // check if stake holder already exists
        if (stakeHolders[_holder].stakePercentage != 0) {
            revert EquityManager__StakeHolderAlreadyExists();
        }

        // add stake holder to mapping
        stakeHolders[_holder] = Stake(
            _initialStake,
            block.timestamp,
            block.timestamp
        );

        // emit stake holder added map
        emit StakeHolderAdded(_holder, _initialStake, block.timestamp);
    }

    // setImpact3FundAddress is a public method to set the Impact 3 Fund address
    function setImpact3FundAddress(address fund) public onlyRole(MANAGER_ROLE) {
        impact3FundAddress = payable(fund);
    }

    // totalState calculates the total stake percentage of the current stake
    // holders and returns a uint256
    function totalStake(address[] memory _currentHolders)
        internal
        view
        returns (uint256)
    {
        uint256 _totalStake = 0;
        for (uint256 i = 0; i < _currentHolders.length; i++) {
            _totalStake += stakeHolders[_currentHolders[i]].stakePercentage;
        }
        return _totalStake;
    }

    function withinUpdateWindow() public view returns (bool) {
        (uint256 _opentimestamp, uint256 _closetimestamp) = getUpdateWindow();

        if (
            block.timestamp >= _opentimestamp &&
            block.timestamp < _closetimestamp
        ) {
            return true;
        }

        return false;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert EquityManager__InsufficientBalance();
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert EquityManager__TransactionFailed();
        }
    }

    function getUpdateWindow() internal view returns (uint256, uint256) {
        uint256 _opentimestamp = lastEndOfIntervalTimestamp +
            intervalMilliseconds;
        uint256 _closetimestamp = lastEndOfIntervalTimestamp +
            (intervalMilliseconds + updateWindowMilliseconds);
        return (_opentimestamp, _closetimestamp);
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    /*
     * @notice Function for getting stakeholders and
     * their current equity stake
     */
    function getStakeHolders()
        external
        view
        returns (address[] memory _holders, uint256[] memory _stakesPercent)
    {
        _holders = new address[](stakeHolderAddresses.length);
        _holders = stakeHolderAddresses;

        _stakesPercent = new uint256[](_holders.length);
        for (uint256 i = 0; i < _holders.length; i++) {
            _stakesPercent[i] = stakeHolders[_holders[i]].stakePercentage;
        }

        return (_holders, _stakesPercent);
    }
}
