from datetime import datetime, timedelta
import os

from flask import Flask, jsonify, request
from flask_migrate import Migrate
from sqlalchemy import desc

from models import db, SensorReadings


app = Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")
db.init_app(app)
migrate = Migrate(app, db)


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "UP"})


@app.route("/pressure", methods=["POST", "GET"])
def sensor():
    if request.method == "POST":
        pressure_reading = {}
        is_zero_pressure = True
        for sensor_id in request.args:
            pressure_value = float(request.args.get(sensor_id))
            pressure_reading[sensor_id] = pressure_value
            is_zero_pressure = is_zero_pressure and (pressure_value > 4.8)
        if is_zero_pressure or (
            SensorReadings.query.order_by(desc("timestamp")).first()
            and SensorReadings.query.order_by(desc("timestamp"))
            .first()
            .is_zero_pressure
        ):  # clear data where user was not sitting
            SensorReadings.query.delete()
        try:
            sensor_reading = SensorReadings(
                timestamp=datetime.now(),
                pressure_reading=pressure_reading,
                is_zero_pressure=is_zero_pressure,
            )
            db.session.add(sensor_reading)
            db.session.commit()
            return jsonify(sensor_reading.serialize())
        except Exception as e:
            print(str(e))
            return jsonify(str(e))
    else:
        pressure_reading = SensorReadings.query.order_by(desc("timestamp")).first()
        return jsonify(pressure_reading.serialize())


@app.route("/time_since", methods=["GET"])
def time_since():
    sitting_start_time = (
        SensorReadings.query.order_by("timestamp").first().timestamp
        if SensorReadings.query.order_by("timestamp").first()
        and not SensorReadings.query.order_by("timestamp").first().is_zero_pressure
        else 0
    )
    return jsonify(
        {
            "time_since": timedelta.total_seconds(datetime.now() - sitting_start_time)
            if sitting_start_time != 0
            else 0
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
