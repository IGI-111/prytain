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
import Market from "./Market";
import {  useDisconnect } from "@fuels/react";

function useLocalStorage(key, initialValue) {
  // Get stored value or use initial value
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  // Update storage when value changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}


function Game({ contract }) {
  const [tiles, setTiles] = useLocalStorage({});
  const [mapOpen, setMapOpen] = useState(true);
  const [shipPosition, setShipPosition] = useState(undefined);
  const [origin, setOrigin] = useState({
    x: Math.floor(Math.pow(2, 32) / 2),
    y: Math.floor(Math.pow(2, 32) / 2),
  });

  const shipIsOnIsland = shipPosition && tiles[`${shipPosition[0]},${shipPosition[1]}`];
  
  useEffect(() => {
      const updatePos = async () => {
          const pos = (await contract.functions.player_position().get()).value;
          
          const shipPosition = pos["Some"] ? pos["Some"] : undefined;
          setShipPosition(shipPosition);
      };
      updatePos()

      // Start the interval
      const interval = setInterval(() => {
        updatePos();
      }, 2000);  // 1000ms = 1 second
      // Cleanup function to clear interval when component unmounts
      return () => clearInterval(interval);
  }, []);  

  return (
    mapOpen ? (
      <>
        <Map contract={contract} tiles={tiles} setTiles={setTiles} shipPosition={shipPosition} origin={origin}/>
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          { shipIsOnIsland && (
          <button
            onClick={() => setMapOpen(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'yellow',
              color: '#000000',
              border: '1px solid yellow',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Market
          </button>)}
        </div>
      </>
    ) : (
      <>
        <button
          onClick={() => setMapOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'yellow',
            color: '#000000',
            border: '1px solid yellow',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Return to Map
        </button>
        <Market contract={contract} shipPosition={shipPosition} origin={origin}/>
      </>
    )
  );
}

export default Game;
