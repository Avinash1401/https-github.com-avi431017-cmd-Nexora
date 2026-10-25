// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NexoraToken (NXR)
 * @author NEXORA Architectural Engineering
 * @notice Canonical ERC-20 token implementation for NEXORA COIN.
 *
 * Specification & Security Enforcements:
 * - Fixed Maximum Supply (Hard Cap): 21,000,000 NXR (21,000,000 * 10^18 units).
 * - Capped Supply cannot be bypassed; any attempt to mint beyond 21M reverts.
 * - Least-Privilege Access Control: DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE.
 * - Emergency Pausing: Protects token state during detected security anomalies.
 * - Token Burning: Token holders may irreversibly burn tokens to reduce total supply.
 * - No Backdoors, No Hidden Fees, No Blacklists.
 */

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract AccessControl is Context {
    struct RoleData {
        mapping(address => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _revokeRole(bytes32 role, address account) internal virtual {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }
}

abstract contract Pausable is Context {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    error EnforcedPause();
    error ExpectedPause();

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

contract NexoraToken is Context, AccessControl, Pausable, IERC20Metadata {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string private constant _NAME = "NEXORA COIN";
    string private constant _SYMBOL = "NXR";
    uint8 private constant _DECIMALS = 18;

    uint256 private immutable _CAP;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    error ERC20ExceededCap(uint256 increasedSupply, uint256 cap);
    error ERC20InvalidCap(uint256 cap);
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 currentAllowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);

    /**
     * @dev Initializes token with strict 21,000,000 NXR hard cap.
     * @param initialAdmin Address designated with administrative governance.
     */
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) {
            revert ERC20InvalidSender(address(0));
        }

        // 21,000,000 * 10^18
        uint256 maxCap = 21_000_000 * 10 ** _DECIMALS;
        _CAP = maxCap;

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
    }

    function name() public pure override returns (string memory) {
        return _NAME;
    }

    function symbol() public pure override returns (string memory) {
        return _SYMBOL;
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    function cap() public view returns (uint256) {
        return _CAP;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public override whenNotPaused returns (bool) {
        _transfer(_msgSender(), to, value);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public override whenNotPaused returns (bool) {
        _approve(_msgSender(), spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public override whenNotPaused returns (bool) {
        _spendAllowance(from, _msgSender(), value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @notice Minting function strictly capped at 21,000,000 NXR.
     * @dev Restricted to authorized MINTER_ROLE (Treasury and Reward Pool).
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
    }

    /**
     * @notice Allows any holder to permanently burn tokens.
     */
    function burn(uint256 amount) public whenNotPaused {
        _burn(_msgSender(), amount);
    }

    /**
     * @notice Allows approved spenders to burn from owner's allowance.
     */
    function burnFrom(address account, uint256 amount) public whenNotPaused {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert ERC20InvalidSender(address(0));
        if (to == address(0)) revert ERC20InvalidReceiver(address(0));

        uint256 fromBalance = _balances[from];
        if (fromBalance < value) {
            revert ERC20InsufficientBalance(from, fromBalance, value);
        }

        unchecked {
            _balances[from] = fromBalance - value;
            _balances[to] += value;
        }

        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));

        if (totalSupply() + value > cap()) {
            revert ERC20ExceededCap(totalSupply() + value, cap());
        }

        _totalSupply += value;
        unchecked {
            _balances[account] += value;
        }

        emit Transfer(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidSender(address(0));

        uint256 accountBalance = _balances[account];
        if (accountBalance < value) {
            revert ERC20InsufficientBalance(account, accountBalance, value);
        }

        unchecked {
            _balances[account] = accountBalance - value;
            _totalSupply -= value;
        }

        emit Transfer(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value);
            }
        }
    }
}
