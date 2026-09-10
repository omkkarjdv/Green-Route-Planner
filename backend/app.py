import os
import requests

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS




load_dotenv()

app = Flask(__name__)
CORS(app)

ORS_API_KEY = os.getenv("ORS_API_KEY")

ORS_BASE_URL = "https://api.heigit.org"

OPEN_METEO_AQ_URL = (
    "https://air-quality-api.open-meteo.com/v1/air-quality"
)




@app.route("/")
def home():
    return jsonify({
        "message": "Green Route Planner Backend is running!"
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "success",
        "message": "Backend is healthy and running!"
    })




def geocode_location(location):

    url = f"{ORS_BASE_URL}/pelias/v1/search"

    headers = {
        "Authorization": ORS_API_KEY
    }

    params = {
        "text": location,
        "size": 1
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=15
    )

    response.raise_for_status()

    data = response.json()

    if not data.get("features"):
        raise ValueError(
            f"Could not find location: {location}"
        )

    return (
        data["features"][0]
        ["geometry"]
        ["coordinates"]
    )




def sample_route_points(
    geometry,
    number_of_points=6
):

    coordinates = geometry.get(
        "coordinates",
        []
    )

    if not coordinates:
        return []

    if len(coordinates) <= number_of_points:
        return coordinates

    selected = []

    for i in range(number_of_points):

        index = round(
            i * (len(coordinates) - 1)
            / (number_of_points - 1)
        )

        selected.append(
            coordinates[index]
        )

    return selected



