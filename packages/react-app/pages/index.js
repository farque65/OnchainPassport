import React, { useState, useEffect } from "react";
import { Button, Divider, Input, Checkbox } from "antd";
import { Web3Consumer } from "../helpers/Web3Context";
import { Card as CardView, Address, PassportView } from "../components";
import dynamic from "next/dynamic";
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });
import { EIP712 } from "../helpers/ipfs";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import { useDebounce } from "../hooks";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { ethers, BigNumber } from "ethers";
import { useViewerRecord } from "@self.id/framework";

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
    is_verified: true,
  },
];

function home({ web3 }) {
  const {
    readContracts,
    writeContracts,
    localProvider,
    mainnetProvider,
    address,
    userSigner,
    tx,
    startBlock,
    connection,
    ceramicEnv,
  } = web3;
  const [yourJSON, setYourJSON] = useState();
  const [sending, setSending] = useState();
  const [ipfsHash, setIpfsHash] = useState();
  const [verificationScore, setVerificationScore] = useState(0);
  const [hasPassport, setHasPassport] = useState(true);
  const [passportData, setPassportData] = useState();
  const [passportIssuanceDate, setPassportIssuanceDate] = useState();
  const [passportName, setPassportName] = useState();
  const [mintingPassport, setMintingPassport] = useState();
  const viewerRecord = useViewerRecord("basicProfile");
  const [ceramicPassport, setCeramicPassport] = useState();
  const [twitterAtt, setTwitterAtt] = useState();
  const [brightIdAtt, setBrightIdAtt] = useState();

  useEffect(() => {
    setPassportIssuanceDate(new Date().toISOString());
    setIpfsHash(uuidv4());
  }, []);

  useEffect(() => {
    setVerificationScore(ceramicPassport?.stamps.length || 0);
  }, [ceramicPassport]);

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

  async function sign(web3, order, account, verifyingContract) {
    // const chainId = Number(await web3.eth.getChainId());
    const chainId = 4;
    const data = EIP712.createTypeData(
      {
        name: "Exchange",
        version: "2",
        chainId,
        verifyingContract,
      },
      "Order",
      order,
      Types,
    );
    return (await EIP712.signTypedData(web3, account, data)).sig;
  }

  const getSignature = async (web3, order, signer) => {
    return sign(web3, order, signer, "0x1e1B6E13F0eB4C570628589e3c088BC92aD4dB45");
  };

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

  const createPassportCeramic = async () => {
    console.log("Awaiting passport creation in Ceramic...");
    const date = new Date();
    const newPassport = await ceramicEnv.model.createTile("Passport", {
      dateCreated: date.toISOString(),
      dateUpdated: date.toISOString(),
      stamps: [],
    });
    console.log(
      "Creating new passport: " + JSON.stringify(newPassport.content) + "; id: " + JSON.stringify(newPassport.id),
    );
    const streamID = await ceramicEnv.store.set("passport", { ...newPassport.content });
    console.log("Stream ID: ", streamID.toUrl());
    await getPassportCeramic();
  };

  const getPassportCeramic = async () => {
    if (connection.status === "connected") {
      const pass = await ceramicEnv.store.get("passport");
      console.log("Loaded passport: " + JSON.stringify(pass));
      setCeramicPassport(pass);
    } else {
      console.log("Not connected");
    }
  };

  const deletePassportCeramic = async () => {
    await ceramicEnv.store.remove("passport");
    console.log("Passport deleted");
    await getPassportCeramic();
  };

  const addStampsCeramic = async () => {
    if (ceramicPassport) {
      const date = new Date();
      let stamps = [];
      if (twitterAtt) {
        stamps.push({
          providerId: attestations[0].ref,
          name: attestations[0].name,
          description: attestations[0].desc,
          isVerified: attestations[0].is_verified,
          dateVerified: date.toISOString(),
        });
      }
      if (brightIdAtt) {
        stamps.push({
          providerId: attestations[1].ref,
          name: attestations[1].name,
          description: attestations[1].desc,
          isVerified: attestations[1].is_verified,
          dateVerified: date.toISOString(),
        });
      }

      const updatedPassport = { ...ceramicPassport, dateUpdated: date.toISOString(), stamps: stamps };
      console.log("update passport: ", JSON.stringify(updatedPassport));

      const streamID = await ceramicEnv.store.set("passport", updatedPassport);
      console.log("Stream ID: ", streamID.toUrl());

      await getPassportCeramic();
    }
  };

  useEffect(() => {
    getPassportCeramic();
  }, [connection, ceramicEnv]);

  // Get list of issued passports
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
      {connection.status === "connected" && connection.selfID ? (
        <div>
          {connection && <h3>Your 3ID is {connection.selfID.id}</h3>}
          {viewerRecord && <h3>Bio: {viewerRecord.content?.description}</h3>}
          <Divider style={{ borderColor: "black" }} />
          <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 text-center">
            ➡️ Passport{" "}
            {ceramicPassport ? (
              <span className="text-green-500">Detected</span>
            ) : (
              <span p className="text-red-500">
                Not Found
              </span>
            )}
          </h1>
          {!ceramicPassport ? (
            <div>
              <Button
                size="large"
                shape="round"
                type="primary"
                onClick={async () => {
                  await createPassportCeramic();
                  setBrightIdAtt(false);
                  setTwitterAtt(false);
                  console.log("Passport created!");
                }}
              >
                Create A Ceramic Passport
              </Button>
              {/* <Button
                size="large"
                shape="round"
                type="primary"
                onClick={async () => {
                  await mintPassport();
                  setBrightIdAtt(false);
                  setTwitterAtt(false);
                  console.log("Passport created!");
                }}
              >
                Mint an NFT Passport
              </Button> */}
            </div>
          ) : (
            <div>
              <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 text-center">
                ➡️ Your Passport Score is <span className="underline">{verificationScore}</span>
              </h1>
              <div className="flex flex-wrap mt-2 p-2">
                <div className="flex flex-wrap w-1/2 justify-center items-center">
                  <div className="max-w-md">
                    <br />
                    <br />
                    <Input
                      addonBefore="Date Created"
                      size="large"
                      placeholder="Date Created"
                      disabled={true}
                      value={ceramicPassport.dateCreated}
                    />
                    <br />
                    <br />
                    <Input
                      addonBefore="Date Updated"
                      size="large"
                      placeholder="Date Updated"
                      disabled={true}
                      value={ceramicPassport.dateUpdated}
                    />
                    <br />
                    <br />
                    <div>
                      <Checkbox onClick={e => setTwitterAtt(e.target.checked)}>Twitter Stamp</Checkbox>
                      <CardView data={attestations[0]} key={`0_${attestations[0].name}`} />
                    </div>
                    <br />
                    <div>
                      <Checkbox onClick={e => setBrightIdAtt(e.target.checked)}>BrightId Stamp</Checkbox>
                      <CardView data={attestations[1]} key={`1_${attestations[1].name}`} />
                    </div>
                    <br />
                    <br />
                  </div>
                </div>
                <div className="flex flex-wrap w-1/2 pl-16">
                  <div className="max-w-md">
                    <br />
                    {ceramicPassport && (
                      <div>
                        <h1 className="text-green-500">Passport Data in Ceramic</h1>
                        {JSON.stringify(ceramicPassport)}
                        <Divider style={{ borderColor: "black" }} />
                        <h1 className="text-red-500">Edit Passport Data</h1>
                        {"{"}
                        <br />
                        <p>Date Created: {ceramicPassport.dateCreated}</p>
                        <br />
                        <p>Date Updated: {ceramicPassport.dateUpdated}</p>
                        {"stamps: ["}
                        <br />
                        {twitterAtt && JSON.stringify(attestations[0])}
                        <br />
                        <br />
                        {brightIdAtt && JSON.stringify(attestations[1])}
                        <br />
                        {"]"}
                        <br />
                        <br />
                        {"}"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                {ceramicPassport && (
                  <div>
                    <Button
                      loading={sending}
                      size="large"
                      shape="round"
                      type="primary"
                      onClick={async () => {
                        await deletePassportCeramic();
                        console.log("Passport deleted!");
                      }}
                    >
                      Delete your passport
                    </Button>
                    <Button
                      loading={sending}
                      size="large"
                      shape="round"
                      type="primary"
                      onClick={async () => {
                        await addStampsCeramic();
                        console.log("Stamps updated!");
                      }}
                    >
                      Update your stamps
                    </Button>
                  </div>
                )}

                {!ceramicPassport && (
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
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>Connect with your wallet to create or access your 3ID</div>
      )}

      <Divider style={{ borderColor: "black" }} />
      <div className="px-4 mb-20"></div>
    </div>
  );
}

export default Web3Consumer(home);
