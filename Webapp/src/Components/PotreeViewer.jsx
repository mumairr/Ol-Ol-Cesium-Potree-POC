import { Button, Card, Spin, Upload } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";

const Potree = window.Potree;
console.log(Potree);

const PotreeViewer = () => {
  const [isloading, setIsloading] = useState(false);
  const [pointcloud, setPointcloud] = useState(
    "http://5.9.65.151/mschuetz/potree/resources/pointclouds/weiss/chiller/cloud.js"
  );
  const potreeContainer = useRef(null);
  const handlePTfileUpload = async (file) => {
    setIsloading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Response from server:", result);

      // const file2 = await fetch("http://localhost:5000/api/file", {
      //   method: "GET",
      // });
      // const data = await file2.json();
      // console.log(data);

      setPointcloud("uploads/metadata.json");
      setIsloading(false);
    } catch (error) {
      console.error("Error downloading Landsat imagery:", error);
    }
  };

  useEffect(() => {
    if (Potree && potreeContainer.current) {
      setIsloading(true);
      const viewer = new Potree.Viewer(potreeContainer.current);

      viewer.setEDLEnabled(true);
      viewer.setFOV(60);
      viewer.setPointBudget(1_000_000);
      viewer.loadSettingsFromURL();

      viewer.setDescription("");

      viewer.loadGUI(() => {
        viewer.setLanguage("en");
        $("#menu_appearance").next().show();
        $("#menu_tools").next().show();
        $("#menu_clipping").next().show();
        viewer.toggleSidebar();
      });

      // Load a sample point cloud (replace with your own cloud.js path)
      Potree.loadPointCloud(pointcloud, "PointCloud", (e) => {
        const pointcloud = e.pointcloud;

        let material = pointcloud.material;
        material.size = 1;
        material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
        material.shape = Potree.PointShape.SQUARE;
        material.activeAttributeName = "rgba";
        viewer.scene.addPointCloud(pointcloud);
        viewer.fitToScreen();
        setIsloading(false);
      });
    }
  }, [pointcloud]);

  return (
    <>
      <Spin spinning={isloading} tip="Loading Point Cloud...">
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "10px",
            width: "250px",
            zIndex: 1000,
          }}
        >
          <Card title="File Upload (.laz)" bordered>
            <Upload
              accept=".laz"
              beforeUpload={handlePTfileUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Upload File</Button>
            </Upload>
          </Card>
        </div>
        <>
          <div style={{ width: "100%", height: "100vh" }}>
            <div ref={potreeContainer} id="potree_render_area"></div>
            <div id="potree_sidebar_container"> </div>
          </div>
          {/* <div style={{ width: "100%", height: "100vh" }}>
          <div ref={potreeContainer} style={{ width: "100%", height: "100vh" }}></div>
          <div id="potree_sidebar_container"> </div>
        </div> */}
        </>
      </Spin>
    </>
  );
};

export default PotreeViewer;
