from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from shapely.geometry import shape
import ee
import time
import os
import subprocess

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

service_account = 'pakdms@ee-umairrs.iam.gserviceaccount.com'
credentials = ee.ServiceAccountCredentials(service_account, 'ee-umairrs-47a7b5ae300e.json')

ee.Initialize(credentials)

@app.route('/api/download_imagery', methods=['POST'])
def download_imagery():
    geojson = request.json.get('geojson')
    collection = request.json.get('collection', 'LANDSAT/LC08/C02/T1_L2')
    start_date = request.json.get('start_date', '2023-01-01')
    end_date = request.json.get('end_date', '2024-12-31')
    
    if not isinstance(geojson, dict) or 'features' not in geojson:
        return jsonify({"error": "Invalid GeoJSON format"}), 400
    
    try:
        geometry = ee.Geometry.Polygon(geojson['features'][0]['geometry']['coordinates'])
        
        collection = ee.ImageCollection(collection)\
            .filterBounds(geometry)\
            .filterDate(start_date, end_date)\
            .sort('CLOUD_COVER')
        
        image = collection.first().clip(geometry)
        
        # Generate the map id and token for displaying the image
        map_id_dict = image.getMapId()
        mapid = map_id_dict['mapid']
        token = map_id_dict['token']
        
        # Generate the download URL for the full GeoTIFF image
        download_url = image.getDownloadURL({
            'scale': 30,
            'region': geometry
        })

        # Return both the mapid and the GeoTIFF URL
        return jsonify({'url': mapid, 'token': token, 'geotiff_url': download_url})
    
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    UPLOAD_FOLDER = r'E:\Github\gis-openlayers-demo\Webapp\public\uploads'
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.laz'):
        # Save the file to the desired folder
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        
        file.save(file_path)
        
        # Poll the file system to check if the file is saved
        max_attempts = 10
        attempt = 0
        while not os.path.exists(file_path) and attempt < max_attempts:
            time.sleep(1)  # Wait 1 second before checking again
            attempt += 1
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found after saving"}), 500
    
    
        command = f'PotreeConverter\PotreeConverter.exe {file_path} -o {UPLOAD_FOLDER}'
        
        try:
            # Run the command
            result = subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return jsonify({"message": "Conversion successful", "output": result.stdout.decode('utf-8')})
        except subprocess.CalledProcessError as e:
            return jsonify({"error": "An error occurred during conversion", "details": e.stderr.decode('utf-8')}), 500
    else:
        return jsonify({"error": "Unsupported file type. Please upload a .laz file."}), 400


@app.route('/api/file', methods=['GET'])
def download_file():
    UPLOAD_FOLDER = r'E:\Github\gis-openlayers-demo\Webapp\public\uploads'
    # Serve the file from the UPLOAD_FOLDER directory
    try:
        print(send_from_directory(UPLOAD_FOLDER, 'metadata.json'))
        return send_from_directory(UPLOAD_FOLDER, 'metadata.json')
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    
if __name__ == '__main__':
    app.run(debug=True)
