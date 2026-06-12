let map;
let marker;
let watchId;

let currentLat = 0;
let currentLon = 0;
let currentSpeed = 0;
async function updateLocationText(lat, lon) {

    try {

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );

        const data = await response.json();

        const placeName =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            "Unknown Location";

        const state =
            data.address.state || "";

        document.getElementById("locationText").innerHTML =
            `${placeName}, ${state}`;

    } catch (error) {

        console.error(error);

        document.getElementById("locationText").innerHTML =
            `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
}
// =====================================
// INITIALIZE MAP
// =====================================

function initMap() {

    map = L.map('map').setView(
        [15.9129, 79.7400],
        6
    );

    L.tileLayer(

        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

        {
            attribution:
                '&copy; OpenStreetMap'
        }

    ).addTo(map);
}

initMap();

// =====================================
// DETECT LOCATION
// =====================================

function detectLocation() {

    if (!navigator.geolocation) {

        alert("Geolocation not supported");

        return;
    }

    navigator.geolocation.getCurrentPosition(

        (position) => {

            currentLat =
                position.coords.latitude;

            currentLon =
                position.coords.longitude;

            currentSpeed =
                position.coords.speed || 0;

            updateMap();

           updateLocationText(
    currentLat,
    currentLon
);

            document.getElementById(
                "speedText"
            ).innerHTML =

                `${Math.round(currentSpeed)}
                 km/h`;

        },

        (err) => {

            console.error(err);

            alert("Location permission denied");
        },

        {
            enableHighAccuracy: true
        }
    );
}

// =====================================
// START LIVE TRACKING
// =====================================

function startTracking() {

    if (!navigator.geolocation) {

        alert("Geolocation not supported");

        return;
    }

    watchId =
        navigator.geolocation.watchPosition(

        (position) => {

            currentLat =
                position.coords.latitude;

            currentLon =
                position.coords.longitude;

            currentSpeed =
                position.coords.speed || 0;

            updateMap();

            updateLocationText(
    currentLat,
    currentLon
);

            document.getElementById(
                "speedText"
            ).innerHTML =

                `${Math.round(currentSpeed)}
                 km/h`;

        },

        (err) => {

            console.error(err);
        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

// =====================================
// UPDATE MAP
// =====================================

function updateMap() {

    map.setView(
        [currentLat, currentLon],
        16
    );

    if (marker) {

        marker.setLatLng(
            [currentLat, currentLon]
        );

    } else {

        marker = L.marker(
            [currentLat, currentLon]
        ).addTo(map);
    }
}

// =====================================
// CHALLAN SYSTEM
// =====================================

async function getTrafficLaw() {

    const chatBox =
        document.getElementById("chat-box");

    const input =
        document.getElementById("user-input");

    const wheels =
        document.getElementById("wheelSelect").value;

    const violation =
        input.value.trim();

    if (!violation) return;

    let vehicleType = "Unknown";

    if (wheels == "2")
        vehicleType = "Bike";

    else if (wheels == "3")
        vehicleType = "Auto";

    else if (wheels == "4")
        vehicleType = "Car";

    else
        vehicleType = "Heavy Vehicle";

    // =====================================
    // USER MESSAGE
    // =====================================

    chatBox.innerHTML += `

        <div class="message user">

            <strong>Violation:</strong>
            ${violation}

            <br>

            <strong>Vehicle:</strong>
            ${vehicleType}

        </div>
    `;

    try {

        const response =
            await fetch("/calculate-fine", {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                lat: currentLat,

                lon: currentLon,

                accuracy: 10,

                speed: currentSpeed,

                violation:
                    violation
                        .toLowerCase()
                        .replaceAll(" ", "_"),

                vehicle_type:
                    vehicleType,

                insurance: false,

                pollution_certificate: false,

                rc_valid: true,

                repeat_offender: false
            })
        });

        const data =
            await response.json();

        if (!data.success) {

            chatBox.innerHTML += `

                <div class="message bot error">

                    ${data.error}

                </div>
            `;

            return;
        }

        // =====================================
        // RESULT
        // =====================================

        chatBox.innerHTML += `

        <div class="message bot">

            <h3>
                🚨 Challan Details
            </h3>

            <strong>State:</strong>
            ${data.state}

            <br><br>

            <strong>Description:</strong>
            ${data.description}

            <br><br>

            <strong>Law:</strong>
            ${data.law_section}

            <br><br>

            <strong>Vehicle:</strong>
            ${data.vehicle_type}

            <br><br>

            <strong>Insurance:</strong>

            ${
                data.insurance_provided
                ? "Provided"
                : "Not Provided"
            }

            <br><br>

            <strong>Pollution:</strong>

            ${
                data.pollution_certificate
                ? "Valid"
                : "Missing"
            }

            <br><br>

            <strong>RC:</strong>

            ${
                data.rc_valid
                ? "Valid"
                : "Expired"
            }

            <br><br>

            <strong>Base Fine:</strong>

            ₹${data.base_fine}

            <br><br>

            <strong>Extra Charges:</strong>

            ₹${data.extra_fine}

            <br><br>

            <strong>Total Fine:</strong>

            ₹${data.total_fine}

            <br><br>

            <strong>Coordinates:</strong>

            <br>

            ${data.coordinates.lat},
            ${data.coordinates.lon}

        </div>
        `;

        chatBox.scrollTop =
            chatBox.scrollHeight;

    } catch (err) {

        console.error(err);

        chatBox.innerHTML += `

            <div class="message bot error">

                Server error occurred.

            </div>
        `;
    }

    input.value = "";
}
const chatbot = document.getElementById("chatbot");
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotSend = document.getElementById("chatbot-send");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotMessages = document.getElementById("chatbot-messages");

chatbotToggle.onclick = () => {
    chatbot.style.display = "flex";
};

chatbotClose.onclick = () => {
    chatbot.style.display = "none";
};

chatbotSend.onclick = sendMessage;

function sendMessage() {

    const text = chatbotInput.value.trim();

    if (!text) return;

    chatbotMessages.innerHTML += `
        <div class="user-msg">${text}</div>
    `;

    let reply = getBotReply(text);

    chatbotMessages.innerHTML += `
        <div class="bot-msg">${reply}</div>
    `;

    chatbotInput.value = "";

    chatbotMessages.scrollTop =
        chatbotMessages.scrollHeight;
}

function getBotReply(msg) {

    msg = msg.toLowerCase();

    if (msg.includes("helmet")) {
        return "Helmet violation fine in Tamil Nadu is ₹1000.";
    }

    if (msg.includes("seat belt")) {
        return "Seat belt violation fine is ₹1000.";
    }

    if (msg.includes("license")) {
        return "Driving without license can attract a fine up to ₹5000.";
    }

    if (msg.includes("speed")) {
        return "Over-speeding fines depend on vehicle type and state.";
    }

    return "I can answer traffic rule questions.";
}
