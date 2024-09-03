import React, { useState, useEffect, useRef } from "react";
import { Buffer } from "buffer";
import {
  Select,
  Upload,
  Button,
  Card,
  message,
  Space,
  Spin,
  Switch,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import shp from "shpjs";
import { Graticule, Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, transformExtent, get as getProjection } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import Layer from "ol/layer/WebGLTile.js";
import Source from "ol/source/ImageTile.js";

import { ImageStatic, XYZ } from "ol/source";
import ImageLayer from "ol/layer/Image";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import LayerSwitcher from "ol-layerswitcher";
import LayerGroup from "ol/layer/Group";
import MousePosition from "ol/control/MousePosition.js";
import Stroke from "ol/style/Stroke";
import { createStringXY } from "ol/coordinate.js";
import { defaults as defaultControls } from "ol/control.js";

import JSZip from "jszip";
import * as tf from "@tensorflow/tfjs";
import * as gt from "geotiff";
import PotreeViewer from "./PotreeViewer";
import * as Cesium from "cesium";
import OLCesium from "ol-cesium";

import "ol/ol.css";
import "ol-layerswitcher/dist/ol-layerswitcher.css";
import "./Map.css";

let olMap;
const MapComponent = () => {
  // Register custom projection (EPSG:32618) with proj4
  proj4.defs("EPSG:32618", "+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs");
  proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
  proj4.defs(
    "EPSG:3857",
    "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
  );

  register(proj4);

  const mapContainerRef = useRef(null);
  const ol3dContainerRef = useRef(null);

  const map3dRef = useRef(null);
  const mapRef = useRef(null);

  const vectorLayerRef = useRef(null);
  const [attributes, setAttributes] = useState([]);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [geojsonS3Url, setGeojsonS3Url] = useState(null);
  const [landsatImageUrl, setLandsatImageUrl] = useState(null);
  const [isloading, setIsloading] = useState(false);
  const [isPotree, setIsPotree] = useState(false);
  const [dEnabled, setdEnabled] = useState(true);

  // AWS S3 configuration using VITE_ environment variables
  const s3 = new S3Client({
    region: import.meta.env.VITE_AWS_REGION, // Your region
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID, // Store this in .env
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY, // Store this in .env
    },
  });

  const lambdaClient = new LambdaClient({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  });

  // Initialize the map only once
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      const vectorLayer = new VectorLayer({
        title: "Vector Layer",
        source: new VectorSource(),
      });
      vectorLayerRef.current = vectorLayer; // Store in ref to avoid re-render

      // Create a base map layer
      const baseLayer = new TileLayer({
        title: "OSM",
        type: "base",
        source: new OSM(),
        visible: true, // Set the base layer to be visible
      });

      // Event listeners for tile load events
      // baseLayer.getSource().on("tileloadstart", () => {
      //   console.log("Tile loading started");
      //   message.loading({
      //     content: "Loading tiles...",
      //     key: "tileLoading",
      //     duration: 0,
      //   });
      // });

      // baseLayer.getSource().on("tileloadend", () => {
      //   console.log("Tile loading ended");
      //   message.success({
      //     content: "Tiles loaded",
      //     key: "tileLoading",
      //     duration: 2,
      //   });
      // });

      // baseLayer.getSource().on("tileloaderror", () => {
      //   console.error("Tile loading error");
      //   message.error({
      //     content: "Error loading tiles",
      //     key: "tileLoading",
      //     duration: 2,
      //   });
      // });
      vectorLayerRef.current = vectorLayer; // Store in ref to avoid re-render

      const mousePositionControl = new MousePosition({
        coordinateFormat: createStringXY(4),
        projection: "EPSG:4326",
        // comment the following two lines to have the mouse position
        // be placed within the map.
        className: "custom-mouse-position",
        // target: document.getElementById("mouse-position"),
      });

      olMap = new Map({
        controls: defaultControls().extend([mousePositionControl]),
        target: mapContainerRef.current, // Attach map to the div
        layers: [
          new LayerGroup({
            title: "Base Layers",
            layers: [
              baseLayer,
              new Layer({
                title: "ESRI XYZ",
                type: "base",
                visible: false,
                source: new Source({
                  attributions:
                    'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
                    'rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
                  url:
                    "https://server.arcgisonline.com/ArcGIS/rest/services/" +
                    "World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
                }),
              }),
            ],
          }),
          new LayerGroup({
            title: "Overlays",
            layers: [vectorLayer], // Add the vector layer to the overlays group
          }),
        ],
        view: new View({
          center: fromLonLat([0, 0]),
          zoom: 2,
        }),
      });

      olMap.on("loadstart", function () {
        setIsloading(true);
      });
      olMap.on("loadend", function () {
        setIsloading(false);
      });

      // Add Graticule
      const graticule = new Graticule({
        strokeStyle: new Stroke({
          color: "rgba(255,120,0,0.9)",
          width: 2,
          lineDash: [0.5, 4],
        }),
        showLabels: true,
        wrapX: false,
      });

      graticule.setMap(olMap); // Attach the graticule to the map
      const ol3d = new OLCesium({
        map: olMap,
        target: ol3dContainerRef.current,
      });

      // Store the OL-Cesium instance in the ref
      map3dRef.current = ol3d;

      mapRef.current = olMap; // Store map instance in ref

      olMap.on("pointermove", function (evt) {
        var hit = this.forEachFeatureAtPixel(
          evt.pixel,
          function (feature, layer) {
            return true;
          }
        );
        if (hit) {
          this.getTargetElement().style.cursor = "pointer";
        } else {
          this.getTargetElement().style.cursor = "";
        }
      });

      const layerSwitcher = new LayerSwitcher({
        activationMode: "click",
        startActive: true,
        tipLabel: "Layers", // Optional label for button
        groupSelectStyle: "group", // Display groups as a single item
      });
      olMap.addControl(layerSwitcher);
    }

    !isPotree ? map3dRef.current.setEnabled(dEnabled) : null;
  }, [isPotree, dEnabled]);

  // Upload the file to S3 bucket
  const uploadFileToS3 = async (file) => {
    try {
      const uploadParams = {
        Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
        Key: `shapefiles/${file.name}`,
        Body: file,
      };

      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);

      message.success("File uploaded to S3 successfully!");
      // After uploading, fetch the file back for visualization
      fetchShapefileFromS3(file.name);
    } catch (err) {
      message.error(`Error uploading file: ${err.message}`);
    }
  };

  // Fetch the uploaded file from S3 and visualize it
  const fetchShapefileFromS3 = async (filename) => {
    try {
      const getObjectParams = {
        Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
        Key: `shapefiles/${filename}`,
      };

      // Generate a presigned URL for the shapefile
      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand(getObjectParams),
        { expiresIn: 3600 } // URL will be valid for 1 hour
      );

      // Fetch the file from the presigned URL
      const response = await fetch(presignedUrl);
      const fileContent = await response.arrayBuffer();

      // Convert the shapefile content (assuming GeoJSON)
      const geojson = await shp(fileContent);
      const features = new GeoJSON().readFeatures(geojson, {
        featureProjection: "EPSG:3857", // Project to the map's projection
      });

      vectorLayerRef.current.getSource().addFeatures(features); // Add GeoJSON features to the map
      mapRef.current
        .getView()
        .fit(vectorLayerRef.current.getSource().getExtent(), {
          padding: [50, 50, 50, 50],
          duration: 5000,
        });

      setIsloading(false);
      message.success("Shapefile visualized from S3!");

      // Extract unique state names (or other attribute)
      const uniqueAttributes = [
        ...new Set(geojson.features.map((feature) => feature.properties.name)), // Replace 'NAME' with your attribute name
      ];
      setAttributes(uniqueAttributes); // Populate the dropdown with unique values
      setGeojsonData(geojson); // Store extracted GeoJSON for direct filtering
    } catch (err) {
      message.error(`Error fetching shapefile from S3: ${err.message}`);
      console.error("S3 Fetch Error", err);
    }
  };

  const handlePTfileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Response from server:", result);
    } catch (error) {
      console.error("Error downloading Landsat imagery:", error);
    }
  };

  // Handle file upload
  const handleShapefileUpload = async (file) => {
    setIsloading(true);
    uploadFileToS3(file); // Upload the file to S3 and visualize from there
    return false;
  };

  // Handle the filtering request
  const handleFilterChange = async (value) => {
    setIsloading(true);
    setSelectedAttribute(value); // Set the selected attribute

    // You can either pass the GeoJSON directly or the S3 URL to the Lambda function
    const filteredGeoJSON = await filterWithLambda(
      value,
      geojsonData,
      geojsonS3Url
    );

    // Visualize the filtered GeoJSON
    const features = new GeoJSON().readFeatures(
      JSON.parse(filteredGeoJSON.body),
      {
        featureProjection: "EPSG:3857", // Project to the map's projection
      }
    );

    vectorLayerRef.current.getSource().clear(); // Clear existing features
    vectorLayerRef.current.getSource().addFeatures(features); // Add filtered features to the map
    mapRef.current
      .getView()
      .fit(vectorLayerRef.current.getSource().getExtent(), {
        padding: [50, 50, 50, 50],
        duration: 5000,
      });

    setIsloading(false);
    downloadLandsatImagery(JSON.parse(filteredGeoJSON.body));
  };

  const downloadLandsatImagery = async (filteredGeoJSON) => {
    try {
      // const response = await fetch("../python/api/download_imagery", {
      const response = await fetch(
        "http://localhost:5000/api/download_imagery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ geojson: filteredGeoJSON }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No URL returned in the response.");
      }

      setLandsatImageUrl(data.url); // Save the image URL
      computeNDVI(data.geotiff_url); // Compute NDVI from the image
      computeNDWI(data.geotiff_url); // Compute NDWI from the image

      // Add the image layer
      const imageLayer = new Layer({
        source: new Source({
          url:
            "https://earthengine.googleapis.com/v1alpha/" +
            data.url +
            "/tiles/{z}/{x}/{y}",
        }),
        title: "Landsat Imagery",
      });

      mapRef.current.addLayer(imageLayer);
    } catch (error) {
      console.error("Error downloading Landsat imagery:", error);
    }
  };

  // Example function to add an NDVI layer to the "Overlays" LayerGroup
  const computeNDVI = async (geoTiffZipUrl) => {
    try {
      message.loading({ content: "Fetching the zip file...", key: "zipFetch" });
      const response = await fetch(geoTiffZipUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      message.success({
        content: "Zip file fetched successfully",
        key: "zipFetch",
        duration: 2,
      });

      const zip = await JSZip.loadAsync(arrayBuffer);
      message.success({
        content: "Zip file loaded successfully",
        key: "zipLoad",
        duration: 2,
      });

      const redBandFile = zip.file(/.*B4.*\.tif$/i)[0]; // Assuming band 4 is Red
      const nirBandFile = zip.file(/.*B5.*\.tif$/i)[0]; // Assuming band 5 is NIR

      if (!redBandFile || !nirBandFile) {
        throw new Error("Required bands not found in the zip file.");
      }

      message.info("Red and NIR band files found");

      const redBandBuffer = await redBandFile.async("arraybuffer");
      const nirBandBuffer = await nirBandFile.async("arraybuffer");

      const redTiff = await gt.fromArrayBuffer(redBandBuffer);
      const nirTiff = await gt.fromArrayBuffer(nirBandBuffer);

      const redImage = await redTiff.getImage();
      const nirImage = await nirTiff.getImage();

      const redBand = await redImage.readRasters();
      const nirBand = await nirImage.readRasters();

      const redBandData = Array.isArray(redBand[0]) ? redBand[0] : redBand;
      const nirBandData = Array.isArray(nirBand[0]) ? nirBand[0] : nirBand;

      // Debugging: Check if redBandData and nirBandData contain the expected number of values
      console.log("Red Band Data Length:", redBandData[0].length);
      console.log("NIR Band Data Length:", nirBandData[0].length);

      const width = redImage.getWidth();
      const height = redImage.getHeight();
      const expectedSize = width * height;

      if (
        redBandData[0].length !== expectedSize ||
        nirBandData[0].length !== expectedSize
      ) {
        throw new Error(
          `The data does not match the expected shape: ${width} x ${height}`
        );
      } // Check if the data is a Uint16Array
      if (
        !(redBand[0] instanceof Uint16Array) ||
        !(nirBand[0] instanceof Uint16Array)
      ) {
        throw new Error(
          "redBand and nirBand should be instances of Uint16Array"
        );
      }

      // Ensure both arrays have the correct length
      if (
        redBand[0].length !== width * height ||
        nirBand[0].length !== width * height
      ) {
        throw new Error(
          "The length of redBand or nirBand does not match the expected image size."
        );
      }
      let redArray = [],
        nirArray = [];
      redBand[0].map((value, index) => {
        redArray.push(value);
      });
      nirBand[0].map((value, index) => {
        nirArray.push(value);
      });
      message.loading({ content: "Computing NDVI...", key: "ndviCompute" });

      // Create tensors from Uint16Array
      const redTensor = tf.tensor2d(redArray, [height, width]);
      const nirTensor = tf.tensor2d(nirArray, [height, width]);

      // Compute NDVI
      const ndviTensor = nirTensor.sub(redTensor).div(nirTensor.add(redTensor));
      const ndviArray = await ndviTensor.data();

      message.success({
        content: "NDVI calculation complete",
        key: "ndviCompute",
        duration: 2,
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);

      for (let i = 0; i < ndviArray.length; i++) {
        const ndviValue = ndviArray[i];
        const color = ndviToColor(ndviValue);

        imageData.data[i * 4] = color[0];
        imageData.data[i * 4 + 1] = color[1];
        imageData.data[i * 4 + 2] = color[2];
        imageData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL();

      const imageExtent32618 = redImage.getBoundingBox(); // UTM coordinates
      console.log(redImage);
      console.log(redImage.geoKeys.ProjectedCSTypeGeoKey);

      const imageExtent = transformExtent(
        imageExtent32618,
        "EPSG:32618",
        "EPSG:3857"
      );

      // console.log("Transformed extent to EPSG:3857", imageExtent);

      const ndviLayer = new ImageLayer({
        title: "NDVI Layer",
        source: new ImageStatic({
          url: dataUrl,
          imageExtent: imageExtent,
          // projection: getProjection("EPSG:3857"),
        }),
        visible: true,
      });

      mapRef.current.getLayers().push(ndviLayer);

      mapRef.current
        .getView()
        .fit(imageExtent, { size: mapRef.current.getSize(), duration: 5000 });
      message.success("NDVI layer added to map");

      // Manually refresh the layer switcher
      const layerSwitcherControl = mapRef.current
        .getControls()
        .getArray()
        .find((control) => control instanceof LayerSwitcher);

      if (layerSwitcherControl) {
        layerSwitcherControl.renderPanel(); // Refresh the layer switcher
      }
    } catch (error) {
      console.error("Error computing NDVI:", error);
    }
  };

  const ndviToColor = (ndviValue) => {
    if (ndviValue > 0.3) return [0, 128, 0]; // Green for vegetation
    else if (ndviValue > 0) return [255, 255, 0]; // Yellow for less vegetation
    else return [139, 69, 19]; // Brown for bare ground
  };

  const computeNDWI = async (geoTiffZipUrl) => {
    try {
      message.loading({ content: "Fetching the zip file...", key: "zipFetch" });
      const response = await fetch(geoTiffZipUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      message.success({
        content: "Zip file fetched successfully",
        key: "zipFetch",
        duration: 2,
      });

      const zip = await JSZip.loadAsync(arrayBuffer);
      message.success({
        content: "Zip file loaded successfully",
        key: "zipLoad",
        duration: 2,
      });

      const greenBandFile = zip.file(/.*B3.*\.tif$/i)[0]; // Assuming band 3 is Green
      const nirBandFile = zip.file(/.*B5.*\.tif$/i)[0]; // Assuming band 5 is NIR

      if (!greenBandFile || !nirBandFile) {
        throw new Error("Required bands not found in the zip file.");
      }

      message.info("Green and NIR band files found");

      const greenBandBuffer = await greenBandFile.async("arraybuffer");
      const nirBandBuffer = await nirBandFile.async("arraybuffer");

      const greenTiff = await gt.fromArrayBuffer(greenBandBuffer);
      const nirTiff = await gt.fromArrayBuffer(nirBandBuffer);

      const greenImage = await greenTiff.getImage();
      const nirImage = await nirTiff.getImage();

      const greenBand = await greenImage.readRasters();
      const nirBand = await nirImage.readRasters();

      const greenBandData = Array.isArray(greenBand[0])
        ? greenBand[0]
        : greenBand;
      const nirBandData = Array.isArray(nirBand[0]) ? nirBand[0] : nirBand;

      console.log("Green Band Data Length:", greenBandData[0].length);
      console.log("NIR Band Data Length:", nirBandData[0].length);

      const width = greenImage.getWidth();
      const height = greenImage.getHeight();
      const expectedSize = width * height;

      if (
        greenBandData[0].length !== expectedSize ||
        nirBandData[0].length !== expectedSize
      ) {
        throw new Error(
          `The data does not match the expected shape: ${width} x ${height}`
        );
      }

      if (
        !(greenBand[0] instanceof Uint16Array) ||
        !(nirBand[0] instanceof Uint16Array)
      ) {
        throw new Error(
          "greenBand and nirBand should be instances of Uint16Array"
        );
      }

      if (
        greenBand[0].length !== width * height ||
        nirBand[0].length !== width * height
      ) {
        throw new Error(
          "The length of greenBand or nirBand does not match the expected image size."
        );
      }

      let greenArray = [],
        nirArray = [];
      greenBand[0].map((value, index) => {
        greenArray.push(value);
      });
      nirBand[0].map((value, index) => {
        nirArray.push(value);
      });
      message.loading({ content: "Computing NDWI...", key: "ndwiCompute" });

      // Create tensors from Uint16Array
      const greenTensor = tf.tensor2d(greenArray, [height, width]);
      const nirTensor = tf.tensor2d(nirArray, [height, width]);

      // Compute NDWI
      const ndwiTensor = greenTensor
        .sub(nirTensor)
        .div(greenTensor.add(nirTensor));
      const ndwiArray = await ndwiTensor.data();

      message.success({
        content: "NDWI calculation complete",
        key: "ndwiCompute",
        duration: 2,
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);

      for (let i = 0; i < ndwiArray.length; i++) {
        const ndwiValue = ndwiArray[i];
        const color = ndwiToColor(ndwiValue);

        imageData.data[i * 4] = color[0];
        imageData.data[i * 4 + 1] = color[1];
        imageData.data[i * 4 + 2] = color[2];
        imageData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL();

      const imageExtent32618 = greenImage.getBoundingBox(); // UTM coordinates
      console.log(greenImage);

      const imageExtent = transformExtent(
        imageExtent32618,
        "EPSG:32618",
        "EPSG:3857"
      );

      const ndwiLayer = new ImageLayer({
        title: "NDWI Layer",
        source: new ImageStatic({
          url: dataUrl,
          imageExtent: imageExtent,
        }),
        visible: true,
      });

      mapRef.current.getLayers().push(ndwiLayer);

      mapRef.current
        .getView()
        .fit(imageExtent, { size: mapRef.current.getSize(), duration: 2000 });
      message.success("NDWI layer added to map");

      // Manually refresh the layer switcher
      const layerSwitcherControl = mapRef.current
        .getControls()
        .getArray()
        .find((control) => control instanceof LayerSwitcher);

      if (layerSwitcherControl) {
        layerSwitcherControl.renderPanel(); // Refresh the layer switcher
      }
    } catch (error) {
      console.error("Error computing NDWI:", error);
      message.error(`Error computing NDWI: ${error.message}`);
    }
  };

  const ndwiToColor = (ndwiValue) => {
    if (ndwiValue < -0.2) return [255, 255, 255]; // Blue for water
    else if (ndwiValue < 0) return [255, 255, 255]; // Light blue for less water
    else if (ndwiValue > -0.2)
      return [0, 0, 255]; // Light yellow for soil or sparse vegetation
    else return [255, 255, 255]; // Brown for bare soil, built-up areas, or dense vegetation
  };

  // AWS Lambda invocation for filtering
  const filterWithLambda = async (
    attributeValue,
    geojsonData,
    geojsonS3Url
  ) => {
    try {
      const params = {
        FunctionName: "filterfeatures", // Name of your Lambda function
        Payload: JSON.stringify({
          attribute: "name", // Replace with the attribute to filter (e.g., 'state name')
          value: attributeValue,
          geojson: geojsonData ? geojsonData : null, // Send GeoJSON if available
        }),
      };
      // Invoke the Lambda function
      const command = new InvokeCommand(params);
      const response = await lambdaClient.send(command);
      // Parse and return the filtered GeoJSON
      return JSON.parse(Buffer.from(response.Payload).toString());
    } catch (error) {
      console.error("Error invoking Lambda:", error);
      throw new Error("Failed to filter shapefile using Lambda");
    }
  };

  return (
    <>
      <Spin spinning={isloading} tip="Loading..." size="large">
        <div id="mouse-position" className="custom-mouse-position"></div>
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "10px",
            width: "250px",
            zIndex: 1000,
          }}
        >
          <Space direction="vertical" size="small">
            {!isPotree ? (
              <Switch
                checkedChildren="3d"
                unCheckedChildren="2d"
                checked={dEnabled}
                onChange={(checked) => setdEnabled(checked)}
              />
            ) : null}
            <Switch
              checkedChildren="Potree"
              unCheckedChildren="OpenLayers"
              onChange={(checked) => {
                setIsPotree(checked);
                map3dRef.current = null;
                mapRef.current = null;
              }}
            />
            {!isPotree ? (
              <Card title="Shapefile Upload (.zip)" bordered>
                <Upload
                  accept=".zip"
                  beforeUpload={handleShapefileUpload}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>Upload Shapefile</Button>
                </Upload>
              </Card>
            ) : (
              <Card title="File Upload (.laz)" bordered>
                <Upload
                  accept=".laz"
                  beforeUpload={handlePTfileUpload}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>Upload File</Button>
                </Upload>
              </Card>
            )}

            {/* Dropdown to filter features */}
            {attributes.length > 0 && (
              <Card title="Filter Features" bordered>
                <Select
                  style={{ width: 200 }}
                  placeholder="Select a tehsil name"
                  onChange={handleFilterChange}
                  value={selectedAttribute}
                >
                  {attributes.map((attr) => (
                    <Select.Option key={attr} value={attr}>
                      {attr}
                    </Select.Option>
                  ))}
                </Select>
              </Card>
            )}
          </Space>
        </div>
        {isPotree ? (
          <PotreeViewer />
        ) : (
          <>
            <div id="map" className="sidebyside">
              <div
                ref={mapContainerRef}
                style={{
                  marginLeft: dEnabled ? "50%" : 0,
                  width: dEnabled ? "50%" : "100%",
                  height: "100%",
                  borderLeft: "1px solid #000",
                }}
              ></div>
              <div id="ol3d" ref={ol3dContainerRef}></div>
            </div>
          </>
        )}
      </Spin>
    </>
  );
};

export default MapComponent;
