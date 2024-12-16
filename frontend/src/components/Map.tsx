import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { BlurFilter, TextStyle } from "pixi.js";
import { Button, Box, BoxCentered, Heading } from "@fuel-ui/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
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
  const width = 1000;
  const height = 1000;
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
          zoom: 50,
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
              height={height}
              width={width}
              fetchQueue={fetchQueue}
              onSelection={selection => {
                fetchTilesBatched(selection.filter(([x,y]) => tiles[`${x},${y}`] == undefined));
              }}
            /> }
          {mode == MapMode.Move&&
            <MoveContext
              tiles={tiles}
              origin={origin}
              height={height}
              width={width}
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

  return (<TileMap
            {...props}
            onPointerDown={(x,y,e) => setSelFrom([x,y])}
            onPointerMove={(x,y,e) => {
              if(selFrom) {
                setSelTo([x,y]);
              }
            }}
            onPointerUp={(x,y,e) => {
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
  const { mouse } = useThree();

  let [moveFrom, setMoveFrom] = useState(null);
  let [moveTo, setMoveTo] = useState(null);

  const new_origin = Object.assign({},props.origin);

  if(moveFrom && moveTo) {
    new_origin.x -= Math.floor((moveTo.x - moveFrom.x));
    new_origin.y -= Math.floor((moveTo.y - moveFrom.y));
    console.log(mouse);
  }

  return (<TileMap
            {...props}
            onPointerDown={(x,y,e) => setMoveFrom({x,y})}
            onPointerEnter={(x,y,e) => {
              if(moveFrom) {
                setMoveTo({x,y});
              }
            }}
            onPointerUp={(x,y,e) => {
              if(props.onMove) {
                props.onMove(new_origin);
              }
              setMoveFrom(null);
              setMoveTo(null);
            }}
            origin={new_origin}
          />);
}

function TileMap({
  tiles,
  origin,
  height,
  width,
  fetchQueue,
  selection,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerHover,
  onPointerEnter,
  onPointerLeave,
}) {
  const scaling = 0.1;
  const offset = (100 * scaling) / 2;

  const tileGeometry = useMemo(() => new THREE.PlaneGeometry(scaling, scaling));
  const fetchingMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#8f7f8f" }),
  );
  const selectedMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "yellow" }),
  );
  const unknownMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#7f7f7f" }),
  );

  const meshes = [];

  // draw tiles

  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const tile = tiles[`${origin.x + x},${origin.y + y}`];
      const position = [x * scaling - offset, y * scaling - offset, 0];
      let material;

      if (selection && selection.has(`${origin.x+x},${origin.x+y}`)) {
        material = selectedMaterial;
      } else if (tile !== undefined) {
        const terrainToColor = {
          Sea: `rgb(0,0,${tile.altitude})`,
          Coast: `rgb(${tile.altitude},${tile.altitude},0)`,
          Port: "black",
          Ground: `rgb(0,${tile.altitude},0)`,
        };
        material = new THREE.MeshBasicMaterial({
          color: terrainToColor[tile.terrain],
        });
      } else if (fetchQueue.has(`${origin.x+x},${origin.x+y}`)) {
        // TODO: move this into its own component
        material = fetchingMaterial;
      } else {
        material = unknownMaterial;
      }
      meshes.push(
        <mesh
          position={position}
          geometry={tileGeometry}
          material={material}
          onPointerDown={(e) => onPointerDown && onPointerDown(origin.x+x, origin.y+y, e)}
          onPointerUp={(e) => onPointerUp && onPointerUp(origin.x+x, origin.y+y, e)}
          onPointerMove={(e) => onPointerMove && onPointerMove(origin.x+x, origin.y+y, e)}
          onPointerHover={(e) => onPointerHover && onPointerHover(origin.x+x, origin.y+y, e)}
          onPointerEnter={(e) => onPointerEnter && onPointerEnter(origin.x+x, origin.y+y, e)}
          onPointerLeave={(e) => onPointerLeave && onPointerLeave(origin.x+x, origin.y+y, e)}
        />,
      );
    }
  }
  return (
    <group>
      {meshes.map((t, i) => (
        <group key={i}> {t} </group>
      ))}
    </group>
  );
}

export default Map;
