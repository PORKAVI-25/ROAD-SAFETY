from flask import Flask, render_template, request, jsonify
from shapely.geometry import Point, shape
from datetime import datetime
from geopy.geocoders import Nominatim
import json
import os

app = Flask(__name__)
geolocator = Nominatim(
    user_agent="traffic_fine_system"
)
# =========================================
# LOAD LAWS
# =========================================

with open("laws.json", "r", encoding="utf-8") as f:
    LAWS = json.load(f)
KEYWORDS = {

    "helmet": "helmet_violation",

    "signal": "signal_jump",

    "red light": "signal_jump",

    "seatbelt": "seatbelt_violation",

    "speed": "overspeeding",

    "overspeed": "overspeeding",

    "drunk": "drunk_driving",

    "alcohol": "drunk_driving",

    "phone": "mobile_phone_usage",

    "mobile": "mobile_phone_usage",

    "wrong side": "wrong_side_driving",

    "license": "no_driving_license",

    "licence": "no_driving_license",

    "insurance": "without_insurance",

    "pollution": "without_puc",

    "puc": "without_puc",

    "triple": "triple_riding",

    "racing": "racing"
}
# =========================================
# LOAD GEOJSON FILES
# =========================================

STATE_POLYGONS = {}

GEO_FOLDER = "geo"

for file in os.listdir(GEO_FOLDER):

    if file.endswith(".geojson"):

        path = os.path.join(GEO_FOLDER, file)

        with open(path, "r", encoding="utf-8") as f:

            geo = json.load(f)

            state_name = geo["properties"]["state"]

            STATE_POLYGONS[state_name] = shape(
                geo["geometry"]
            )

# =========================================
# HELPERS
# =========================================

def get_state(lat, lon):

    point = Point(lon, lat)

    for state, polygon in STATE_POLYGONS.items():

        if polygon.contains(point):
            return state

    return "Unknown"


def validate_accuracy(accuracy):

    return accuracy <= 50


def detect_fake_speed(speed):

    return speed > 250
def get_exact_location(lat, lon):

    try:

        location = geolocator.reverse(
            f"{lat},{lon}"
        )

        if location:

            address = location.raw.get(
                "address", {}
            )

            return {

                "full_address":
                    location.address,

                "city":
                    address.get(
                        "city",
                        address.get(
                            "town",
                            address.get(
                                "village",
                                "Unknown"
                            )
                        )
                    ),

                "district":
                    address.get(
                        "state_district",
                        "Unknown"
                    )
            }

    except:
        pass

    return {

        "full_address":
            "Unknown",

        "city":
            "Unknown",

        "district":
            "Unknown"
    }

# =========================================
# ROUTES
# =========================================

@app.route("/")
def home():

    return render_template("index.html")


@app.route("/calculate-fine", methods=["POST"])
def calculate_fine():

    try:

        data = request.json

        lat = float(data["lat"])
        lon = float(data["lon"])

        accuracy = float(
            data.get("accuracy", 999)
        )

        speed = float(
            data.get("speed", 0)
        )

        violation = data["violation"]

        # =========================================
        # VALIDATIONS
        # =========================================

        if not validate_accuracy(accuracy):

            return jsonify({
                "success": False,
                "error": "Low GPS accuracy"
            }), 400

        if detect_fake_speed(speed):

            return jsonify({
                "success": False,
                "error":
                    "Suspicious movement detected"
            }), 400

        # =========================================
        # GEO FENCING
        # =========================================

        state = get_state(lat, lon)
        location_data = get_exact_location(
    lat,
    lon
)

        if state == "Unknown":

            return jsonify({
                "success": False,
                "error":
                    "Outside jurisdiction"
            }), 403

        # =========================================
        # LAW LOOKUP
        # =========================================

        if violation not in LAWS:

            return jsonify({
                "success": False,
                "error":
                    "Invalid violation"
            }), 400

        law_data = LAWS[violation]

        description = law_data["description"]

        law_section = law_data["law_section"]

        base_fine = law_data["base_fine"].get(state)

        # =========================================
        # VEHICLE DATA
        # =========================================

        vehicle_type = data.get(
            "vehicle_type",
            "Unknown"
        )

        insurance = data.get(
            "insurance",
            False
        )

        pollution_certificate = data.get(
            "pollution_certificate",
            False
        )

        rc_valid = data.get(
            "rc_valid",
            True
        )

        repeat_offender = data.get(
            "repeat_offender",
            False
        )

        # =========================================
        # EXTRA CHARGES
        # =========================================

        extra_fine = 0

        if not insurance:
            extra_fine += 2000

        if not pollution_certificate:
            extra_fine += 1000

        if not rc_valid:
            extra_fine += 3000

        if repeat_offender:
            extra_fine += 1500

        total_fine = (
            base_fine + extra_fine
        )

        # =========================================
        # RESPONSE
        # =========================================

        return jsonify({

            "success": True,

            "timestamp":
                datetime.now().isoformat(),

            "state": state,

"location": {

    "city":
        location_data["city"],

    "district":
        location_data["district"],

    "full_address":
        location_data["full_address"]
},

"violation": violation,

            "description": description,

            "law_section": law_section,

            "vehicle_type": vehicle_type,

            "insurance_provided":
                insurance,

            "pollution_certificate":
                pollution_certificate,

            "rc_valid": rc_valid,

            "repeat_offender":
                repeat_offender,

            "base_fine": base_fine,

            "extra_fine": extra_fine,

            "total_fine": total_fine,

            "coordinates": {

                "lat": lat,
                "lon": lon
            }
        })

    except Exception as e:

        return jsonify({

            "success": False,
            "error": str(e)

        }), 500
@app.route("/chatbot", methods=["POST"])
def chatbot():

    try:

        data = request.json

        message = data.get(
            "message",
            ""
        ).lower()

        state = data.get(
            "state",
            "Tamil Nadu"
        )

        for keyword, violation in KEYWORDS.items():

            if keyword in message:

                law = LAWS[violation]

                fine = law["base_fine"].get(
                    state,
                    "Not Available"
                )

                return jsonify({

                    "success": True,

                    "reply":
                    f"""
Violation: {violation.replace('_', ' ')}

Description:
{law['description']}

Law Section:
{law['law_section']}

Fine in {state}:
₹{fine}
                    """
                })

        return jsonify({

            "success": True,

            "reply":
            "Sorry, I couldn't identify the violation."

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        })

if __name__ == "__main__":

    app.run(debug=True)
