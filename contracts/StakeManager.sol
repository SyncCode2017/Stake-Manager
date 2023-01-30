// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "hardhat/console.sol";

error StakeManager__StakeLimitExceeded();
error StakeManager__StakeIsZero();
error StakeManager__TransactionFailed();
error StakeManager__InsufficientBalance();
error StakeManager__ContractUpdateWindowIsOpen();
error StakeManager__ContractUpdateWindowIsNotOpen();
error StakeManager__StakeHolderDoesNotExist();
error StakeManager__StakeHolderAlreadyExists();

/// @title An Ethereum Token Purse to distribute funds to beneficiaries.
/// @dev There are a total of 1,000,000,000 unit of shares.
/// @custom:security-contact abolaji.adedeji@gmail.com
contract StakeManager is Pausable, AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    // FundsReceived event is triggered when funds are recieved to the contract
    event FundsReceived(address indexed addr, uint256 amount);

    // FundsDistributed is triggered when funds are distributed from the contract
    event FundsDistributed(
        address indexed beneficiary,
        uint256 amount,
        uint256 time_distributed
    );

    // BeneficiariesAdded is triggered when a new beneficiary is added to the contract
    event BeneficiariesAdded(
        address indexed holder,
        uint256 equityTokens,
        uint256 timeAdded
    );

    // BeneficiaryStakeIncreased is triggered when an existing beneficiary equity is increased
    event BeneficiaryStakeIncreased(
        address indexed holder,
        uint256 equityTokens,
        uint256 timeAdded
    );

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Stake struct manages an equity of each specific beneficiary
    struct Stake {
        uint256 equityTokens;
        uint256 fundsLastReceived;
        uint256 equityLastUpdated;
    }

    // list of beneficiaries addresses
    address[] public beneficiariesAddresses;

    // beneficiaries maps address to Stake of current beneficiaries
    mapping(address => Stake) public beneficiaries;

    // the address of the company treasury
    address payable public companyTreasuryAddress;

    // intervalSeconds is the number of seconds of the update windows e.g 30 days
    uint256 public immutable intervalSeconds;
    // updateWindowSeconds is number of seconds the interval of each update e.g 7 days
    uint256 public immutable updateWindowSeconds;
    // maxStake is the total stake in the purse
    uint256 private immutable maxStake = 10 ** 9;
    // lastEndOfWindowTimestamp is the last time stamp of when the interval ended in seconds
    uint256 public lastEndOfIntervalTimestamp;
    // currentTotalStake keeps track of the total beneficiary stakes
    uint256 public currentTotalStake = 0;

    constructor(address _companyTreasury, uint256 _interval, uint256 _window) {
        // grant roles to deployer address
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);

        // set the companyTreasury address
        setCompanyTreasuryAddress(_companyTreasury);

        // set the interval and window and current end of interval timestamp
        intervalSeconds = _interval;
        updateWindowSeconds = _window;
        lastEndOfIntervalTimestamp = block.timestamp + intervalSeconds;
    }

    /// @notice Distrbute funds to beneficiaries and remainder to Company Treasury
    function distributeFunds() public whenNotPaused nonReentrant {
        if (withinUpdateWindow()) {
            revert StakeManager__ContractUpdateWindowIsOpen();
        }

        uint256 fundsToDistribute = address(this).balance;
        uint256 fundsDistributed = 0;

        if (fundsToDistribute == 0) {
            revert StakeManager__InsufficientBalance();
        }
        address[] memory currentHolderAddresses = beneficiariesAddresses;
        for (uint256 i = 0; i < currentHolderAddresses.length; ++i) {
            // calculate amount to distribute
            uint256 equityTokens = beneficiaries[currentHolderAddresses[i]]
                .equityTokens;
            uint256 amount = fundsToDistribute.mul(equityTokens).div(maxStake);

            // update funds last received with timestamp
            beneficiaries[currentHolderAddresses[i]].fundsLastReceived = block
                .timestamp;
            fundsDistributed += amount;

            // send value to beneficiary
            sendValue(payable(beneficiariesAddresses[i]), amount);
            emit FundsDistributed(
                beneficiariesAddresses[i],
                amount,
                block.timestamp
            );
        }

        // update last timestamp with previous timestamp plus interval
        (, uint256 _closetimestamp) = getUpdateWindow();
        if (block.timestamp >= _closetimestamp) {
            lastEndOfIntervalTimestamp += intervalSeconds;
        } else {
            lastEndOfIntervalTimestamp = lastEndOfIntervalTimestamp;
        }

        // send remaining funds to company treasury fund address
        sendValue(companyTreasuryAddress, address(this).balance);
        emit FundsDistributed(
            companyTreasuryAddress,
            fundsDistributed,
            block.timestamp
        );
    }

    /// @notice Updates an existing beneficiary with a specific stake increase
    /// @param _holder The address of the existing beneficiary
    /// @param _stakeIncrease The amount to increase the equity tokens by
    function updateBeneficiariesStake(
        address _holder,
        uint256 _stakeIncrease
    ) public whenNotPaused onlyRole(MANAGER_ROLE) {
        // only continue if the update window is open
        if (!withinUpdateWindow()) {
            revert StakeManager__ContractUpdateWindowIsNotOpen();
        }

        // check if the stake is zero
        if (_stakeIncrease <= 0) {
            revert StakeManager__StakeIsZero();
        }

        // check if the new total stake is greater than maximum limit
        uint256 newTotalStake = currentTotalStake.add(_stakeIncrease);
        if (newTotalStake > maxStake) {
            revert StakeManager__StakeLimitExceeded();
        }

        // check if beneficiary exists
        if (beneficiaries[_holder].equityTokens <= 0) {
            revert StakeManager__StakeHolderDoesNotExist();
        }

        // Updating equities of existing beneficiaries
        uint256 newStake = beneficiaries[_holder].equityTokens.add(
            _stakeIncrease
        );
        beneficiaries[_holder].equityTokens = newStake;
        beneficiaries[_holder].equityLastUpdated = block.timestamp;
        currentTotalStake += _stakeIncrease;

        // emit beneficiary stake increased event
        emit BeneficiaryStakeIncreased(
            _holder,
            _stakeIncrease,
            block.timestamp
        );
    }

    /// @notice Adds a new beneficiary with an initial stake
    /// @param _holder The address of the existing beneficiary
    /// @param _initialStake The amount to initialise the preportion of the stake
    function addBeneficiary(
        address _holder,
        uint256 _initialStake
    ) public whenNotPaused onlyRole(MANAGER_ROLE) {
        // only continue if the update window is open
        if (!withinUpdateWindow()) {
            revert StakeManager__ContractUpdateWindowIsNotOpen();
        }

        // check if the stake is zero
        if (_initialStake <= 0) {
            revert StakeManager__StakeIsZero();
        }

        // check if the new total stake is greater than the limit
        uint256 newTotalStake = currentTotalStake.add(_initialStake);
        if (newTotalStake > maxStake) {
            revert StakeManager__StakeLimitExceeded();
        }

        // check if beneficiary already exists
        if (beneficiaries[_holder].equityTokens != 0) {
            revert StakeManager__StakeHolderAlreadyExists();
        }

        // add beneficiary to mapping
        beneficiaries[_holder] = Stake(
            _initialStake,
            block.timestamp,
            block.timestamp
        );
        beneficiariesAddresses.push(_holder);
        currentTotalStake += _initialStake;

        // emit beneficiary added map
        emit BeneficiariesAdded(_holder, _initialStake, block.timestamp);
    }

    /// @notice Updates the Company Treasury address
    /// @param _fund The new address of the Impact 3 fund
    function setCompanyTreasuryAddress(
        address _fund
    ) public onlyRole(MANAGER_ROLE) {
        companyTreasuryAddress = payable(_fund);
    }

    /// @notice Returns whether we are within the update window
    /// @return isOpen Whether the window to update or add new beneficiaries is open
    function withinUpdateWindow() public view returns (bool) {
        (uint256 _opentimestamp, uint256 _closetimestamp) = getUpdateWindow();

        if (
            block.timestamp >= _opentimestamp &&
            block.timestamp < _closetimestamp
        ) {
            return true;
        } else if (block.timestamp < lastEndOfIntervalTimestamp) {
            return true;
        }

        return false;
    }

    /// @notice Calculates the update window intervals
    /// @return openTimestamp The opening timestamp of the update window
    /// @return closeTimestamp The closing timestamp of the update window
    function getUpdateWindow() public view returns (uint256, uint256) {
        uint256 _opentimestamp = lastEndOfIntervalTimestamp + intervalSeconds;
        uint256 _closetimestamp = lastEndOfIntervalTimestamp +
            (intervalSeconds + updateWindowSeconds);
        return (_opentimestamp, _closetimestamp);
    }

    /// @notice Pauses the contract so no interactions can be made
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract so interactions can be made
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice When funds are received by the contract we emit an event
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /// @notice Sends an address funds from this contract
    /// @param recipient The address to send funds to
    /// @param amount The amount of funds to send
    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert StakeManager__InsufficientBalance();
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert StakeManager__TransactionFailed();
        }
    }

    /// @notice Gets all beneficiaries of the contract as well as their stake
    /// @return _holders An array of addresses of the beneficiaries
    /// @return _equityTokens An array of equity tokens
    function getBeneficiariesAddresses()
        external
        view
        returns (address[] memory _holders, uint256[] memory _equityTokens)
    {
        _holders = new address[](beneficiariesAddresses.length);
        _holders = beneficiariesAddresses;

        _equityTokens = new uint256[](_holders.length);
        for (uint256 i = 0; i < _holders.length; ++i) {
            _equityTokens[i] = beneficiaries[_holders[i]].equityTokens;
        }

        return (_holders, _equityTokens);
    }

    /// @notice Checks whether a specific address is a beneficiary of the contract
    /// @param _holder The address to check
    /// @return isABeneficiary whether or not the address is a beneficiary
    function isABeneficiary(address _holder) external view returns (bool) {
        if (beneficiaries[_holder].equityTokens <= 0) {
            return false;
        }
        return true;
    }
}
