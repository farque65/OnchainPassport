import React, { useState, useEffect } from "react";
import { Button, Divider, Input, List } from "antd";
import { Web3Consumer } from "../helpers/Web3Context";
import { Card as CardView, Address, PassportView } from "../components";
import dynamic from "next/dynamic";
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });
import { ipfs } from "../helpers/ipfs";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import { useDebounce } from "../hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { ethers, BigNumber } from "ethers";

// EXAMPLE STARTING JSON:
const STARTING_JSON = {
  description: "It's actually a bison?",
  external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
  image: "https://austingriffith.com/images/paintings/buffalo.jpg",
  name: "Buffalo",
  attributes: [
    {
      trait_type: "BackgroundColor",
      value: "green",
    },
    {
      trait_type: "Eyes",
      value: "googly",
    },
  ],
};

const attestations = [
  {
    ref: "twitter",
    name: "Twitter",
    desc: "Get verified by connecting your Twitter account.",
    is_verified: true,
  },
  {
    ref: "brightid",
    name: "BrightID",
    desc: "BrightID is a social identity network. Get verified by joining a BrightID verification party.",
    is_verified: false,
  },
];

/* 

*******NFT Data*******

public address {
    public_address: ""
    }

data fields {

    field a {
        data: string or int
        }

    field b {
        name: "
        }

    field c {
        github_handle: ""
        }

    }

attestations {

    attestation a {
        attestation_cid: CID
        attestation_timestamp: date & time of linking
        }

    attestation b {
        brightID_cid: CID
        brightID_timestamp: 1647546830
    }

    attestation c {
        idena_cid: CID
        idena_timestamp: null
        }

    }

}


------------------

{
    "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1"
    ],
    "id": "https://yqs3j2p1k9.execute-api.us-east-1.amazonaws.com/prod/credentials/d98b8f50-c472-11eb-97fb-cbf4e5918c09",
    "type": [
        "VerifiableCredential",
        "UniversityDegreeCredential"
    ],
    "issuer": "https://mercury-credentials-public-tb0172-prod.s3.us-east-1.amazonaws.com/controller.json",
    "issuanceDate": "2021-06-01T12:00:00.000Z",
    "credentialSubject": {
        "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
        "degree": "Bachelor of Science",
        "degreeType": "BachelorDegree",
        "degreeSchool": "Mercury University"
    },
    "proof": {
        "type": "Ed25519Signature2018",
        "created": "2021-06-03T13:51:52Z",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8YIj2tG6HoiDKw476_ElxcCFiCTr89jHX24Osr1zgklp0Sgfkgx-ipu6Li5og4wtLGMoa7__xJpcHWHzwWZoCQ",
        "proofPurpose": "assertionMethod",
        "verificationMethod": "https://mercury-credentials-public-tb0172-prod.s3.us-east-1.amazonaws.com/publicKey.json"
    }
}

--------------------
verified

[
  {
    "proof": {
      "@context": "https://w3id.org/security/v2",
      "type": "Ed25519Signature2018",
      "created": "2021-06-03T13:51:52Z",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8YIj2tG6HoiDKw476_ElxcCFiCTr89jHX24Osr1zgklp0Sgfkgx-ipu6Li5og4wtLGMoa7__xJpcHWHzwWZoCQ",
      "proofPurpose": "assertionMethod",
      "verificationMethod": "https://mercury-credentials-public-tb0172-prod.s3.us-east-1.amazonaws.com/publicKey.json"
    },
    "verified": true,
    "purposeResult": {
      "valid": true,
      "controller": {
        "id": "https://mercury-credentials-public-tb0172-prod.s3.us-east-1.amazonaws.com/controller.json",
        "assertionMethod": [
          "https://mercury-credentials-public-tb0172-prod.s3.us-east-1.amazonaws.com/publicKey.json"
        ]
      }
    }
  }
]


*/

