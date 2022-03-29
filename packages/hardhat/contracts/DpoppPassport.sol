//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.7.0;

//import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DpoppPassport is ERC721, Ownable {
    /// ****************************
    /// *****DATA TYPES*****
    /// ****************************

    using Counters for Counters.Counter;
    Counters.Counter private _passportIds;

    /**
     * @notice A struct containing the necessary information to reconstruct an EIP-712 typed data signature.
     *
     * @param v The signature's recovery parameter.
     * @param r The signature's r parameter.
     * @param s The signature's s parameter
     * @param deadline The signature's deadline
     */
    struct EIP712Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 deadline;
    }

    struct passportData {
        uint256 passportId;
        bytes32 passportName;
        bytes32 issuanceDate;
        EIP712Signature sig;
    }

    /// ****************************
    /// *****MAPPINGS*****
    /// ****************************

    mapping(address => passportData) public passports;

    /// ****************************
    /// *****EVENTS*****
    /// ****************************

    /// @notice Emitted when a passport is minted
    event onMintPassport(
        uint256 indexed passportId,
        bytes32 indexed issuanceDate,
        uint256 timestamp
    );

    constructor() public ERC721("YourCollectible", "YCB") {
        _setBaseURI("https://ipfs.io/ipfs/");
    }

    /// ****************************
    /// *****FUNCTIONS*****
    /// ****************************

    /// @notice Mint Passport
    function mintPassport(
        address to,
        string memory _issuanceDate,
        string memory tokenURI
    ) public returns (uint256) {
        bytes32 issuanceDate = keccak256(abi.encodePacked(_issuanceDate));

        //Increment Passport Ids
        _passportIds.increment();
        uint256 id = _passportIds.current();
        _mint(to, id);
        _setTokenURI(id, tokenURI);

        passports[to].passportId = id;
        passports[to].issuanceDate = issuanceDate;
        passports[to].passportName = passportName;

        emit onMintPassport(id, passportName, issuanceDate, block.timestamp);

        return id;
    }

    function checkForSignatureMatch(
        uint8 v,
        bytes32 r,
        bytes s,
        address sender,
        uint256 deadline,
        uint x
    ) external {
        require(block.timestamp < deadline, "Signature Expired");

        uint chainId;
        assembly {
            chainId := chainId
        }
        bytes32 ip712DomainHash = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name, string version, uint256 chainId, address verifyingContract)"
                ),
                keccak256(bytes("SetTest")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            );
        )
    };

    bytes32 hashStruct = keccak256(
        abi.encode(
            keccak256("set(address sender, uint x, uint deadline)"),
            sender,
            x,
            deadline
        );
    )

    bytes32 hash = keccak256(abi.encodePacked("\x19\x01", eip712DomainHash, hashStruct));
    address signer = ecrecover(hash, v, r, s);
    require(signer == sender, "Invalid Signature");
    require(signer != address(0), "Invalid Signature");

    set(x);
    
}
