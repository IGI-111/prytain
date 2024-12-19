
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { BlurFilter, TextStyle } from "pixi.js";
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Instances, Instance,
  CameraControls,
  TransformControls,
  OrthographicCamera,
  Environment,
  Lightformer,
  OrbitControls,
  PivotControls,
} from "@react-three/drei";
import * as THREE from "three";
import Map from "./Map";
import {  useDisconnect } from "@fuels/react";

function Market({ contract, shipPosition, origin }) {
  const [prices, setPrices] = useState(undefined);
  const [gold, setGold] = useState(undefined);
  const [inventory, setInventory] = useState(undefined);

  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const updateGold = async () => {
      const p = (await contract.functions.player_gold().get()).value;
      const gold = p["Some"] ? p["Some"].toNumber() : undefined;
      setGold(gold);
  };

  const updateInventory = async () => {
      const p = (await contract.functions.player_inventory().get()).value;
      const inventory= p["Some"] ? p["Some"].map(a => a.toNumber()) : undefined;
      setInventory(inventory);
  };

  const updatePrices = async () => {
      const p = (await contract.functions.island_prices(shipPosition[0], shipPosition[1]).get()).value;
      const prices = p["Some"] ? p["Some"] : undefined;
      setPrices(prices);
  };

  useEffect(() => {
      updateGold();
      updateInventory();
      updatePrices();

      // Start the interval
      const interval = setInterval(() => {
        updatePrices();
      }, 1000);  // 1000ms = 1 second
      // Cleanup function to clear interval when component unmounts
      return () => clearInterval(interval);
  }, []);  

  const handleBuy = async (i) => {
    const amount = Number(inputRefs[i].current.value);
    const res = (await contract.functions.buy_item(i, amount).call()).value;
    updateGold();
    updateInventory();
    updatePrices();
  };
  const handleSell = async (i) => {
    const amount = Number(inputRefs[i].current.value);
    const res = (await contract.functions.sell_item(i, amount).call()).value;
    setInventory(inv => {
      inv[i] -= amount;
      return inv;
    });
    setGold(g => {
      g += prices[i] * amount;
      return g;
    });
    updateGold();
    updateInventory();
    updatePrices();
  };
  
  

  return (
    <>
      <h1> Market for {`${shipPosition[0]-origin.x}, ${shipPosition[1]-origin.y}`} </h1>
      {gold && (
        <p>
          You have {gold}G.
        </p>
      )}
      {prices && (
      <ul>
        {["Spice", "Silk", "Sugar", "Tea"].map((name, i) => {
          return (
            <li key={i}>
              {name}: {prices[i]}G<br/>
              { inventory && (<span>You have {inventory[i]} units.</span>) }
              <br/>
              The local tariff for selling is 10%.<br/>
              <input type="number" ref={inputRefs[i]}/>
              <button onClick={() => handleBuy(i)}>
                Buy
              </button>
              <button onClick={() => handleSell(i)}>
                Sell
              </button>

            </li>
          );
        })}
      </ul>
      )}
    </>
  );
}

export default Market;