function home({ web3 }) {
  const [yourJSON, setYourJSON] = useState(STARTING_JSON);
  const [sending, setSending] = useState();
  const [ipfsHash, setIpfsHash] = useState();
  const [verificationScore, setVerificationScore] = useState(0);
  const [hasPassport, setHasPassport] = useState();
  const [passportData, setPassportData] = useState();
  const [passportIssuanceDate, setPassportIssuanceDate] = useState();
  const [passportName, setPassportName] = useState();
  const [mintingPassport, setMintingPassport] = useState();
  const { readContracts, writeContracts, localProvider, mainnetProvider, address, userSigner, tx, startBlock } = web3;

  useEffect(() => {
    let score = 0;

    for (const att of attestations) {
      if (att.is_verified) {
        score++;
      }
    }

    setVerificationScore(score);
    setPassportIssuanceDate(new Date().toISOString());
    setIpfsHash(uuidv4());
  }, []);

  useEffect(() => {
    const readPassports = async () => {
      let result = 0;
      if (readContracts?.DpoppPassport) {
        const passports = (await readContracts.DpoppPassport.balanceOf(address)) || 0;
        result = ethers.utils.formatUnits(BigNumber.from(passports), 1).toString();
        const resultNum = parseFloat(result);
        console.log("result ", resultNum, resultNum > 0);
        setHasPassport(resultNum > 0);
      }
    };
    readPassports();
  }, [readContracts, address]);

  const mintPassport = async () => {
    if (!userSigner) {
      alert("Wallet Connection Error");
      return;
    }
    setMintingPassport(true);
    if (!passportName) {
      alert("Passport Name Not Entered");
      return;
    }
    try {
      const result = tx(
        writeContracts.DpoppPassport.mintPassport(address, passportName, passportIssuanceDate, ipfsHash),
        async update => {
          console.log("📡 Transaction Update:", update);
          // reset minting
          if (update && (update.status === "confirmed" || update.status === 1)) {
            console.log(" 🍾 Transaction " + update.hash + " finished!");
            console.log(
              " ⛽️ " +
                update.gasUsed +
                "/" +
                (update.gasLimit || update.gas) +
                " @ " +
                parseFloat(update.gasPrice) / 1000000000 +
                " gwei",
            );
          }
        },
      );
      console.log("awaiting metamask/web3 confirm result...", result);
      console.log(await result);
    } catch (err) {
      console.log(err);
      setMintingPassport(false);
    }
    setMintingPassport(false);
  };

  const passportEvents = useEventListener(
    readContracts,
    "DpoppPassport",
    "onMintPassport",
    localProvider,
    startBlock - 9000,
  );
  const passports = useDebounce(passportEvents, 1000);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <h1 className="mt-10 text-5xl font-medium title-font text-gray-900">Passport Authority</h1>
      <Divider style={{ borderColor: "black" }} />
      <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 underline">User Info</h1>
      {yourJSON && (
        <div>
          <h3>Name: {yourJSON.name}</h3>
          <h3>Description: {yourJSON.description}</h3>
        </div>
      )}
      <Divider style={{ borderColor: "black" }} />
      <div className="p-10 mb-10">
        <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900">
          NFT Passport{" "}
          {hasPassport ? (
            <span className="text-green-500">Detected</span>
          ) : (
            <span p className="text-red-500">
              Not Found
            </span>
          )}
        </h1>
      </div>

      <Divider style={{ borderColor: "black" }} />
      <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 underline">Passport Data</h1>
      {/* Allow the user to make a new passport */}
      {!passportData && (
        <div>
          <div className="flex flex-wrap mt-10 p-2">
            <div className="flex flex-wrap w-1/2 justify-center items-center">
              <div className="max-w-md">
                <div>{JSON.stringify(passportData)}</div>

                <br />
                <br />
                <Input addonBefore="Address" size="large" placeholder="Address" disabled={true} value={address} />
                <br />
                <br />
                <Input
                  addonBefore="Passport Name"
                  size="large"
                  placeholder="Enter Passport Name"
                  onChange={e => {
                    const name = e.target.value;
                    const slugifiedName = slugify(name.toLowerCase(), "_");
                    setPassportName(slugifiedName);
                  }}
                />
                <br />
                <br />
                <Input
                  addonBefore="Issuance Date"
                  size="large"
                  placeholder="Issuance Date"
                  disabled={true}
                  value={passportIssuanceDate}
                />
                <br />
                <br />
                {/* TODO: enable IPFS import */}
                <Input addonBefore="IPFS Hash" size="large" placeholder="IPFS Hash" disabled={true} value={ipfsHash} />
                <br />
                <br />
              </div>
            </div>
            <div className="flex flex-wrap w-1/2 pl-16">
              <div className="max-w-md">
                {"{"}
                <br />
                <br />
                <p>{`"Passport Address": ${address},`}</p>
                <p>{`"Passport Name": ${passportName},`}</p>
                <p>{`"Issuance Date": ${passportIssuanceDate},`}</p>
                <p>{`"IPFS Hash": ${ipfsHash},`}</p>
                <p>{`"attestations" : `}</p>
                {JSON.stringify(attestations)}
                <br />
                {"}"}
              </div>
            </div>
          </div>

          <Button
            loading={sending}
            size="large"
            shape="round"
            type="primary"
            onClick={async () => {
              const result = await mintPassport();
              if (result) {
                alert(result);
              }
              console.log("RESULT:", result);
            }}
          >
            Mint A Passport
          </Button>
        </div>
      )}

      <Divider style={{ borderColor: "black" }} />
      <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 underline">Passport Score</h1>
      <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900">
        Your Passport Score is <span className="underline">{verificationScore}</span>
      </h1>
      <Divider style={{ borderColor: "black" }} />
      <div className="px-4 mb-10">
        <div className="text-center mb-4">
          <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 underline">Attestations</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {attestations?.length < 1 && <div>No attestations</div>}
          {attestations?.length > 1 &&
            attestations.map((item, i) => <CardView data={item} key={`${i}_${item.name}`} />)}
        </div>
      </div>

      <Divider style={{ borderColor: "black" }} />
      <div className="px-10 mb-56">
        <div className="text-center mb-4">
          <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 underline">
            Passports Issuance List
          </h1>
        </div>
        {/* User has a passport */}
        {!passports && <h1>No Passports Found</h1>}
        {passports && passports.map((item, i) => <PassportView data={item} key={`${i}_${item.name}`} />)}
      </div>
    </div>
  );
}

export default Web3Consumer(home);
