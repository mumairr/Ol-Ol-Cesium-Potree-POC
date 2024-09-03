# GIS OpenLayers Demo with Earth Engine API and AWS Integration

This repository contains a comprehensive demo application that showcases the use of the OpenLayers library for Geographic Information Systems (GIS), integrated with Google Earth Engine via a Flask-based API (`python-gee`). The application also leverages AWS services (Lambda and S3) for storing uploaded files and performing on-the-fly filtering operations.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **OpenLayers Integration:** Displaying interactive 2D maps with multiple layers, including vector and raster data.
- **Potree Integration:** Visualizing and interacting with 3D point clouds within the map environment.
- **OL-Cesium Integration:** Seamlessly switching between 2D and 3D views of geographical data using OL-Cesium.
- **Ant Design Integration:** Utilizing Ant Design (antd) components for a modern and responsive user interface.
- **Earth Engine API Integration:** Accessing and processing satellite imagery and other geospatial data using the Google Earth Engine API via a Flask (`python-gee`) backend.
- **AWS S3 Integration:** Storing and retrieving uploaded files using Amazon S3.
- **AWS Lambda Integration:** Performing on-the-fly filtering and processing of geospatial data using AWS Lambda.
- **Customizable Map Interaction:** Adding markers, lines, polygons, and 3D objects to the map, with full support for user interactions such as zooming, panning, and selecting features.

## Demo

You can view a live demo of this application [here](http://3.226.55.210/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mumairr/gis-openlayers-demo.git
cd gis-openlayers-demo
```

### 2. Install the Frontend (React App) Dependencies

Ensure you have Node.js installed, then navigate to the React app directory and install the dependencies:

```bash
cd Webapp
npm install
```

### 3. Set Up the Backend (Flask App)

Navigate to the `python-gee` directory, set up a virtual environment, and install the dependencies:

```bash
cd ../python-gee
python3 -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
pip install flask flask_cors shapely earthengine-api
```

### 4. Configure AWS Credentials

Ensure that your AWS credentials are set up for accessing S3 and Lambda services. You can configure this via .env file in both flask and react app's folders:

### 5. Start the Backend (Flask App)

While in the `python-gee` directory, start the Flask server:

```bash
python main.py
```

The Flask app will be running at `http://localhost:5000` by default.

### 6. Start the Frontend (React App)

In a new terminal window, navigate to the `frontend` directory and start the React development server:

```bash
cd Webapp
npm run dev
```

The React app will be running at `http://localhost:5173` by default.

### 7. Access the Application

Open your browser and navigate to `http://localhost:5173` to interact with the full application.

## Usage

Once the application is running, you can explore the following functionalities:

- **2D/3D Map Toggle:** Switch between 2D and 3D map views using the integrated OL-Cesium control.
- **Point Cloud Visualization:** Load and interact with 3D point clouds using Potree.
- **Earth Engine API Calls:** Use the Flask (`python-gee`) backend to retrieve and display data from the Google Earth Engine API, such as satellite imagery or processed geospatial data.
- **File Upload and Storage:** Upload files directly from the frontend, which are then stored in Amazon S3.
- **On-the-Fly Processing:** Use AWS Lambda to perform real-time filtering and processing on the uploaded geospatial data, which is then rendered on the map.
- **UI Components:** Utilize Ant Design components for a responsive and modern user interface, including forms, modals, and navigation elements.
- **Map Interaction:** Add markers, draw lines and polygons, and interact with 3D objects on the map. Use zoom, pan, and select features as needed.
- **Default SidebySide Map**: By default, it will show synced side by side maps of ol and ol-cesium, you can turn  this off using 2d switch above upload card at left bottom
- **Potree view**: Use Potree switch above it to switch between openlayers and potree points viewers
Feel free to explore and modify the code to fit your specific requirements.

## Technologies Used

- **[OpenLayers](https://openlayers.org/):** A powerful, high-performance library for rendering 2D maps in web applications.
- **[Potree](https://potree.org/):** A WebGL-based point cloud renderer for visualizing large 3D datasets.
- **[OL-Cesium](https://openlayers.org/ol-cesium/):** A library that combines OpenLayers with CesiumJS, enabling seamless 2D/3D map switching.
- **[Ant Design (antd)](https://ant.design/):** A popular React UI framework that provides a wide range of high-quality components for building user interfaces.
- **[Google Earth Engine](https://earthengine.google.com/):** A cloud-based platform for planetary-scale environmental data analysis.
- **[Flask](https://flask.palletsprojects.com/):** A lightweight WSGI web application framework for Python, used for creating the backend API.
- **[Amazon S3](https://aws.amazon.com/s3/):** A scalable object storage service used for storing uploaded files.
- **[Amazon Lambda](https://aws.amazon.com/lambda/):** A serverless compute service that lets you run code in response to events, used here for real-time data processing.
- **JavaScript/HTML/CSS:** Core web technologies used to build the frontend interface.
- **Python:** The programming language used for backend development.
- **Node.js & npm:** Used for managing dependencies and running the frontend development server.

## Project Structure

```
gis-openlayers-demo/
├── python-gee/              # Flask app for Earth Engine API and AWS integration
│   ├── app.py               # Main Flask app script
│   ├── requirements.txt     # Backend dependencies
│   └── ...                  # Additional backend modules and configurations
├── Webapp/                # React app for GIS OpenLayers demo
│   ├── public/              # Static files
│   ├── src/                 # Source files (components, styles, etc.)
│   ├── package.json         # Frontend dependencies
│   └── ...                  # Additional frontend configurations
├── README.md                # This README file
└── ...                      # Other configuration and documentation files
```

## Contributing

Contributions are welcome! If you have suggestions for improvements, feel free to fork the repository and submit a pull request. Please ensure that your code follows the existing style and conventions.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgements

- Special thanks to the contributors of the [OpenLayers project](https://github.com/openlayers/openlayers), [Potree](https://github.com/potree/potree), [OL-Cesium](https://github.com/openlayers/ol-cesium), and [Google Earth Engine](https://earthengine.google.com/) for providing excellent tools for web-based GIS applications.
- Thanks to the [Ant Design](https://ant.design/) team for their amazing UI components that help in creating a polished user experience.
- Acknowledgement to [AWS](https://aws.amazon.com/) for providing scalable cloud services that power the file storage and processing capabilities of this application.