def get_air_quality(route_points):

    if not route_points:
        return None

    # ORS format:
    # [longitude, latitude]

    longitudes = [
        str(round(point[0], 6))
        for point in route_points
    ]

    latitudes = [
        str(round(point[1], 6))
        for point in route_points
    ]

    params = {

        "latitude": ",".join(latitudes),

        "longitude": ",".join(longitudes),

        "current": (
            "european_aqi,"
            "pm2_5,"
            "pm10"
        ),

        "timezone": "auto"
    }

    response = requests.get(
        OPEN_METEO_AQ_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    return response.json()




def get_pollution_category(aqi):

    if aqi is None:
        return "Unknown"

    if aqi <= 20:
        return "Good"

    elif aqi <= 40:
        return "Fair"

    elif aqi <= 60:
        return "Moderate"

    elif aqi <= 80:
        return "Poor"

    elif aqi <= 100:
        return "Very Poor"

    else:
        return "Extremely Poor"




def analyze_route_air_quality(geometry):

    route_points = sample_route_points(
        geometry,
        number_of_points=6
    )

    if not route_points:

        return {
            "average_aqi": None,
            "average_pm2_5": None,
            "average_pm10": None,
            "pollution_category": "Unknown",
            "pollution_score": None,
            "sample_points": 0
        }

    air_quality_data = get_air_quality(
        route_points
    )

    if isinstance(
        air_quality_data,
        list
    ):
        locations = air_quality_data
    else:
        locations = [air_quality_data]

    aqi_values = []
    pm25_values = []
    pm10_values = []

    for location in locations:

        current = location.get(
            "current",
            {}
        )

        aqi = current.get(
            "european_aqi"
        )

        pm25 = current.get(
            "pm2_5"
        )

        pm10 = current.get(
            "pm10"
        )

        if aqi is not None:
            aqi_values.append(aqi)

        if pm25 is not None:
            pm25_values.append(pm25)

        if pm10 is not None:
            pm10_values.append(pm10)

    average_aqi = (

        sum(aqi_values) /
        len(aqi_values)

        if aqi_values

        else None
    )

    average_pm25 = (

        sum(pm25_values) /
        len(pm25_values)

        if pm25_values

        else None
    )

    average_pm10 = (

        sum(pm10_values) /
        len(pm10_values)

        if pm10_values

        else None
    )

    pollution_category = (
        get_pollution_category(
            average_aqi
        )
    )

    pollution_score = (

        round(
            average_aqi,
            1
        )

        if average_aqi is not None

        else None
    )

    return {

        "average_aqi": (
            round(
                average_aqi,
                1
            )
            if average_aqi is not None
            else None
        ),

        "average_pm2_5": (
            round(
                average_pm25,
                1
            )
            if average_pm25 is not None
            else None
        ),

        "average_pm10": (
            round(
                average_pm10,
                1
            )
            if average_pm10 is not None
            else None
        ),

        "pollution_category":
            pollution_category,

        "pollution_score":
            pollution_score,

        "sample_points":
            len(route_points)
    }




def normalize_value(
    value,
    minimum,
    maximum
):

    if maximum == minimum:
        return 0

    normalized = (

        (value - minimum) /
        (maximum - minimum)

    ) * 100

    return normalized




def calculate_green_route_scores(routes):

    valid_routes = [

        route

        for route in routes

        if (
            route["average_aqi"] is not None
            and route["duration_minutes"] is not None
            and route["distance_km"] is not None
        )
    ]

    if not valid_routes:
        return routes

    aqi_values = [
        route["average_aqi"]
        for route in valid_routes
    ]

    time_values = [
        route["duration_minutes"]
        for route in valid_routes
    ]

    distance_values = [
        route["distance_km"]
        for route in valid_routes
    ]

    min_aqi = min(aqi_values)
    max_aqi = max(aqi_values)

    min_time = min(time_values)
    max_time = max(time_values)

    min_distance = min(distance_values)
    max_distance = max(distance_values)

    for route in valid_routes:

        aqi_score = normalize_value(
            route["average_aqi"],
            min_aqi,
            max_aqi
        )

        time_score = normalize_value(
            route["duration_minutes"],
            min_time,
            max_time
        )

        distance_score = normalize_value(
            route["distance_km"],
            min_distance,
            max_distance
        )

        green_score = (

            (aqi_score * 0.50)

            +

            (time_score * 0.30)

            +

            (distance_score * 0.20)
        )

        route["aqi_component"] = round(
            aqi_score,
            2
        )

        route["time_component"] = round(
            time_score,
            2
        )

        route["distance_component"] = round(
            distance_score,
            2
        )

        route["green_route_score"] = round(
            green_score,
            2
        )

    return routes




@app.route(
    "/api/find-route",
    methods=["POST"]
)
def find_route():

    data = request.get_json()

    if not data:

        return jsonify({
            "error":
                "Request body is required."
        }), 400

    source = data.get("source")
    destination = data.get("destination")

    if not source or not destination:

        return jsonify({
            "error":
                "Source and destination "
                "are required."
        }), 400

    if not ORS_API_KEY:

        return jsonify({
            "error":
                "ORS API key is not configured."
        }), 500

    try:



        source_coordinates = (
            geocode_location(source)
        )

        destination_coordinates = (
            geocode_location(destination)
        )

        print(
            "Source coordinates:",
            source_coordinates
        )

        print(
            "Destination coordinates:",
            destination_coordinates
        )



        directions_url = (

            f"{ORS_BASE_URL}"

            "/openrouteservice/v2/directions/"

            "driving-car/geojson"
        )

        headers = {

            "Authorization":
                ORS_API_KEY,

            "Content-Type":
                "application/json"
        }




        normal_body = {

            "coordinates": [

                source_coordinates,

                destination_coordinates

            ],

            "instructions":
                False
        }

        response = requests.post(

            directions_url,

            headers=headers,

            json=normal_body,

            timeout=30
        )

        response.raise_for_status()

        normal_route_data = (
            response.json()
        )

        normal_features = (
            normal_route_data
            .get(
                "features",
                []
            )
        )

        if not normal_features:

            return jsonify({
                "error":
                    "No route was found."
            }), 404




        normal_summary = (

            normal_features[0]
            ["properties"]
            ["summary"]
        )

        normal_distance_km = (

            normal_summary["distance"]
            / 1000
        )

        print(
            f"Normal route distance: "
            f"{normal_distance_km:.2f} km"
        )




        route_features = normal_features

        if normal_distance_km <= 100:

            print(
                "Trip is <= 100 km."
            )

            print(
                "Requesting alternative routes..."
            )

            alternative_body = {

                "coordinates": [

                    source_coordinates,

                    destination_coordinates

                ],

                "instructions":
                    False,

                "alternative_routes": {

                    "target_count":
                        3,

                    "weight_factor":
                        1.4,

                    "share_factor":
                        0.6
                }
            }

            alternative_response = requests.post(

                directions_url,

                headers=headers,

                json=alternative_body,

                timeout=30
            )

            if alternative_response.ok:

                alternative_data = (
                    alternative_response.json()
                )

                alternative_features = (

                    alternative_data
                    .get(
                        "features",
                        []
                    )
                )

                if alternative_features:

                    route_features = (
                        alternative_features
                    )

                    print(
                        f"Found "
                        f"{len(route_features)} "
                        f"routes."
                    )

                else:

                    print(
                        "No alternative routes found."
                    )

            else:

                print(
                    "Alternative route request failed."
                )

                print(
                    alternative_response.text
                )

                print(
                    "Using normal route."
                )

        else:

            print(
                "Trip is greater than 100 km."
            )

            print(
                "Using normal route only."
            )




        routes = []

        for index, feature in enumerate(
            route_features
        ):

            summary = (

                feature["properties"]
                ["summary"]
            )

            distance_km = (
                summary["distance"] / 1000
            )

            duration_minutes = (
                summary["duration"] / 60
            )




            print(
                f"Getting air quality "
                f"for Route {index + 1}..."
            )

            air_quality = (
                analyze_route_air_quality(
                    feature["geometry"]
                )
            )


            route = {

                "route_id":
                    index + 1,

                "distance_km":
                    round(
                        distance_km,
                        2
                    ),

                "duration_minutes":
                    round(
                        duration_minutes,
                        1
                    ),

                "average_aqi":
                    air_quality[
                        "average_aqi"
                    ],

                "average_pm2_5":
                    air_quality[
                        "average_pm2_5"
                    ],

                "average_pm10":
                    air_quality[
                        "average_pm10"
                    ],

                "pollution_category":
                    air_quality[
                        "pollution_category"
                    ],

                "pollution_score":
                    air_quality[
                        "pollution_score"
                    ],

                "sample_points":
                    air_quality[
                        "sample_points"
                    ],

                "geometry":
                    feature["geometry"]
            }

            routes.append(route)




        print(
            "Calculating Green Route Scores..."
        )

        routes = (
            calculate_green_route_scores(
                routes
            )
        )




        routes_with_score = [

            route

            for route in routes

            if route.get(
                "green_route_score"
            ) is not None
        ]

        recommended_route_id = None

        if routes_with_score:

            recommended_route = min(

                routes_with_score,

                key=lambda route:
                    route[
                        "green_route_score"
                    ]
            )

            recommended_route_id = (
                recommended_route[
                    "route_id"
                ]
            )



        print(
            "\n========== GREEN ROUTE SCORES =========="
        )

        for route in routes:

            print(

                f"Route {route['route_id']} | "

                f"AQI: "
                f"{route['average_aqi']} | "

                f"Time: "
                f"{route['duration_minutes']} min | "

                f"Distance: "
                f"{route['distance_km']} km | "

                f"Green Score: "
                f"{route.get('green_route_score')}"
            )

        print(
            "=========================================\n"
        )




        return jsonify({

            "status":
                "success",

            "source":
                source,

            "destination":
                destination,

            "source_coordinates":
                source_coordinates,

            "destination_coordinates":
                destination_coordinates,

            "route_count":
                len(routes),

            "recommended_route_id":
                recommended_route_id,

            "scoring_weights": {

                "air_quality":
                    "50%",

                "travel_time":
                    "30%",

                "distance":
                    "20%"
            },

            "routes":
                routes,

            "air_quality_source":
                "Open-Meteo Air Quality API",

            "air_quality_note":
                "AQI and pollutant values are "
                "based on Open-Meteo air quality "
                "model data."
        })



    except requests.exceptions.HTTPError as error:

        print(
            "HTTP error:",
            error
        )

        return jsonify({

            "error":
                "An external API returned "
                "an HTTP error.",

            "details":
                str(error)

        }), 502


    except requests.exceptions.RequestException as error:

        print(
            "Request error:",
            error
        )

        return jsonify({

            "error":
                "Could not connect to "
                "an external API.",

            "details":
                str(error)

        }), 502


    except ValueError as error:

        print(
            "Location error:",
            error
        )

        return jsonify({

            "error":
                str(error)

        }), 400


    except Exception as error:

        print(
            "Unexpected error:",
            error
        )

        return jsonify({

            "error":
                "An unexpected server "
                "error occurred.",

            "details":
                str(error)

        }), 500




if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )