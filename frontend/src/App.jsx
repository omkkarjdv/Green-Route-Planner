import { useState } from "react";
import axios from "axios";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

import "leaflet/dist/leaflet.css";
import "./App.css";


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);



function FitRoutes({ routes }) {

  const map = useMap();

  if (routes && routes.length > 0) {

    const allCoordinates = [];

    routes.forEach((route) => {

      route.geometry.coordinates.forEach(
        ([lng, lat]) => {

          allCoordinates.push([
            lat,
            lng,
          ]);

        }
      );

    });

    if (allCoordinates.length > 0) {

      map.fitBounds(
        allCoordinates,
        {
          padding: [40, 40],
        }
      );
    }
  }

  return null;
}




function getPollutionColor(aqi) {

  if (aqi === null || aqi === undefined) {
    return "#808080";
  }

  if (aqi <= 20) {
    return "#2e7d32";
  }

  if (aqi <= 40) {
    return "#66bb6a";
  }

  if (aqi <= 60) {
    return "#f9a825";
  }

  if (aqi <= 80) {
    return "#ef6c00";
  }

  if (aqi <= 100) {
    return "#e53935";
  }

  return "#8e0000";
}



function getPollutionEmoji(category) {

  switch (category) {

    case "Good":
      return "🟢";

    case "Fair":
      return "🟢";

    case "Moderate":
      return "🟡";

    case "Poor":
      return "🟠";

    case "Very Poor":
      return "🔴";

    case "Extremely Poor":
      return "🔴";

    default:
      return "⚪";
  }
}



function getScoreDescription(score) {

  if (
    score === null ||
    score === undefined
  ) {
    return "Score unavailable";
  }

  if (score <= 20) {
    return "Excellent overall route";
  }

  if (score <= 40) {
    return "Very good overall route";
  }

  if (score <= 60) {
    return "Good overall route";
  }

  if (score <= 80) {
    return "Average overall route";
  }

  return "Less suitable overall route";
}



