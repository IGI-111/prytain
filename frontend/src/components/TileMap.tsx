import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Text } from '@react-three/drei';
import * as THREE from 'three';

const BASE_CHUNK_SIZE = 16;
const MIN_CHUNK_SIZE = 8;
const MAX_CHUNK_SIZE = 64;
const RENDER_DISTANCE = 2;
const MIN_ZOOM = 15;
const MAX_ZOOM = 200;

// Function to calculate adaptive chunk size based on zoom level
const getAdaptiveChunkSize = (zoom) => {
  const zoomFactor = (MAX_ZOOM - zoom) / (MAX_ZOOM - MIN_ZOOM);
  const chunkSize = Math.floor(BASE_CHUNK_SIZE + (zoomFactor * (MAX_CHUNK_SIZE - MIN_CHUNK_SIZE)));
  return Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, chunkSize));
};

const SelectionRect = ({ start, current }) => {
  if (!start || !current) return null;
  
  // Calculate width and height from the start point to current point
  const width = current[0] - start[0];
  const height = current[1] - start[1];
  
  // Position the rectangle at the midpoint between start and current
  const posX = start[0] + width/2;
  const posY = start[1] + height/2;

  return (
    <mesh position={[posX, posY, 1]}>
      <planeGeometry args={[Math.abs(width), Math.abs(height)]} />
      <meshBasicMaterial color="#4444ff" transparent opacity={0.2} />
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(Math.abs(width), Math.abs(height))]} />
        <lineBasicMaterial color="#4444ff" />
      </lineSegments>
    </mesh>
  );
};

const CoordinateTooltip = ({ position, selectionStart, isSelecting }) => {
  if (!position) return null;

  const rawX = position[0];
  const rawY = position[1];
  const gridX = Math.floor(position[0]);
  const gridY = Math.floor(position[1]);

  let debugText = `Raw: (${rawX.toFixed(2)}, ${rawY.toFixed(2)})\nGrid: (${gridX}, ${gridY})`;
  
  if (isSelecting && selectionStart) {
    const startGridX = Math.floor(selectionStart[0]);
    const startGridY = Math.floor(selectionStart[1]);
    const width = Math.abs(gridX - startGridX) + 1;
    const height = Math.abs(gridY - startGridY) + 1;
    debugText += `\nSelection: ${width}x${height}`;
  }

  return (
    <Text
      position={[gridX + 0.5, gridY + 1.5, 1]}
      fontSize={0.5}
      color="red"
      backgroundColor="#000000"
      padding={0.2}
      anchorX="center"
      anchorY="bottom"
      maxWidth={5}
    >
      {debugText}
    </Text>
  );
};

const TileChunk = ({ chunkX, chunkY, colors, selectedTiles, chunkSize }) => {
  const meshRef = useRef();
  const numTiles = chunkSize * chunkSize;
  const baseColors = useRef(new Array(numTiles));
  
  const chunkOffset = useMemo(() => {
    return [chunkX * chunkSize, chunkY * chunkSize];
  }, [chunkX, chunkY, chunkSize]);

  useEffect(() => {
    if (!meshRef.current) return;
    const tempObject = new THREE.Object3D();
    const color = new THREE.Color();
    
    let i = 0;
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = x + chunkOffset[0];
        const worldY = y + chunkOffset[1];
        
        tempObject.position.set(worldX + 0.5, worldY + 0.5, 0);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
        
        // Get color based on world coordinates
        const colorIndex = Math.abs(Math.floor(colors(worldX, worldY) * 255)) % 256;
        const colorValue = typeof colors === 'function' ? colors(worldX, worldY) : colors[colorIndex];
        baseColors.current[i] = colorValue;
        
        color.set(selectedTiles.has(`${worldX},${worldY}`) ? '#0000ff' : colorValue);
        meshRef.current.setColorAt(i, color);
        i++;
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [chunkX, chunkY, colors, chunkSize, selectedTiles, chunkOffset]);
    
  useEffect(() => {
    if (!meshRef.current) return;
    const color = new THREE.Color();
    
    let i = 0;
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = x + chunkOffset[0];
        const worldY = y + chunkOffset[1];
        color.set(selectedTiles.has(`${worldX},${worldY}`) ? '#0000ff' : baseColors.current[i]);
        meshRef.current.setColorAt(i, color);
        i++;
      }
    }
    
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [selectedTiles, chunkOffset, chunkSize]);

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[null, null, numTiles]}
    >
      <planeGeometry args={[1, 1]} />
      <meshPhongMaterial />
    </instancedMesh>
  );
};

const ChunkManager = ({ colors, selectedTiles }) => {
  const { camera } = useThree();
  const [visibleChunks, setVisibleChunks] = useState(new Set());
  const [currentChunkSize, setCurrentChunkSize] = useState(BASE_CHUNK_SIZE);

  useFrame(() => {
    const newChunkSize = getAdaptiveChunkSize(camera.zoom);
    
    if (newChunkSize !== currentChunkSize) {
      setCurrentChunkSize(newChunkSize);
    }
    
    const centerChunkX = Math.floor(camera.position.x / newChunkSize);
    const centerChunkY = Math.floor(camera.position.y / newChunkSize);
    
    const newVisibleChunks = new Set();
    
    const adaptiveRenderDistance = Math.max(1, Math.floor(RENDER_DISTANCE * (BASE_CHUNK_SIZE / newChunkSize)));
    
    for (let dx = -adaptiveRenderDistance; dx <= adaptiveRenderDistance; dx++) {
      for (let dy = -adaptiveRenderDistance; dy <= adaptiveRenderDistance; dy++) {
        const chunkX = centerChunkX + dx;
        const chunkY = centerChunkY + dy;
        newVisibleChunks.add(`${chunkX},${chunkY},${newChunkSize}`);
      }
    }
    
    if (![...newVisibleChunks].every(chunk => visibleChunks.has(chunk))) {
      setVisibleChunks(newVisibleChunks);
    }
  });

  return (
    <>
      {[...visibleChunks].map(chunk => {
        const [chunkX, chunkY, chunkSize] = chunk.split(',').map(Number);
        return (
          <TileChunk
            key={chunk}
            chunkX={chunkX}
            chunkY={chunkY}
            chunkSize={chunkSize}
            colors={colors}
            selectedTiles={selectedTiles}
          />
        );
      })}
    </>
  );
};

