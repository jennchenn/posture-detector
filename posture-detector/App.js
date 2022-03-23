import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

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
    console.log(token);
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
  },
  smallSquare: {
    width: 20,
    height: 20,
  },
  alignCenter: {
    alignItems: "center",
  },
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [timeSince, setTimeSince] = useState(0);
  const [pressureReading, setPressureReading] = useState({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  });
  const notificationListener = useRef();
  const responseListener = useRef();
  const MAX_SITTING_TIME_MIN = 20;
  const MINUTE_IN_S = 60;
  const GREEN = "#00F328";
  const YELLOW = "#F7FB1D";
  const LIGHT_ORANGE = "#F8AE17";
  const DARK_ORANGE = "#D76016";
  const RED = "#9C0E1F";

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
    getTimeSinceSitting();
    const interval = setInterval(() => {
      getPressureReading();
      getTimeSinceSitting();
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sendTimeSinceSittingNotif();
    const interval = setInterval(() => {
      sendTimeSinceSittingNotif();
    }, 3 * MINUTE_IN_S * 1000);
    return () => clearInterval(interval);
  }, []);

  const getPressureReading = () => {
    //GET request
    fetch("https://seat-posture-detector.herokuapp.com/pressure", {
      method: "GET",
      //Request Type
    })
      .then((response) => response.json())
      //If response is in json then in success
      .then((responseJson) => {
        //Success
        setLastUpdated(new Date(responseJson["timestamp"]).toLocaleString("en-SG"));
        setPressureReading(responseJson["pressure_reading"]);
        console.log(lastUpdated);
        console.log(pressureReading);
      })
      //If response is not in json then in error
      .catch((error) => {
        //Error
        console.error(error);
      });
  };

  const getTimeSinceSitting = () => {
    //GET request
    fetch("https://seat-posture-detector.herokuapp.com/time_since", {
      method: "GET",
      //Request Type
    })
      .then((response) => response.json())
      //If response is in json then in success
      .then((responseJson) => {
        //Success
        const time_since = responseJson["time_since"];
        setTimeSince(Math.round(time_since / MINUTE_IN_S));
      })
      //If response is not in json then in error
      .catch((error) => {
        //Error
        console.error(error);
      });
  };

  const sendTimeSinceSittingNotif = () => {
    if (timeSince > MAX_SITTING_TIME_MIN) {
      console.log("PUSH");
      sendPushNotification(expoPushToken, "Take a break.", "You have been sitting for too long!");
    }
  };

  const getPressureColor = (pressureValue) => {
    return pressureValue > 4
      ? GREEN // green
      : pressureValue > 3
      ? YELLOW // yellow
      : pressureValue > 2
      ? LIGHT_ORANGE // light orange
      : pressureValue > 1
      ? DARK_ORANGE // dark orange
      : RED; // red
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seat Posture</Text>
      <Text>Sitting Time: {timeSince} minutes</Text>
      <Text>Last Updated: {lastUpdated}</Text>
      <View
        style={[
          {
            flexDirection: "row",
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
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[0]) }]}
          />
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[1]) }]}
          />
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[2]) }]}
          />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[3]) }]}
          />
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[4]) }]}
          />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[5]) }]}
          />
          <View
            style={[styles.square, { backgroundColor: getPressureColor(pressureReading[6]) }]}
          />
        </View>
      </View>
      <View
        style={[
          {
            flexDirection: "row",
          },
        ]}
      >
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: GREEN }]} />
          <Text>0</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: YELLOW }]} />
          <Text>0</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: LIGHT_ORANGE }]} />
          <Text>0</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: DARK_ORANGE }]} />
          <Text>0</Text>
        </View>
        <View style={styles.alignCenter}>
          <View style={[styles.smallSquare, { backgroundColor: RED }]} />
          <Text>0</Text>
        </View>
      </View>
    </View>
  );
}
