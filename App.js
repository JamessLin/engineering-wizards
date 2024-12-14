import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, FlatList } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, remove, onValue } from 'firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';


const firebaseConfig = {

};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [cooldown, setCooldown] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [events, setEvents] = useState([]); 

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        alert('permissions not granted');
      } else {
        console.log('permissions granted!');
      }
    } else {
      console.log('permission not granted')
    }
  };

  useEffect(() => {
    requestNotificationPermissions();

    const cooldownRef = ref(database, '/timer/cooldown');
    onValue(cooldownRef, (snapshot) => {
      const data = snapshot.val();
      setCooldownSeconds(data ? parseInt(data, 10) : 0);
    });

    const interval = setInterval(() => {
      if (cooldownSeconds > 0) {
        setCooldownSeconds((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    const eventsRef = ref(database, '/timer/events');
    onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      const eventList = data ? Object.entries(data) : [];
      setEvents(eventList.map(([id, eventData]) => ({ id, ...eventData })));
    });
  }, []);

  const handleCooldownUpdate = () => {
    Keyboard.dismiss(); 
    const cooldownRef = ref(database, '/timer/cooldown');
    set(cooldownRef, parseInt(cooldown, 10)).then(() => {
      alert('Cooldown updated!');
    });
  };

  const handleNextEventUpdate = async () => {
    if (selectedTimestamp) {
      const eventsRef = ref(database, '/timer/events');
      const newEventRef = push(eventsRef);
      await set(newEventRef, {
        timestamp: selectedTimestamp,
        message: 'Time to eat Pill',
      });
      alert('Next event added!');

      const notificationTime = new Date(selectedTimestamp * 1000);
      console.log('Scheduling notification for:', notificationTime);

      if (notificationTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time to eat Pill',
            body: 'The pill has dropped',
            sound: 'default',
          },
          trigger: {
            date: notificationTime,
          },
        });
        console.log('Notification scheduled successfully.');
      } else {
        alert('Cant select past time');
      }
    } else {
      alert('Select a valid date');
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || selectedDate;
    setSelectedDate(currentDate);
    setSelectedTimestamp(Math.floor(currentDate.getTime() / 1000)); 
  };

  const handleDeleteEvent = async (eventId) => {
    const eventRef = ref(database, `/timer/events/${eventId}`);
    await remove(eventRef);
    alert('Event removed successfully!');
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <Text style={styles.header}>Engineering Wizards</Text>

        <View contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>

            <Text style={styles.subHeader}>Alarm time (in seconds): {cooldownSeconds}</Text>
            <TextInput
              style={styles.input}
              value={cooldown}
              onChangeText={setCooldown}
              keyboardType="numeric"
              placeholder="Enter new cooldown in seconds"
            />
            <Button title="Update Cooldown" onPress={handleCooldownUpdate} />
          </View>

          
          <View style={styles.card}>
            <Text style={styles.subHeader}>Scheduled Events:</Text>
            <View style={styles.eventListContainer}>
              <ScrollView style={styles.scrollableEventList} contentContainerStyle={styles.eventList}>
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <View key={event.id} style={styles.eventContainer}>
                      <Text style={styles.eventText}>
                        Event {index + 1}: {new Date(event.timestamp * 1000).toLocaleString()}
                      </Text>
                      <Button title="Remove" onPress={() => handleDeleteEvent(event.id)} />
                    </View>
                  ))
                ) : (
                  <Text>No events scheduled yet.</Text>
                )}
              </ScrollView>
            </View>
          </View>

        
          <View style={styles.card}>
            <Text style={styles.subHeader}>Select Date and Time for the Next Event:</Text>
            <DateTimePicker
              value={selectedDate}
              mode="datetime"
              is24Hour={true}
              onChange={onDateChange}
            />
            {selectedTimestamp && (
              <Text style={styles.timestamp}>Selected Date: {new Date(selectedTimestamp * 1000).toLocaleString()}</Text>
            )}
            <Button title="Add Next Event" onPress={handleNextEventUpdate} />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 20,
    marginTop:10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  eventListContainer: {
    height: 200, 
    overflow: 'hidden',
  },
  scrollableEventList: {
    maxHeight: 200,
  },
  eventList: {
    paddingBottom: 10,
  },
  eventContainer: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  eventText: {
    fontSize: 16,
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
});

export default App;