const Controls = ({ mode, setMode, onSelect }) => {
  const { camera, gl, invalidate } = useThree();
  const isDragging = useRef(false);
  const previousPosition = useRef([0, 0]);
  const selectionStart = useRef(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);

  
  const screenToWorld = (screenX, screenY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const vector = new THREE.Vector3(x, y, 0);
    vector.unproject(camera);
    return [vector.x, vector.y];
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    const worldPosBefore = screenToWorld(e.clientX, e.clientY);
    
    const zoomFactor = 1 - e.deltaY * 0.001;
    const newZoom = THREE.MathUtils.clamp(
      camera.zoom * zoomFactor,
      MIN_ZOOM,
      MAX_ZOOM
    );
    
    if (newZoom !== camera.zoom) {
      camera.zoom = newZoom;
      camera.updateProjectionMatrix();
      
      const worldPosAfter = screenToWorld(e.clientX, e.clientY);
      
      camera.position.x += (worldPosBefore[0] - worldPosAfter[0]);
      camera.position.y += (worldPosBefore[1] - worldPosAfter[1]);
      
      invalidate();
    }
  };

  useEffect(() => {
    const domElement = gl.domElement;
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => domElement.removeEventListener('wheel', handleWheel);
  }, [gl, camera]);

 const getTilesInSelection = (start, end) => {
    // Get grid-aligned coordinates for selection
    const startX = Math.floor(Math.min(start[0], end[0]));
    const endX = Math.floor(Math.max(start[0], end[0]));
    const startY = Math.floor(Math.min(start[1], end[1]));
    const endY = Math.floor(Math.max(start[1], end[1]));
    
    const selectedIndices = new Set();
    
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        selectedIndices.add(`${x},${y}`);
      }
    }
    
    return selectedIndices;
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    if (mode === 'pan') {
      isDragging.current = true;
      previousPosition.current = [e.clientX, e.clientY];
      gl.domElement.style.cursor = 'grabbing';
    } else if (mode === 'select') {
      // Store the exact world position for the selection start
      selectionStart.current = worldPos;
      setCurrentPos(worldPos);
      gl.domElement.style.cursor = 'crosshair';
    }
  };  
  const handlePointerUp = (e) => {
    if (mode === 'select' && selectionStart.current && currentPos) {
      const selectedIndices = getTilesInSelection(selectionStart.current, currentPos);
      onSelect(selectedIndices);
    }
    
    isDragging.current = false;
    selectionStart.current = null;
    setCurrentPos(null);
    gl.domElement.style.cursor = mode === 'pan' ? 'grab' : 'crosshair';
  };
  
  const handlePointerMove = (e) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setHoverPosition(worldPos);
    
    if (mode === 'pan' && isDragging.current) {
      const deltaX = (e.clientX - previousPosition.current[0]) / camera.zoom;
      const deltaY = (e.clientY - previousPosition.current[1]) / camera.zoom;
      
      camera.position.x -= deltaX;
      camera.position.y += deltaY;
      
      previousPosition.current = [e.clientX, e.clientY];
    } else if (mode === 'select' && selectionStart.current) {
      // Update current position for selection rectangle
      setCurrentPos(worldPos);
    }
  };
return (
    <>
      <mesh
        position={[0, 0, -1]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverPosition(null)}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <SelectionRect start={selectionStart.current} current={currentPos} />
      <CoordinateTooltip 
        position={hoverPosition}
        selectionStart={selectionStart.current}
        isSelecting={mode === 'select' && selectionStart.current !== null}
      />
    </>
  );};

const TileMap = ({ colors, getColor }) => {
  const [mode, setMode] = useState('pan');
  const [selectedTiles, setSelectedTiles] = useState(new Set());

  // If colors is an array, use it directly. If it's a function (noise), wrap it
  const colorFunction = useMemo(() => {
    if (typeof colors === 'function') {
      return colors;
    } else {
      // If it's an array, cycle through it based on coordinates
      return (x, y) => colors[Math.abs((x + y) % colors.length)];
    }
  }, [colors]);

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}>
        <Canvas>
          <OrthographicCamera
            makeDefault
            position={[0, 0, 5]}
            zoom={50}
            near={0.1}
            far={1000}
          />
          <ambientLight intensity={1} />
          
          <ChunkManager 
            colors={colorFunction}
            selectedTiles={selectedTiles}
          />
          <Controls 
            mode={mode} 
            setMode={setMode}
            onSelect={setSelectedTiles}
          />
        </Canvas>
      </div>
      
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setMode('pan')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'pan' ? '#4444ff' : '#ffffff',
            color: mode === 'pan' ? '#ffffff' : '#000000',
            border: '1px solid #4444ff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Pan Mode
        </button>
        <button
          onClick={() => setMode('select')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'select' ? '#4444ff' : '#ffffff',
            color: mode === 'select' ? '#ffffff' : '#000000',
            border: '1px solid #4444ff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Select Mode
        </button>
      </div>
    </>
  );
};

export default TileMap;
