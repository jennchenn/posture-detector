import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import moment from "moment";
import {
  getPressureColor,
  DARK_GREEN,
  GREEN,
  LIGHT_GREEN,
  YELLOW,
  LIGHT_ORANGE,
  DARK_ORANGE,
  RED,
  MAGENTA,
  WHITE,
} from "./components/Utils";

// Code related to notifications taken from: https://docs.expo.dev/push-notifications/overview/

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function sendPushNotification(expoPushToken, title, body) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

function getDifferenceInMinutes(diffDate) {
  const currDate = new Date();
  const diffInMs = Math.abs(currDate - diffDate);
  return diffInMs / (1000 * 60);
}

function getDifferenceInSeconds(diffDate) {
  const currDate = new Date();
  const diffInMs = Math.abs(currDate - diffDate);
  return diffInMs / 1000;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    marginBottom: 10,
  },
  outline: {
    borderWidth: 5,
    borderRadius: 25,
    margin: 20,
    alignItems: "center",
  },
  square: {
    width: 90,
    height: 90,
    margin: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
  },
  smallSquare: {
    width: 20,
    height: 20,
    margin: 8,
    borderRadius: 10,
  },
  alignCenter: {
    alignItems: "center",
  },
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const [isBadPosture, setIsBadPosture] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [timeSince, setTimeSince] = useState(0);
  const [pressureReading, setPressureReading] = useState({
    0: 5,
    1: 5,
    2: 5,
    3: 5,
    4: 5,
    5: 5,
    6: 5,
  });
  const [numPressedSensors, setNumPressedSensors] = useState(0);
  const notificationListener = useRef();
  const responseListener = useRef();
  const MAX_SITTING_TIME_MIN = 20;
  const MINUTE_IN_S = 60;

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => setExpoPushToken(token));
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    getPressureReading();
    const interval = setInterval(() => {
      getPressureReading();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getTimeSinceSitting();
    const interval = setInterval(() => {
      getTimeSinceSitting();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sendTimeSinceSittingNotif();
    const interval = setInterval(() => {
      sendTimeSinceSittingNotif();
    }, 1 * MINUTE_IN_S * 1000);
    return () => clearInterval(interval);
  }, []);

  const cleanPressureReading = (rawPressureReading) => {
    // if just a fluctuation in data, don't show to user
    let numPressedSensors = 0;
    for (let sensorReading in rawPressureReading) {
      if (rawPressureReading[sensorReading] < 4.9) {
        numPressedSensors++;
      }
    }
    setNumPressedSensors(numPressedSensors);
  };

  const getPressureReading = () => {
    fetch("https://seat-posture-detector.herokuapp.com/pressure", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((responseJson) => {
        const rawPressureReading = responseJson["pressure_reading"];
        setLastUpdated(moment(responseJson["timestamp"]));
        cleanPressureReading(rawPressureReading);
        if (JSON.stringify(rawPressureReading) !== JSON.stringify(pressureReading)) {
          setPressureReading(rawPressureReading, checkSittingPosture(rawPressureReading));
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const getTimeSinceSitting = () => {
    fetch("https://seat-posture-detector.herokuapp.com/time_since", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((responseJson) => {
        const time_since = responseJson["time_since"];
        setTimeSince(Math.round(time_since / MINUTE_IN_S));
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const sendTimeSinceSittingNotif = () => {
    if (timeSince >= MAX_SITTING_TIME_MIN && getDifferenceInMinutes(lastUpdated) < 5) {
      sendPushNotification(expoPushToken, "Take a break.", "You have been sitting for too long!");
    }
  };

  const checkSittingPosture = (currPressureReading) => {
    if (numPressedSensors <= 1) {
      return;
    } else {
      const averageRow1 =
        (currPressureReading["0"] + currPressureReading["1"] + currPressureReading["2"]) / 3;
      const averageRow2 = (currPressureReading["3"] + currPressureReading["4"]) / 2;
      const averageRow3 = (currPressureReading["5"] + currPressureReading["6"]) / 2;
      const averageLeft = (currPressureReading["0"] + currPressureReading["3"]) / 2;
      const averageRight = (currPressureReading["2"] + currPressureReading["4"]) / 2;
      const averageRow12 = (averageRow1 + averageRow2) / 2;
      if (
        Math.abs(averageLeft - averageRight) < 0.3 &&
        averageRow12 - averageRow3 < 0.9 &&
        averageRow12 - averageRow3 > 0.1
      ) {
        setIsBadPosture(false);
      } else if (averageLeft - averageRight > 0.3) {
        setIsBadPosture(true);
        sendPushNotification(
          expoPushToken,
          "Fix your posture.",
          "There is too much pressure on your right side."
        );
      } else if (averageLeft - averageRight < -0.3) {
        setIsBadPosture(true);
        sendPushNotification(
          expoPushToken,
          "Fix your posture.",
          "There is too much pressure on your left side."
        );
      } else {
        setIsBadPosture(true);
        if (numPressedSensors > 1) {
          sendPushNotification(
            expoPushToken,
            "Fix your posture.",
            "Make sure you're sitting upright!"
          );
        }
      }
      return;
    }
  };

  const getSensorColor = (sensorValue) => {
    if (numPressedSensors <= 1) {
      return WHITE;
    } else {
      return getPressureColor(sensorValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Posture Detector</Text>
      <Text>Your posture is: {numPressedSensors <= 1 ? "-" : isBadPosture ? "Bad" : "Good"}</Text>
      <Text>Sitting Time: {timeSince} minute(s)</Text>
      <Text>Last Updated: {moment.utc(lastUpdated).local().startOf("seconds").fromNow()}</Text>
      <View
        style={[
          {
            flexDirection: "row",
            marginTop: 10,
          },
        ]}
      >
        <Text>Left Side of Seat</Text>
        <Text>{"                      "}</Text>
        <Text>Right Side of Seat</Text>
      </View>
      <View style={styles.outline}>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[0]) }]} />
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[1]) }]} />
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[2]) }]} />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[3]) }]} />
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[4]) }]} />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[5]) }]} />
          <View style={[styles.square, { backgroundColor: getSensorColor(pressureReading[6]) }]} />
        </View>
      </View>
      <View
        style={[
          {
            flexDirection: "row",
            marginTop: 10,
          },
        ]}
      >
        <Text>Low Pressure</Text>
        <Text>{"                           "}</Text>
        <Text>High Pressure</Text>
      </View>
      <View
        style={[
          {
            flexDirection: "row",
          },
        ]}
      >
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: DARK_GREEN }]} />
          <Text>4.8</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: GREEN }]} />
          <Text>4.7</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: LIGHT_GREEN }]} />
          <Text>4.5</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: YELLOW }]} />
          <Text>4</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: LIGHT_ORANGE }]} />
          <Text>3.5</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: DARK_ORANGE }]} />
          <Text>3</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: MAGENTA }]} />
          <Text>2</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: RED }]} />
          <Text>0</Text>
        </View>
      </View>
    </View>
  );
}
