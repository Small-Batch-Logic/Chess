import { useState } from 'react';
import { MapContainer, TileLayer, Polyline, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { useTransitGame } from './hooks/useTransitGame';
import { NetworkBoard, MapResizer } from './components/NetworkBoard';
import { Sidebar } from './components/Sidebar';
import { GameOverOverlay, RulesOverlay } from './components/Overlays';
import { ViewAutoFitter } from './components/MapUtils';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const {
    stops,
    geoJsonData,
    playerPieces,
    selectedPieceIndex,
    systemStop,
    systemHistory,
    terminalHub,
    turn,
    gameState,
    status,
    isLoading,
    error,
    isUsingLocalData,
    localStopRoutes,
    handleGtfsUpload,
    makeMove,
    selectPiece,
    reachableStops,
    threatenedStops,
    activePoints
  } = useTransitGame();

  const [showRules, setShowRules] = useState(true);

  const onGtfsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleGtfsUpload(file);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
      <Sidebar
        turn={turn}
        gameState={gameState}
        isLoading={isLoading}
        isUsingLocalData={isUsingLocalData}
        playerPieces={playerPieces}
        selectedPieceIndex={selectedPieceIndex}
        status={status}
        error={error}
        handleGtfsUpload={onGtfsUpload}
        selectPiece={selectPiece}
      />
      
      <div className="flex-1 relative">
        <MapContainer 
          center={[47.6588, -117.426]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', background: '#020617' }} 
          zoomControl={false}
        >
          <TileLayer 
            attribution='&copy; CARTO' 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          />
          {geoJsonData && (
            <GeoJSON data={geoJsonData} style={{ color: '#334155', weight: 1.5, opacity: 0.3 }} />
          )}
          {systemHistory.length > 1 && (
            <Polyline 
              positions={systemHistory.map(s => [s.stop_lat, s.stop_lon])} 
              pathOptions={{ color: '#dc2626', weight: 4, opacity: 0.4, dashArray: '5, 10' }} 
            />
          )}
          <NetworkBoard 
            stops={stops} 
            reachableStops={reachableStops} 
            threatenedStops={threatenedStops} 
            systemStop={systemStop} 
            terminalHub={terminalHub} 
            playerPieces={playerPieces} 
            makeMove={makeMove} 
            isUsingLocalData={isUsingLocalData} 
            localStopRoutes={localStopRoutes} 
          />
          <MapResizer />
          <ViewAutoFitter points={activePoints} />
        </MapContainer>

        <GameOverOverlay gameState={gameState} />
        <RulesOverlay showRules={showRules} onClose={() => setShowRules(false)} />
      </div>
    </div>
  );
}
