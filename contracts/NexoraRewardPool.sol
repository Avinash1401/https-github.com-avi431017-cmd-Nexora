// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NexoraRewardPool
 * @author NEXORA Architectural Engineering
 * @notice Treasury-funded reward distribution contract for NEXORA COIN.
 *
 * Enforcements:
 * - Distributed strictly from the 45% Community Mining & Ecosystem Allocation (9,450,000 NXR).
 * - Requires cryptographic EIP-712 authorization signed by the off-chain oracle prober.
 * - Rate Cap: Maximum 0.00024000 NXR per 24 hours per verified node address.
 * - Nonce replay protection ensures a voucher cannot be claimed twice.
 * - Reentrancy guard and emergency pause mechanisms.
 */

interface INexoraToken {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract NexoraRewardPool {
    // EIP-712 Domain Separator constants
    bytes32 private constant _TYPE_HASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant _REWARD_VOUCHER_TYPEHASH = keccak256(
        "RewardVoucher(address recipient,uint256 amount,uint256 nonce,uint256 expiry,string cycleId)"
    );

    bytes32 private immutable _DOMAIN_SEPARATOR;
    uint256 private immutable _DEPLOYMENT_CHAIN_ID;

    address public owner;
    address public trustedSigner;
    INexoraToken public immutable token;

    // Rate cap: 0.00024000 NXR in 18 decimal units
    uint256 public constant MAX_DAILY_REWARD_CAP = 240_000_000_000_000; // 0.00024 * 10^18
    uint256 public constant MIN_CLAIM_INTERVAL = 24 hours;

    bool public paused;
    bool private _locked;

    // Recipient => Last Claim Timestamp
    mapping(address => uint256) public lastClaimTime;
    // Voucher Nonce => Claimed Status
    mapping(uint256 => bool) public executedNonces;

    event RewardClaimed(
        address indexed recipient,
        uint256 amount,
        uint256 indexed nonce,
        string cycleId,
        uint256 timestamp
    );
    event TrustedSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event PausedStateChanged(bool isPaused);

    error ReentrancyGuardReentrantCall();
    error NotOwner();
    error ContractPaused();
    error InvalidSignature();
    error VoucherExpired();
    error NonceAlreadyUsed();
    error ExceedsDailyRewardCap();
    error ClaimCooldownActive();
    error InsufficientPoolBalance();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuardReentrantCall();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address tokenAddress, address initialSigner) {
        if (tokenAddress == address(0) || initialSigner == address(0)) {
            revert ZeroAddress();
        }

        owner = msg.sender;
        token = INexoraToken(tokenAddress);
        trustedSigner = initialSigner;
        _DEPLOYMENT_CHAIN_ID = block.chainid;

        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                _TYPE_HASH,
                keccak256(bytes("NexoraRewardPool")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function domainSeparator() public view returns (bytes32) {
        if (block.chainid == _DEPLOYMENT_CHAIN_ID) {
            return _DOMAIN_SEPARATOR;
        } else {
            return keccak256(
                abi.encode(
                    _TYPE_HASH,
                    keccak256(bytes("NexoraRewardPool")),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
        }
    }

    /**
     * @notice Claims verified mining rewards using an EIP-712 authorized voucher.
     */
    function claimReward(
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        string calldata cycleId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        if (block.timestamp > expiry) revert VoucherExpired();
        if (executedNonces[nonce]) revert NonceAlreadyUsed();
        if (amount > MAX_DAILY_REWARD_CAP) revert ExceedsDailyRewardCap();
        if (block.timestamp < lastClaimTime[msg.sender] + MIN_CLAIM_INTERVAL) {
            revert ClaimCooldownActive();
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                _REWARD_VOUCHER_TYPEHASH,
                msg.sender,
                amount,
                nonce,
                expiry,
                keccak256(bytes(cycleId))
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator(), structHash)
        );

        address recovered = _recoverSigner(digest, signature);
        if (recovered != trustedSigner) revert InvalidSignature();

        // Mark nonce and update timestamp
        executedNonces[nonce] = true;
        lastClaimTime[msg.sender] = block.timestamp;

        // Ensure contract has sufficient balance
        if (token.balanceOf(address(this)) < amount) {
            revert InsufficientPoolBalance();
        }

        // Transfer reward tokens
        bool success = token.transfer(msg.sender, amount);
        require(success, "Token transfer failed");

        emit RewardClaimed(msg.sender, amount, nonce, cycleId, block.timestamp);
    }

    function setTrustedSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit TrustedSignerUpdated(trustedSigner, newSigner);
        trustedSigner = newSigner;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function _recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E735E5A99F04529E2CEE60632D5) {
            return address(0);
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(digest, v, r, s);
    }
}
