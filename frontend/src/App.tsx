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

  return (
    <Box>
      { isConnected && wallet ? (
        <Box>
          <Map contract={contract}/>
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
