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

export enum MapMode {
  Move,
  Selection,
}

function Map({ contract, mode }) {
  const [origin, setOrigin] = useState({
    x: Math.floor(Math.pow(2, 32) / 2),
    y: Math.floor(Math.pow(2, 32) / 2),
  });
  const [tiles, setTiles] = useState({});
  const [fetchQueue, setFetchQueue] = useState(new Set());
  const [mapMode, setMapMode] = useState(MapMode.Move);
  const [movingMap, setMovingMap] = useState(null);

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
      batch = (await contract.functions.get_tile_batch(coords).get()).value;
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

  // FIXME: just run it once
  useEffect(() => {
    (async () => {
      const x0 = origin.x;
      const x1 = origin.x + 50;
      const y0 = origin.y;
      const y1 = origin.y + 50;
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);

      const coords = [];
      for (let x = left; x <= right; ++x) {
        for (let y = top; y <= bottom; ++y) {
          if (tiles[`${x},${y}`] == undefined) {
            coords.push([x, y]);
          }
        }
      }
      fetchTilesBatched(coords);
    })();
  }, []);


  return (
    <div style={{ height: "90vh" }}>
      <Canvas
        orthographic
        camera={{
          zoom: 90,
        }}
        // isometric
        // camera={{
        //   position: [0.2, -10, 8],
        //   rotation: [1, 0, -0],
        //   zoom: 90,
        //   fov: 75,
        // }}
      >
        <color attach="background" args={["#2f6dc1"]} />

        <ambientLight intensity={1} />
        {
        // isometric
        // <group rotation={[0, 0, Math.PI / 4]}>
        }
          {mode == MapMode.Selection &&
            <SelectionContext
              tiles={tiles}
              origin={origin}
              fetchQueue={fetchQueue}
              onSelection={selection => {
                fetchTilesBatched(selection.filter(([x,y]) => tiles[`${x},${y}`] == undefined));
              }}
            /> }
          {mode == MapMode.Move&&
            <MoveContext
              tiles={tiles}
              origin={origin}
              fetchQueue={fetchQueue}
              onMove={new_origin => {
                setOrigin(new_origin);
              }}
            /> }
        {
        // </group>
        }
      </Canvas>
    </div>
  );
}

function SelectionContext(props) {

  let [selFrom, setSelFrom] = useState(null);
  let [selTo, setSelTo] = useState(null);

  const selectionCoords = () => {
    if(!selTo || !selFrom) {
      return [];
    }
    const ans = [];
    let top = Math.min(selTo[1], selFrom[1]);
    let bottom = Math.max(selTo[1], selFrom[1]);
    let left = Math.min(selTo[0], selFrom[0]);
    let right = Math.max(selTo[0], selFrom[0]);

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        ans.push([x,y]);
      }
    }
    return ans;
  };

  let selection = new Set();
  if(selFrom && selTo) {
    selectionCoords().map(([x,y]) => selection.add(`${x},${y}`));
  }

  console.log(selFrom, selTo);

  return (<TileMap
            {...props}
            onPointerDown={(e, x, y) => setSelFrom([x,y])}
            onHover={({x, y}) => {
              if(selFrom) {
                setSelTo([x,y]);
              }
            }}
            onPointerUp={(e, x, y) => {
              if(props.onSelection) {
                props.onSelection(selectionCoords());
              }
              setSelFrom(null);
              setSelTo(null);
            }}
            selection={selection}
          />);
}

function MoveContext(props) {
  const { mouse, camera } = useThree();
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  useFrame(state => {
    if (isDragging.current) {
      const deltaX = mouse.x - lastPosition.current.x;
      const deltaY = mouse.y - lastPosition.current.y;

      camera.position.x -= deltaX * 2;
      camera.position.y -= deltaY * 2;

      lastPosition.current = Object.assign({}, mouse);
    }
  });

  return (
    <TileMap
      {...props}
      onPointerDown={(e) => {
        lastPosition.current = mouse;
        isDragging.current = true;
      }}
      onPointerUp={(e) => {
        isDragging.current = false;
      }}
    />
  );
}
function TileMap({
  tiles,
  origin,
  fetchQueue,
  selection,
  onPointerDown,
  onPointerUp,
  onHover,
}) {

  const instancesRef = useRef();
  const { raycaster, camera, pointer } = useThree();

  
  const scaling = 0.1;
  const offset = (100 * scaling) / 2;
  const [hovered, setHovered] = useState(null);

  const tileGeometry = useMemo(() => new THREE.PlaneGeometry(scaling, scaling));
  const tileMaterial = useMemo(() => new THREE.MeshBasicMaterial());

  const colors = [];
  const positions = []


  // Handle pointer movement and raycasting
  useFrame(() => {
    if (!instancesRef.current) return;

    // Update raycaster position based on pointer
    raycaster.setFromCamera(pointer, camera);

    // Get all intersections
    const intersects = raycaster.intersectObject(instancesRef.current);
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      
      if (hovered !== instanceId) {
        setHovered(instanceId);
        
        if (onHover) {
          // Calculate x, y coordinates from instance ID
          const width = 100;
          const x = instanceId % width;
          const y = Math.floor(instanceId / width);
          onHover({ x, y, instanceId });
        }
      }
    } else if (hovered !== null) {
      setHovered(null);
      if (onHover) onHover(null);
    }
  });  

  for (let y = 0; y < 100; y++) {
    for (let x = -0; x < 100; x++) {
      const tile = tiles[`${x+origin.x},${y+origin.y}`];
      const position = [x * scaling - offset, y * scaling - offset, 0];
      let color;

      if (selection && selection.has(`${origin.x+x},${origin.x+y}`)) {
        color = "yellow";
      } else if (tile !== undefined) {
        const terrainToColor = {
          Sea: `rgb(0,0,${tile.altitude})`,
          Coast: `rgb(${tile.altitude},${tile.altitude},0)`,
          Port: "black",
          Ground: `rgb(0,${tile.altitude},0)`,
        };

        color = terrainToColor[tile.terrain];
      } else if (fetchQueue.has(`${origin.x+x},${origin.x+y}`)) {
        // TODO: move this into its own component
        color = "#8f7f8f";
      } else {
        color = "#7f7f7f";
      }
      colors.push(color);
      positions.push(position);
   }
  }
  return (
    <group
      onPointerUp={e => onPointerUp(e, hovered.x, hovered.y)}
      onPointerDown={e => onPointerDown(e, hovered.x, hovered.y)}
      >
      <Instances limit={200*200} geometry={tileGeometry} material={tileMaterial} ref={instancesRef}>
        {positions.map((p, i) => (
          <Instance
            key={i}
            position={p}
            color={colors[i]}
          />
        ))}
      </Instances>
    </group>
  );
}

export default Map;
