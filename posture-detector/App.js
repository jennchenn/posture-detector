import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Button, Platform } from "react-native";
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
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const HIGH = "red";
  const MED = "orange";
  const LOW = "yellow";

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seat Posture</Text>
      <View
        style={[
          {
            flexDirection: "row",
          },
        ]}
      >
        <Text>Right Side of Seat</Text>
        <Text>{"                      "}</Text>
        <Text>Left Side of Seat</Text>
      </View>
      <View style={styles.outline}>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: HIGH }]} />
          <View style={[styles.square, { backgroundColor: HIGH }]} />
          <View style={[styles.square, { backgroundColor: HIGH }]} />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: MED }]} />
          <View style={[styles.square, { backgroundColor: MED }]} />
        </View>
        <View
          style={[
            {
              flexDirection: "row",
            },
          ]}
        >
          <View style={[styles.square, { backgroundColor: LOW }]} />
          <View style={[styles.square, { backgroundColor: LOW }]} />
        </View>
      </View>

      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken, "title", "body");
        }}
      />
    </View>
  );
}
