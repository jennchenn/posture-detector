import time

from flask import Flask, jsonify, request

app = Flask(__name__)

sitting_start_time = time.time()


@app.route("/pressure", methods=["POST", "GET"])
def sensor():
    global sitting_start_time
    if request.method == "POST":
        pressure_readings = {}
        is_zeroed = True
        for sensor_id in request.args:
            pressure_reading = float(request.args.get(sensor_id))
            pressure_readings[sensor_id] = pressure_reading
            is_zeroed = is_zeroed and (pressure_reading == 0)
        if is_zeroed:  # user is not sitting
            sitting_start_time = 0
        # TODO: write to database
        return pressure_readings
    else:
        # TODO: return most recent values in database
        pass


@app.route("/time_since", methods=["GET"])
def time_since():
    global sitting_start_time
    return jsonify(
        {
            "time_since": time.time() - sitting_start_time
            if sitting_start_time > 0
            else 0
        }
    )
