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
import TileMap from "./TileMap";
import {  useDisconnect } from "@fuels/react";

function Map({ contract, tiles, setTiles, shipPosition, origin }) {
  const [fetchQueue, setFetchQueue] = useState(new Set());

  const { disconnect } = useDisconnect();


  const fetchTilesBatched = async (coords) => {
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x, y]) => {
        fetchQueue.add(`${x},${y}`);
      });
      return fetchQueue;
    });

    let remaining = coords.slice();
    let batch_size = 60;
    let concurrency = 5;

    while (remaining.length > 0) {
      await Promise.all(
        [...Array(concurrency).keys()]
          .map((i) => remaining.slice(i * batch_size, (i + 1) * batch_size))
          .map((b) => fetchBatch(b)),
      );
      remaining = remaining.slice(batch_size * concurrency);
    }
  };

  const fetchBatch = async (coords) => {
    let batch;
    try {
      batch = (await contract.functions.check_islands(coords).get()).value;
    } catch (e) {
      if (e.name == "FuelError" && e.message.includes("OutOfGas")) {
        // split
        await fetchBatch(coords.slice(0, coords.length / 2));
        await fetchBatch(coords.slice(coords.length / 2));
        return;
      }
      throw e;
    }

    let tiles_obj = {};
    for (let i = 0; i < coords.length; ++i) {
      const x = coords[i][0];
      const y = coords[i][1];
      tiles_obj[`${x},${y}`] = batch[i];
    }
    setTiles((tiles) => Object.assign(tiles_obj, tiles));
    setFetchQueue((fetchQueue) => {
      coords.forEach(([x, y]) => {
        fetchQueue.delete(`${x},${y}`);
      });
      return fetchQueue;
    });
  };

  const spawn = async () => {
      let res = await contract.functions.spawn().call();
      // console.log(res)
  }


  const mapCoordsToContractCoords = c => {
    return c.splitAt(',');
  };

  const handleSelect = selectionSet => {
    // console.log(selectionSet);
    let coords = selectionSet.keys().map(
      k => {
        const nums = k.split(',').map(n => Number(n));
        return [nums[0] + origin.x, nums[1] + origin.y];
      }
    ).filter(c => tiles === undefined || !(c in tiles)).toArray();

    fetchTilesBatched(coords);
  };
  const handleMove = async pos => {
    const res = await contract.functions.order({ Goto: [origin.x + pos[0], origin.y + pos[1]] }).call();
    console.log(res)
  };

  const getTileType = useCallback((x, y) => {
    const key = `${x+origin.x},${y+origin.y}`;
    const tile = tiles && tiles[key];
    if(fetchQueue.has(key)) {
      return 3;
    } else if(tile === undefined) {
      return 1;
    } else if(tile) {
      return 4+(Math.abs(x^y)%32);
    } else {
      let noise = new WorleyNoise()
      let alt = noise.fbm(x, y) * 255;
      if(alt < 70){
      return 38;
      }
      if(alt < 100) {
        return 37;
      }
      return 36;
      // return 2;
    }
  }, [tiles, fetchQueue]);


  let convertedShipPosition = shipPosition === undefined ? undefined : [shipPosition[0] - origin.x, shipPosition[1] - origin.y];
  // console.log(convertedShipPosition);

  return (
  <>
    <TileMap
      getTileType={getTileType}
      onSelect={s => handleSelect(s)}
      onMove={p => handleMove(p)}
      shipPosition={convertedShipPosition}
     />
      <div style={{
        position: 'fixed',
        top: '60px',
        left: '20px',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={disconnect}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '1px solid #ff4444',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Disconnect
        </button>
        {shipPosition === undefined &&
        (<button
          onClick={spawn}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '1px solid #ff4444',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Spawn
        </button>) }
        <button
          onClick={() => setTiles({})}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '1px solid #ff4444',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Cache
        </button>
      </div>


  </>
  );
}

export default Map;


function splitmix32(a) {
 return function() {
   a |= 0;
   a = a + 0x9e3779b9 | 0;
   let t = a ^ a >>> 16;
   t = Math.imul(t, 0x21f0aaad);
   t = t ^ t >>> 15;
   t = Math.imul(t, 0x735a2d97);
   return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
  }
}


class WorleyNoise {
    constructor(seed = 12345) {
        this.seed = seed;
    }

    // Fast random number generator based on position and seed
    random2D(x, y) {
        let h = this.seed + x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        h = h ^ (h >> 16);
     
        // Generate two random numbers from one hash
        const h1 = h & 0xFFFF;
        const h2 = (h >> 16) & 0xFFFF;
      
        return {
            // Convert to -1 to 1 range
            x: (h1 / 0xFFFF) * 2 - 1,
            y: (h2 / 0xFFFF) * 2 - 1
        };
    }

    // Calculate distance between two points using squared distance
    // (avoiding square root when possible makes it faster)
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    // Generate single octave of Worley noise
    noise(x, y, scale) {
        const cellSize = scale;
        
        // Determine grid cell coordinates
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        
        let minDist = Infinity;
        
        // Check surrounding cells
        for (let xOffset = -1; xOffset <= 1; xOffset++) {
            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                const currentCellX = cellX + xOffset;
                const currentCellY = cellY + yOffset;
                
                // Generate feature point for current cell
                const random = this.random2D(currentCellX, currentCellY);
                const featureX = currentCellX * cellSize + (random.x + 1) * 0.5 * cellSize;
                const featureY = currentCellY * cellSize + (random.y + 1) * 0.5 * cellSize;
                
                // Calculate squared distance to feature point
                const dist = this.distance(x, y, featureX, featureY);
                minDist = Math.min(minDist, dist);
            }
        }
        
        // Take square root only at the end for final normalization
        return Math.sqrt(minDist) / cellSize;
    }

    // Generate FBM (Fractional Brownian Motion) version
    fbm(x, y, options = {}) {
        const {
            octaves = 4,
            scale = 50,
            persistence = 0.5,
            lacunarity = 2
        } = options;

        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        // Accumulate octaves
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency, scale / frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

       // Normalize the result
        return total / maxValue;
    }
}
