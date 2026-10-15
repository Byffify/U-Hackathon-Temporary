// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Marketplace for the deployment chain. Source archives and decryption keys stay off-chain.
contract UTopiaMarketplace is ERC721, EIP712, ReentrancyGuard {
    uint256 public immutable CHAIN_ID;
    uint256 public constant FEE_BPS = 1_000;
    uint256 public constant BPS = 10_000;
    bytes32 private constant PURCHASE_TYPEHASH = keccak256(
        "Purchase(uint256 listingId,address buyer,uint256 price,bytes32 termsHash,uint256 nonce,uint256 deadline)"
    );
    bytes32 private constant RESALE_TYPEHASH = keccak256(
        "ResalePurchase(uint256 tokenId,address buyer,address seller,uint256 price,bytes32 termsHash,uint256 nonce,uint256 deadline)"
    );

    struct Listing {
        address creator;
        uint256 price;
        bytes32 termsHash;
        bool allowResale;
        bool allowDerivativeSale;
    }

    struct Entitlement {
        uint256 listingId;
        bytes32 termsHash;
        bool allowResale;
        bool allowDerivativeSale;
        uint256 purchasePrice;
    }

    struct Purchase {
        uint256 listingId;
        address buyer;
        uint256 price;
        bytes32 termsHash;
        uint256 nonce;
        uint256 deadline;
    }

    struct ResaleOffer {
        uint256 price;
        uint256 deadline;
    }

    struct ResalePurchase {
        uint256 tokenId;
        address buyer;
        address seller;
        uint256 price;
        bytes32 termsHash;
        uint256 nonce;
        uint256 deadline;
    }

    address public immutable platform;
    address public immutable sponsor;
    uint256 public nextListingId = 1;
    uint256 public nextTokenId = 1;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Entitlement) public entitlements;
    mapping(uint256 => ResaleOffer) public resaleOffers;
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public depositOf;
    mapping(address => uint256) public creditOf;
    mapping(uint256 => mapping(address => uint256)) public entitlementCount;
    bool private settlingResale;

    event ListingCreated(uint256 indexed listingId, address indexed creator, uint256 price, bytes32 termsHash);
    event ListingUpdated(uint256 indexed listingId, uint256 price, bytes32 termsHash);
    event Deposited(address indexed account, uint256 amount);
    event Purchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, uint256 price, uint256 fee);
    event ResaleOffered(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 deadline);
    event ResaleCancelled(uint256 indexed tokenId);
    event Resold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event Withdrawn(address indexed account, uint256 amount);

    error Unauthorized();
    error InvalidInput();
    error InvalidPurchase();
    error WrongChain();
    error InsufficientDeposit();
    error TransferDisabled();
    error NativeTransferFailed();

    constructor(address platform_, address sponsor_)
        ERC721("U-topia Access", "UTOPIA")
        EIP712("UTopiaMarketplace", "1")
    {
        if (platform_ == address(0) || sponsor_ == address(0)) revert InvalidInput();
        platform = platform_;
        sponsor = sponsor_;
        CHAIN_ID = block.chainid;
    }

    modifier onlyDeploymentChain() {
        if (block.chainid != CHAIN_ID) revert WrongChain();
        _;
    }

    function createListing(uint256 price, bytes32 termsHash, bool allowResale, bool allowDerivativeSale)
        external
        onlyDeploymentChain
        returns (uint256 listingId)
    {
        if (price == 0 || termsHash == bytes32(0)) revert InvalidInput();
        listingId = nextListingId++;
        listings[listingId] = Listing(msg.sender, price, termsHash, allowResale, allowDerivativeSale);
        emit ListingCreated(listingId, msg.sender, price, termsHash);
    }

    function updateListing(uint256 listingId, uint256 price, bytes32 termsHash, bool allowResale, bool allowDerivativeSale)
        external
        onlyDeploymentChain
    {
        Listing storage listing = listings[listingId];
        if (listing.creator != msg.sender) revert Unauthorized();
        if (price == 0 || termsHash == bytes32(0)) revert InvalidInput();
        listing.price = price;
        listing.termsHash = termsHash;
        listing.allowResale = allowResale;
        listing.allowDerivativeSale = allowDerivativeSale;
        emit ListingUpdated(listingId, price, termsHash);
    }

    /// @notice Funds a buyer's purchase balance. This funding transaction itself requires gas.
    function deposit() external payable onlyDeploymentChain {
        if (msg.value == 0) revert InvalidInput();
        depositOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdrawDeposit(uint256 amount) external nonReentrant onlyDeploymentChain {
        if (amount == 0 || depositOf[msg.sender] < amount) revert InsufficientDeposit();
        depositOf[msg.sender] -= amount;
        _send(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function withdrawCredit() external nonReentrant onlyDeploymentChain {
        uint256 amount = creditOf[msg.sender];
        if (amount == 0) revert InvalidInput();
        creditOf[msg.sender] = 0;
        _send(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Sponsor submits a buyer-signed purchase and pays the transaction gas.
    function buy(Purchase calldata request, bytes calldata signature) external nonReentrant onlyDeploymentChain returns (uint256 tokenId) {
        if (msg.sender != sponsor) revert Unauthorized();
        if (request.buyer == address(0) || request.deadline < block.timestamp) revert InvalidPurchase();
        if (request.nonce != nonces[request.buyer]) revert InvalidPurchase();
        Listing memory listing = listings[request.listingId];
        if (listing.creator == address(0) || listing.creator == request.buyer) revert InvalidPurchase();
        if (listing.price != request.price || listing.termsHash != request.termsHash) revert InvalidPurchase();
        bytes32 structHash = keccak256(abi.encode(
            PURCHASE_TYPEHASH, request.listingId, request.buyer, request.price,
            request.termsHash, request.nonce, request.deadline
        ));
        if (ECDSA.recover(_hashTypedDataV4(structHash), signature) != request.buyer) revert InvalidPurchase();
        if (depositOf[request.buyer] < request.price) revert InsufficientDeposit();

        nonces[request.buyer]++;
        depositOf[request.buyer] -= request.price;
        uint256 fee = request.price * FEE_BPS / BPS;
        creditOf[listing.creator] += request.price - fee;
        creditOf[platform] += fee;
        tokenId = nextTokenId++;
        entitlements[tokenId] = Entitlement(
            request.listingId, request.termsHash, listing.allowResale,
            listing.allowDerivativeSale, request.price
        );
        entitlementCount[request.listingId][request.buyer]++;
        _mint(request.buyer, tokenId);
        emit Purchased(request.listingId, tokenId, request.buyer, request.price, fee);
    }

    function hasAccess(uint256 tokenId, address account) external view returns (bool) {
        return account != address(0) && _ownerOf(tokenId) == account;
    }

    /// @notice Listing-level access is independent of the individual entitlement token ID.
    function hasListingAccess(uint256 listingId, address account) external view returns (bool) {
        return account != address(0) && entitlementCount[listingId][account] > 0;
    }

    function offerResale(uint256 tokenId, uint256 price, uint256 deadline) external onlyDeploymentChain {
        if (_ownerOf(tokenId) != msg.sender) revert Unauthorized();
        if (!entitlements[tokenId].allowResale || price == 0 || deadline <= block.timestamp) revert InvalidInput();
        resaleOffers[tokenId] = ResaleOffer(price, deadline);
        emit ResaleOffered(tokenId, msg.sender, price, deadline);
    }

    function cancelResale(uint256 tokenId) external onlyDeploymentChain {
        if (_ownerOf(tokenId) != msg.sender) revert Unauthorized();
        delete resaleOffers[tokenId];
        emit ResaleCancelled(tokenId);
    }

    function buyResale(ResalePurchase calldata request, bytes calldata signature)
        external
        nonReentrant
        onlyDeploymentChain
    {
        if (msg.sender != sponsor) revert Unauthorized();
        if (request.buyer == address(0) || request.buyer == request.seller) revert InvalidPurchase();
        if (request.deadline < block.timestamp || request.nonce != nonces[request.buyer]) revert InvalidPurchase();
        if (_ownerOf(request.tokenId) != request.seller) revert InvalidPurchase();
        Entitlement memory right = entitlements[request.tokenId];
        ResaleOffer memory offer = resaleOffers[request.tokenId];
        if (!right.allowResale || right.termsHash != request.termsHash) revert InvalidPurchase();
        if (offer.price == 0 || offer.price != request.price || offer.deadline < block.timestamp) revert InvalidPurchase();
        if (request.deadline > offer.deadline) revert InvalidPurchase();
        bytes32 structHash = keccak256(abi.encode(
            RESALE_TYPEHASH, request.tokenId, request.buyer, request.seller,
            request.price, request.termsHash, request.nonce, request.deadline
        ));
        if (ECDSA.recover(_hashTypedDataV4(structHash), signature) != request.buyer) revert InvalidPurchase();
        if (depositOf[request.buyer] < request.price) revert InsufficientDeposit();

        nonces[request.buyer]++;
        depositOf[request.buyer] -= request.price;
        delete resaleOffers[request.tokenId];
        entitlementCount[right.listingId][request.seller]--;
        entitlementCount[right.listingId][request.buyer]++;
        uint256 fee = request.price * FEE_BPS / BPS;
        creditOf[request.seller] += request.price - fee;
        creditOf[platform] += fee;
        settlingResale = true;
        _transfer(request.seller, request.buyer, request.tokenId);
        settlingResale = false;
        emit Resold(request.tokenId, request.seller, request.buyer, request.price, fee);
    }

    /// @dev Entitlements cannot be transferred outside atomic marketplace resale settlement.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && !settlingResale) revert TransferDisabled();
        return super._update(to, tokenId, auth);
    }

    function _send(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }
}
