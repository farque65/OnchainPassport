//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.7.0;

//import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//learn more: https://docs.openzeppelin.com/contracts/3.x/erc721

// GET LISTED ON OPENSEA: https://testnets.opensea.io/get-listed/step-two

/*

	Sample NFT Data Struct
	----------------------

	NFT_ID = {
		passport_address: "",
		issuance_date: "",
		passport_name: "",
		attestations: [
			{
				attestation_name: "",
				attestation_cid: "",
				created_date: "",
				expiry_date: "",
			},
			{
				attestation_name: "",
				attestation_cid: "",
				created_date: "",
				expiry_date: "",
			},
		]
	}

	***NFT_ID info mapping
	NFT_ID => {
		passport_address: "",
		issuance_date: "",
		passport_name: "",
	}

	***NFT_ID info mapping
	NFT_ID => {
		passport_address: "",
		issuance_date: "",
		passport_name: "",
	}
*/

/*
3 Levels
- Organization level
- User Address
- NFT level
*/

contract DpoppPassport is ERC721, Ownable {
    /// ****************************
    /// *****DATA TYPES*****
    /// ****************************

    using Counters for Counters.Counter;
    Counters.Counter private _passportIds;

    //Sample Org Id and attestation names for testing
    uint256 orgId = 1;
    string[] public attestationNames = ["twitter", "brightid"];

    struct passportData {
        address passportAddress;
        bytes32 issuanceDate;
        bytes32 passportName;
        uint256 orgId;
        uint256 passportScore;
    }

    struct attestationData {
        bytes32 attestationName;
        bytes32 attestationCid;
        uint256 issuanceDate;
        uint256 expiryDate;
    }

    /// ****************************
    /// *****MAPPINGS*****
    /// ****************************

    // Nested Attestation Mapping
    // NFT_ID => ATT_STRING => ATT DATA
    mapping(uint256 => mapping(string => attestationData)) public attestations;

    // Nested NFT Mapping
    // NFT_ID => NFT DATA
    mapping(uint256 => passportData) public passports;

    /// ****************************
    /// *****EVENTS*****
    /// ****************************

    /// @notice Emitted when a passport is minted
    event onMintPassport(
        uint256 indexed passportId,
        bytes32 indexed passportName,
        bytes32 indexed issuanceDate,
        uint256 timestamp
    );

    /// @notice Emitted when an attestation is added
    event onAttestationAdded(
        bytes32 indexed attestationCid,
        uint256 indexed attestationExpiry,
        uint256 indexed newScore,
        uint256 timestamp
    );

    /// @notice New generated score
    event onUpdatedScore(
        uint256 indexed score,
        address indexed passportOwner,
        uint256 indexed nftId,
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
        string memory _passportName,
        string memory _issuanceDate,
        string memory tokenURI
    ) public returns (uint256) {
        bytes32 passportName = keccak256(abi.encodePacked(_passportName));
        bytes32 issuanceDate = keccak256(abi.encodePacked(_issuanceDate));

        _passportIds.increment();
        uint256 id = _passportIds.current();
        _mint(to, id);
        _setTokenURI(id, tokenURI);

        passports[id].passportAddress = to;
        passports[id].issuanceDate = issuanceDate;
        passports[id].passportName = passportName;
        passports[id].orgId = orgId;
        passports[id].passportScore = 0;

        emit onMintPassport(id, passportName, issuanceDate, block.timestamp);

        return id;
    }

    /// @notice Add Attestation
    function addAttestation(
        address to,
        string memory _attestationName,
        bytes32 _attestationCid,
        uint256 _issuanceDate,
        uint256 nftId
    ) public returns (uint256) {
        // TODO: Expiry Date Calculation
        uint256 expiryDate = 0;

        attestations[nftId][_attestationName].attestationCid = _attestationCid;
        attestations[nftId][_attestationName].issuanceDate = _issuanceDate;
        //TODO: setting expiry date to zero for testing
        attestations[nftId][_attestationName].expiryDate = expiryDate;

        //TODO: update score afer adding new attestation
        uint256 newScore = updateScore(to, nftId);

        emit onAttestationAdded(
            _attestationCid,
            expiryDate,
            newScore,
            block.timestamp
        );

        return newScore;
    }

    /// @notice Get Attestation CID
    function getAttestationCid(uint256 _index, uint256 nftId)
        public
        view
        returns (bytes32)
    {
        // Using attestationNames test array for testing
        //TODO: get attestation names from an org array of attestations
        string memory attestationName = attestationNames[_index];
        return attestations[nftId][attestationName].attestationCid;
    }

    /// @notice Get Score
    function updateScore(address to, uint256 nftId) public returns (uint256) {
        uint256 score = 0;
        for (uint256 i = 0; i < attestationNames.length; i++) {
            if (getAttestationCid(i, nftId).length != 0) {
                score++;
            }
        }

        passports[nftId].passportScore = score;

        emit onUpdatedScore(score, to, nftId, block.timestamp);

        return score;
    }
}