function App() {

  const [source, setSource] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [routeData, setRouteData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");



  const findRoute = async () => {

    if (!source || !destination) {

      alert(
        "Please enter both source and destination."
      );

      return;
    }

    setLoading(true);

    setError("");

    setRouteData(null);

    try {

      const response = await axios.post(

        "http://127.0.0.1:5000/api/find-route",

        {
          source,
          destination,
        }
      );

      console.log(
        "Backend response:",
        response.data
      );

      setRouteData(
        response.data
      );

    } catch (error) {

      console.error(
        "Route error:",
        error
      );

      setError(

        error.response?.data?.error ||

        "Unable to find route."
      );

    } finally {

      setLoading(false);
    }
  };



  const chartData = routeData
    ? {

        labels:
          routeData.routes.map(
            (route) =>
              `Route ${route.route_id}`
          ),

        datasets: [

          {
            label: "AQI",

            data:
              routeData.routes.map(
                (route) =>
                  route.average_aqi
              ),

            backgroundColor:
              routeData.routes.map(
                (route) =>
                  getPollutionColor(
                    route.average_aqi
                  )
              ),

            borderWidth: 1,
          },

          {
            label:
              "Green Route Score",

            data:
              routeData.routes.map(
                (route) =>
                  route.green_route_score
              ),

            backgroundColor:
              "#607d8b",

            borderWidth: 1,
          },
        ],
      }
    : null;


  const chartOptions = {

    responsive: true,

    plugins: {

      legend: {
        display: true,
      },

      tooltip: {

        callbacks: {

          label: function (context) {

            return (
              `${context.dataset.label}: ` +
              `${context.raw}`
            );
          },
        },
      },
    },

    scales: {

      y: {

        beginAtZero: true,

        title: {

          display: true,

          text: "Score",
        },
      },
    },
  };



  return (

    <div className="app">


      <div className="header">

        <h1>
          🌱 Green Route Planner
        </h1>

        <p>
          Air Quality-Aware Route Planning System
        </p>

      </div>



      <div className="search-box">

        <div className="input-group">

          <label>
            Source
          </label>

          <input

            type="text"

            placeholder="Enter starting location"

            value={source}

            onChange={(e) =>
              setSource(e.target.value)
            }

          />

        </div>


        <div className="input-group">

          <label>
            Destination
          </label>

          <input

            type="text"

            placeholder="Enter destination"

            value={destination}

            onChange={(e) =>
              setDestination(e.target.value)
            }

          />

        </div>


        <button

          onClick={findRoute}

          disabled={loading}

        >

          {loading
            ? "Finding Routes..."
            : "Find Route"}

        </button>

      </div>



      {error && (

        <div className="error">

          {error}

        </div>

      )}



      {routeData &&
        routeData.routes?.length > 0 && (

        <>



          <div className="recommended">

            <div className="recommended-icon">
              🌱
            </div>

            <div>

              <h2>
                Recommended Green Route
              </h2>

              <p>

                <strong>
                  Route{" "}
                  {routeData.recommended_route_id}
                </strong>

                {" "}has the best overall
                Green Route Score.

              </p>

              <p className="recommendation-reason">

                The score balances:

                <strong>
                  {" "}50% air quality
                </strong>,

                <strong>
                  {" "}30% travel time
                </strong>

                and

                <strong>
                  {" "}20% distance
                </strong>.

              </p>

            </div>

          </div>



          <div className="routes-section">

            <h2>
              Available Routes
            </h2>


            <div className="route-grid">

              {routeData.routes.map(
                (route) => {

                  const isRecommended =

                    route.route_id ===
                    routeData.recommended_route_id;


                  return (

                    <div

                      className={`route-card ${
                        isRecommended
                          ? "recommended-card"
                          : ""
                      }`}

                      key={route.route_id}

                    >

                      <div className="route-card-header">

                        <h3>
                          🚗 Route {route.route_id}
                        </h3>


                        {isRecommended && (

                          <span className="recommended-badge">

                            ⭐ Recommended

                          </span>

                        )}

                      </div>


                      <div className="route-details">

                        <p>

                          <strong>
                            Distance:
                          </strong>{" "}

                          {route.distance_km} km

                        </p>


                        <p>

                          <strong>
                            Travel Time:
                          </strong>{" "}

                          {route.duration_minutes} min

                        </p>


                        <p>

                          <strong>
                            AQI:
                          </strong>{" "}

                          {route.average_aqi}

                        </p>


                        <p>

                          <strong>
                            PM2.5:
                          </strong>{" "}

                          {route.average_pm2_5}
                          {" "}µg/m³

                        </p>


                        <p>

                          <strong>
                            PM10:
                          </strong>{" "}

                          {route.average_pm10}
                          {" "}µg/m³

                        </p>


                        <div className="pollution-level">

                          <span>

                            {getPollutionEmoji(
                              route.pollution_category
                            )}

                          </span>

                          <strong>

                            {route.pollution_category}

                          </strong>

                        </div>



                        <div className="green-score-box">

                          <div className="green-score-title">

                            🌱 Green Route Score

                          </div>


                          <div className="green-score">

                            {route.green_route_score}

                          </div>


                          <div className="score-description">

                            {getScoreDescription(
                              route.green_route_score
                            )}

                          </div>


                          <div className="score-components">

                            <div>

                              <span>
                                Air Quality
                              </span>

                              <strong>
                                {route.aqi_component}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Travel Time
                              </span>

                              <strong>
                                {route.time_component}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Distance
                              </span>

                              <strong>
                                {route.distance_component}
                              </strong>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          </div>




          <div className="scoring-info">

            <h2>
              🧮 How Green Route Score Works
            </h2>

            <p>

              Each route is evaluated using
              three normalized factors:

            </p>


            <div className="weight-grid">

              <div>

                <span>
                  🌫️
                </span>

                <strong>
                  Air Quality
                </strong>

                <b>
                  50%
                </b>

              </div>


              <div>

                <span>
                  ⏱️
                </span>

                <strong>
                  Travel Time
                </strong>

                <b>
                  30%
                </b>

              </div>


              <div>

                <span>
                  📏
                </span>

                <strong>
                  Distance
                </strong>

                <b>
                  20%
                </b>

              </div>

            </div>


            <p className="score-note">

              <strong>
                Lower Green Route Score = Better Route
              </strong>

            </p>

          </div>


        

          <div className="chart-section">

            <h2>
              📊 Route Comparison
            </h2>

            <p className="chart-description">

              Compare air quality and overall
              Green Route Score.

            </p>


            <div className="chart-container">

              <Bar

                data={chartData}

                options={chartOptions}

              />

            </div>

          </div>


        

          <div className="map-section">

            <h2>
              🗺️ Route Map
            </h2>

            <p className="map-description">

              Route colors represent air quality.
              The thick dark-green route is the
              recommended Green Route.

            </p>


            <div className="map-container">

              <MapContainer

                center={[

                  routeData.source_coordinates[1],

                  routeData.source_coordinates[0],

                ]}

                zoom={11}

                style={{
                  height: "600px",
                  width: "100%",
                }}

              >

                <TileLayer

                  attribution="&copy; OpenStreetMap contributors"

                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

                />



                {[

                  ...routeData.routes.filter(
                    (route) =>
                      route.route_id !==
                      routeData.recommended_route_id
                  ),

                  ...routeData.routes.filter(
                    (route) =>
                      route.route_id ===
                      routeData.recommended_route_id
                  ),

                ].map((route) => {

                  const isRecommended =

                    route.route_id ===
                    routeData.recommended_route_id;


                  return (

                    <GeoJSON

                      key={route.route_id}

                      data={route.geometry}

                      style={{

                        color:
                          isRecommended
                            ? "#1b5e20"
                            : getPollutionColor(
                                route.average_aqi
                              ),

                        weight:
                          isRecommended
                            ? 10
                            : 5,

                        opacity:
                          isRecommended
                            ? 1
                            : 0.65,

                        lineCap:
                          "round",

                        lineJoin:
                          "round",

                      }}

                      onEachFeature={(
                        feature,
                        layer
                      ) => {

                        layer.bindPopup(`

                          <div style="
                            min-width: 190px;
                            font-family: Arial;
                          ">

                            <strong>
                              🚗 Route ${route.route_id}
                            </strong>

                            ${
                              isRecommended
                                ? `
                                  <br />
                                  <strong
                                    style="
                                      color:#2e7d32;
                                    "
                                  >
                                    ⭐ RECOMMENDED
                                    GREEN ROUTE
                                  </strong>
                                `
                                : ""
                            }

                            <br /><br />

                            Distance:
                            ${route.distance_km} km

                            <br />

                            Travel Time:
                            ${route.duration_minutes} min

                            <br />

                            AQI:
                            ${route.average_aqi}

                            <br />

                            Pollution:
                            ${route.pollution_category}

                            <br />

                            Green Score:
                            ${route.green_route_score}

                          </div>

                        `);

                      }}

                    />

                  );

                })}



                <CircleMarker

                  center={[

                    routeData.source_coordinates[1],

                    routeData.source_coordinates[0],

                  ]}

                  radius={10}

                  pathOptions={{

                    color: "blue",

                    fillColor: "blue",

                    fillOpacity: 1,

                  }}

                >

                  <Popup>

                    <strong>
                      Source
                    </strong>

                    <br />

                    {routeData.source}

                  </Popup>

                </CircleMarker>



                <CircleMarker

                  center={[

                    routeData.destination_coordinates[1],

                    routeData.destination_coordinates[0],

                  ]}

                  radius={10}

                  pathOptions={{

                    color: "red",

                    fillColor: "red",

                    fillOpacity: 1,

                  }}

                >

                  <Popup>

                    <strong>
                      Destination
                    </strong>

                    <br />

                    {routeData.destination}

                  </Popup>

                </CircleMarker>


                <FitRoutes
                  routes={routeData.routes}
                />

              </MapContainer>

            </div>



            <div className="map-legend">

              <div className="map-legend-title">

                🗺️ Map Legend

              </div>


              <div className="map-legend-item">

                <span className="legend-line recommended-line"></span>

                <span>
                  ⭐ Recommended Green Route
                </span>

              </div>


              <div className="map-legend-item">

                <span className="legend-dot green-dot"></span>

                <span>
                  Good / Fair AQI
                </span>

              </div>


              <div className="map-legend-item">

                <span className="legend-dot yellow-dot"></span>

                <span>
                  Moderate AQI
                </span>

              </div>


              <div className="map-legend-item">

                <span className="legend-dot orange-dot"></span>

                <span>
                  Poor AQI
                </span>

              </div>


              <div className="map-legend-item">

                <span className="legend-dot red-dot"></span>

                <span>
                  High AQI
                </span>

              </div>

            </div>

          </div>



          <div className="data-source">

            Air quality data:
            Open-Meteo Air Quality API

            <br />

            Route data:
            OpenRouteService

          </div>

        </>

      )}

    </div>

  );
}


export default App;