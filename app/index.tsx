import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Button, Platform, Text, View } from "react-native";
import { useAndroidPermissions } from "@/hooks/useAndroidPermissions";
import { BleManager, Device } from "react-native-ble-plx";

export default function App() {
  const [hasPermissions, setHasPermissions] = useState<boolean>(
    Platform.OS == "ios"
  );
  const [waitingPerm, grantedPerm] = useAndroidPermissions();
  const [logData, setLogData] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);

  const manager = new BleManager();

  function scanAndConnect() {
    manager.startDeviceScan(null, null, (error, device) => {
      setScanning(true);
      if (error) {
        console.error("Error during scan:", error);
        setScanning(false);
        return;
      }
  
      if (device) {
        const deviceInfo = `Device Name: ${device.name || "Unknown"}, ID: ${device.id}`;
        console.log(deviceInfo); // Log device information to console
      }
  
      // Check if it is the target device based on name
      if (device?.name === "HRM-Dual:513142") {
        manager.stopDeviceScan();
        setScanning(false);
        setDevice(device);
  
        const heartRateServiceUUID = "0000180d-0000-1000-8000-00805f9b34fb";
        const heartRateMeasurementUUID = "00002a37-0000-1000-8000-00805f9b34fb";
  
        device
          .connect()
          .then((connectedDevice) => {
            return connectedDevice.discoverAllServicesAndCharacteristics();
          })
          .then((discoveredDevice) => {
            logServicesAndCharacteristics(discoveredDevice); // Optional: log all services/characteristics
            return discoveredDevice.monitorCharacteristicForService(
              heartRateServiceUUID,
              heartRateMeasurementUUID,
              (error, characteristic) => {
                if (error) {
                  console.error("Error monitoring heart rate characteristic:", error);
                  return;
                }
  
                if (characteristic?.value) {
                  const heartRateValue  = decodeHeartRate(characteristic.value);
                  console.log("Heart Rate:", heartRateValue );
                  setHeartRate(heartRateValue);
                }
              }
            );
          })
          .catch((error) => {
            console.log("Error during connection or discovery:", error);
          });
      }
    });
  }

  function logServicesAndCharacteristics(device: Device) {
    device.services().then((services) => {
      services.forEach((service) => {
        service.characteristics().then((characteristics) => {
          characteristics.forEach((characteristic) => {
            const info = `Service: ${service.uuid}, Characteristic: ${characteristic.uuid}`;
            console.log(info); // Log to console
            setLogData((prev) => (prev ? prev + "\n" + info : info)); // Update logData state
          });
        });
      });
    });
  }

// Helper function to decode the heart rate value from Base64 without using Buffer
function decodeHeartRate(base64Value: string): number {
  const binaryString = atob(base64Value); // Decode Base64 to binary string
  const byteArray = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const heartRate = byteArray[1]; // Typically, the second byte holds the heart rate value in BPM
  return heartRate;
}

  useEffect(() => {
    if (!(Platform.OS == "ios")) {
      setHasPermissions(grantedPerm);
    }
  }, [grantedPerm]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {!hasPermissions && (
        <View>
          <Text>Looks like you have not enabled Permission for BLE</Text>
        </View>
      )}
      {hasPermissions && (
        <>
          <Text style={{ margin: 20, textAlign: "center", fontSize: 18 }}>BLE Permissions enabled!</Text>
          <Button title="Scan and Connect" onPress={scanAndConnect} />
          {scanning && <Text style={{ margin: 20, textAlign: "center", fontSize: 18 }}>Scanning...</Text>}
          {device && <Text style={{ margin: 20, textAlign: "center", fontSize: 18 }}>Connected!</Text>}
          <Text style={{ margin: 20, textAlign: "center", fontSize: 18 }}>Device: {device?.name || "No device connected yet"}</Text>
          <Text style={{ margin: 20, textAlign: "center", fontSize: 32 }}>Heart Rate: {heartRate}</Text>
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}
