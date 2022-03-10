from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class SensorReadings(db.Model):
    __tablename__ = "sensor_readings"
    timestamp = db.Column(db.DateTime, primary_key=True)
    pressure_reading = db.Column(db.JSON, nullable=False)
    is_zero = db.Column(db.Boolean, nullable=False)

    def __init__(self, timestamp, pressure_reading, is_zero):
        self.timestamp = timestamp
        self.pressure_reading = pressure_reading
        self.is_zero = is_zero

    def serialize(self):
        return {
            "timestamp": self.timestamp,
            "pressure_reading": self.pressure_reading,
            "is_zero": self.is_zero,
        }
