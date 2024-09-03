import React, { useEffect, useRef } from "react";
import OLCesium from "ol-cesium";
import olSourceOSM from "ol/source/OSM.js";
import olLayerTile from "ol/layer/Tile.js";
import olMap from "ol/Map.js";
import { transform } from "ol/proj.js";
import olView from "ol/View.js";
import * as Cesium from "cesium"; // Import Cesium

const OlCesiumViewer = () => {
  const map2dRef = useRef(null); // Ref for the 2D map container
  const map3dRef = useRef(null); // Ref for the 3D map container
  const ol3dRef = useRef(null); // Ref for the OL-Cesium instance

  useEffect(() => {
    if (!map2dRef.current || !map3dRef.current) return;

    // Setup the 2D map view
    const view = new olView({
      center: transform([25, 20], "EPSG:4326", "EPSG:3857"),
      zoom: 3,
      rotation: Math.PI / 6,
    });

    // Set Cesium Ion Token
    Cesium.Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNTZiMzVkNC05ZWE4LTRkZTUtOWEwOS00NTAwNWM5MTcyMTMiLCJpZCI6MjM1MDAyLCJpYXQiOjE3MjM3MzMwNjZ9.rrte4-7SEe_HIGj-zpuN-d6j9tB0nHHo0z2jpcCqJxw";

    // Initialize the 2D OpenLayers map
    const ol2d = new olMap({
      layers: [
        new olLayerTile({
          source: new olSourceOSM(),
        }),
      ],
      target: map2dRef.current,
      view,
    });

    // Log layers to debug
    console.log("OpenLayers Map Layers:", ol2d.getLayers().getArray());

    // Initialize OL-Cesium
    const ol3d = new OLCesium({
      map: ol2d,
      target: map3dRef.current,
    });

    const scene = ol3d.getCesiumScene();
    Cesium.createWorldTerrainAsync().then((tp) => {
      scene.terrainProvider = tp;
      console.log("Cesium terrain provider set.");
    });

    ol3d.setEnabled(true); // Enable the Cesium viewer

    // Store the OL-Cesium instance in the ref
    ol3dRef.current = ol3d;

    // Log Cesium scene layers to debug
    console.log("Cesium Scene Layers:", scene.imageryLayers);

    // Clean up the OL-Cesium instance when the component unmounts
    return () => {
      if (ol3dRef.current) {
        ol3dRef.current.setEnabled(false);
        ol3dRef.current.dispose();
      }
    };
  }, [map2dRef, map3dRef]);

  const toggle3D = () => {
    if (ol3dRef.current) {
      ol3dRef.current.setEnabled(!ol3dRef.current.getEnabled());
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
      <div ref={map2dRef} style={{ width: "50%", height: "100%" }}></div>
      <div ref={map3dRef} style={{ width: "50%", height: "100%" }}></div>
      <button
        id="enable"
        onClick={toggle3D}
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
        }}
      >
        Toggle 3D View
      </button>
    </div>
  );
};

export default OlCesiumViewer;
