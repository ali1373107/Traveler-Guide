import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, Button, Alert, Keyboard, Platform, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region, UrlTile, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '../../firebaseConfig';

interface CrimeMarkerData {
  id: string; // Use document ID for the key
  coordinate: {
    latitude: number;
    longitude: number;
  };
  crimeType: string;
  month: string;
  reportedBy: string;
}

const MapScreen = () => {
  const [initialRegion, setInitialRegion] = useState<Region | undefined>(undefined);
  const [crimeMarkers, setCrimeMarkers] = useState<CrimeMarkerData[]>([]); // State to hold an array of markers
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true); // New state to track location loading
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const CRIME_DATA_CACHE_KEY = 'crimeDataCache';

        const loadCrimeData = async (): Promise<CrimeMarkerData[]> => {
          // 1. Try to load from local storage first
          const cachedData = await AsyncStorage.getItem(CRIME_DATA_CACHE_KEY);
          if (cachedData) {
            console.log("Loading crime data from local cache...");
            return JSON.parse(cachedData);
          }

          // 2. If no cache, fetch from Firestore
          console.log("Fetching crime data from Firestore...");
          const fetchedMarkers: CrimeMarkerData[] = [];
          const querySnapshot = await getDocs(collection(db, "Crime"));
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.Latitude && data.Longitude) {
              fetchedMarkers.push({
                id: doc.id,
                coordinate: { latitude: data.Latitude, longitude: data.Longitude },
                crimeType: data['Crime type'] || 'N/A',
                month: data.Month || 'N/A',
                reportedBy: data['Reported by'] || 'N/A',
              });
            }
          });

          // 3. Save the fetched data to local storage for next time
          await AsyncStorage.setItem(CRIME_DATA_CACHE_KEY, JSON.stringify(fetchedMarkers));
          console.log("Crime data cached locally.");
          return fetchedMarkers;
        };

        const fetchUserLocation = async () => {
          try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Permission to access location was denied');
              return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setInitialRegion({
              latitude,
              longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
          } catch (error) {
            console.error("Error fetching location: ", error);
          }
        };

        // Run both fetches in parallel for efficiency
        const [fetchedMarkers] = await Promise.all([
          loadCrimeData(),
          fetchUserLocation()
        ]);

        setCrimeMarkers(fetchedMarkers);
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  // This new useEffect hook will run whenever crimeMarkers state is updated.
  useEffect(() => {
    // We check if there are markers, the map reference is available, and we are not in the initial loading state.
    if (crimeMarkers.length > 0 && mapRef.current && !isLoadingLocation) {
      const coordinates = crimeMarkers.map(marker => marker.coordinate);
      
      // Animate the map to fit all the markers.
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 150, // A bit more padding at the top to account for the search bar
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  }, [crimeMarkers, isLoadingLocation]); // It depends on both crimeMarkers and the loading state.

  const handleSearch = async () => {
    Keyboard.dismiss();
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a city name to search.');
      return;
    }

    try {
      // Using Nominatim for geocoding (city name to coordinates)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newRegion = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000); // Animate over 1 second
        }
        // You could also add a new marker for the searched location if you wish
        // setSearchedMarker({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
      } else {
        Alert.alert('Not Found', `Could not find the city "${searchQuery}".`);
      }
    } catch (error) {
      console.error('Error during geocoding:', error);
      Alert.alert('Search Error', 'An error occurred while searching.');
    }
  };

  const centerOnUserLocation = () => {
    if (initialRegion && mapRef.current) {
      mapRef.current.animateToRegion(initialRegion, 1000); // Animate over 1 second
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a city..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch} // Allows searching by pressing 'return' on keyboard
        />
        <Button title="Search" onPress={handleSearch} />
      </View>
      {isLoadingLocation ? ( // Show loading indicator while fetching location
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : ( // If not loading, show the map. It will either have an initialRegion or be fitted to markers.
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion} // The map will now either start at user location OR animate to fit markers
          showsUserLocation={true} // This will show the default blue dot for user location
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false} // on Android, this may need to be true
          />
          {/* --- Render all crime markers --- */}
          {crimeMarkers.map((marker) => (
            <Marker key={marker.id} coordinate={marker.coordinate}>
              <Callout tooltip>
                <View style={styles.calloutView}>
                  <Text style={styles.calloutTitle}>Crime Details</Text>
                  <Text>
                    <Text style={styles.calloutLabel}>Crime type: </Text>{marker.crimeType}
                  </Text>
                  <Text>
                    <Text style={styles.calloutLabel}>Month: </Text>{marker.month}
                  </Text>
                  <Text><Text style={styles.calloutLabel}>Reported by: </Text>{marker.reportedBy}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) }
      {/* Render button only when the map is visible */}
      {!isLoadingLocation && initialRegion && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={centerOnUserLocation}>
          <IconSymbol name="location.fill" size={22} color="#007AFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    // Add shadow for iOS and elevation for Android for better UI
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginRight:10,
    paddingHorizontal: 8,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 50, // Makes it circular
    padding: 12,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
  calloutView: {
    padding: 10,
    width: 200,
    backgroundColor: 'white',
    borderRadius: 6,
    borderColor: '#ccc',
    borderWidth: 0.5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutLabel: {
    fontWeight: 'bold',
  },
});

export default MapScreen;