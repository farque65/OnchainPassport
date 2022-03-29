import { Button } from "antd";
import React from "react";
import { useThemeSwitcher } from "react-css-theme-switcher";
import Address from "./Address";
import Balance from "./Balance";
import Wallet from "./Wallet";

export default function Account({
  address,
  mainnetProvider,
  localProvider,
  price,
  minimized,
  web3Modal,
  loadWeb3Modal,
  loadWeb3ModalCeramic,
  logoutOfWeb3Modal,
  blockExplorer,
  userSigner,
  connection,
  disconnect,
}) {
  const modalButtons = [];
  if (web3Modal) {
    if (web3Modal.cachedProvider) {
      modalButtons.push(
        <Button
          key="logoutbutton"
          style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
          shape="round"
          size="large"
          onClick={logoutOfWeb3Modal}
        >
          logout
        </Button>,
      );
    } else {
      modalButtons.push(
        <Button
          key="loginbutton"
          style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
          shape="round"
          size="large"
          /* type={minimized ? "default" : "primary"}     too many people just defaulting to MM and having a bad time */
          onClick={() => {
            loadWeb3Modal();
          }}
        >
          connect
        </Button>,
      );
    }
  }
  if (connection?.selfID) {
    modalButtons.push(
      <Button
        key="logoutbutton"
        style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
        shape="round"
        size="large"
        onClick={disconnect}
      >
        disconnect self.id and metamask
      </Button>,
    );
  } else {
    modalButtons.push(
      <Button
        key="loginbutton"
        style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
        shape="round"
        size="large"
        onClick={() => {
          loadWeb3ModalCeramic();
        }}
      >
        connect self.id and metamask
      </Button>,
    );
  }

  const { currentTheme } = useThemeSwitcher();

  const display = minimized ? (
    ""
  ) : (
    <span>
      {address ? (
        <Address address={address} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
      ) : (
        "Connect Wallet"
      )}
      <Balance address={address} provider={localProvider} price={price} />
      <Wallet
        address={address}
        provider={localProvider}
        signer={userSigner}
        ensProvider={mainnetProvider}
        price={price}
        color={currentTheme === "light" ? "#1890ff" : "#2caad9"}
      />
    </span>
  );

  return (
    <div>
      {display}
      {modalButtons}
    </div>
  );
}
