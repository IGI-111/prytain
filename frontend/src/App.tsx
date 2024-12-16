import { cssObj } from "@fuel-ui/css";
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { useIsConnected, useWallet } from "@fuels/react";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useConnectUI, useDisconnect } from "@fuels/react";

import {
  CONTRACT_ID,
} from "./constants.ts";
import "./App.css";
import { Prytain } from "./sway-api/index.ts";
import Map, { MapMode } from "./components/Map.tsx";

function App() {
  const { isConnected } = useIsConnected();
  const { wallet } = useWallet();

  const contract = useMemo(() => {
    if (wallet) {
      const contract = new Prytain(CONTRACT_ID, wallet);
      return contract;
    }
    return null;
  }, [wallet]);

  const { connect, isConnecting } = useConnectUI();
  const { disconnect } = useDisconnect();

  const [mode, setMode] = useState(MapMode.Move);

  return (
    <Box>
      { isConnected && wallet ? (
        <Box>
          <p>{wallet.address.toB256()}</p>
          <Button onPress={() => { disconnect(); }}>
            Disconnect
          </Button>
          <Button isDisabled={mode == MapMode.Selection} onPress={() => { setMode(MapMode.Selection); }}>
            Select
          </Button>
          <Button isDisabled={mode == MapMode.Move} onPress={() => { setMode(MapMode.Move); }}>
            Move
          </Button>
          <Map mode={mode} contract={contract}/>
        </Box>
      ) : (
        <Box>
          <p>Connect with the Fuel Wallet</p>
          <Button onPress={() => { connect(); }}>
            {isConnecting ? "Connecting" : "Connect"}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default App;
