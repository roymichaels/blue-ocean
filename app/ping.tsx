import { View, Text } from "react-native";

export default function Ping() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 24 }}>PING ✅</Text>
    </View>
  );
}

