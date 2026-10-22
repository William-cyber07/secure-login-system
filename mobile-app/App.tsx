import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://secure-login-api-3xrj.onrender.com';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // 1. Send login request to your Render backend
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // 2. Handle 2FA (if required)
      if (data.requires2fa) {
        Alert.prompt(
          '2FA Required',
          'Enter the 6-digit code from your authenticator app',
          async (code) => {
            const verifyResponse = await fetch(`${API_URL}/api/2fa/verify-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preToken: data.preToken, code }),
            });
            const verifyData = await verifyResponse.json();
            
            if (verifyResponse.ok) {
              // Save the token securely on the phone
              await SecureStore.setItemAsync('sessionToken', verifyData.sessionToken);
              Alert.alert('Success', 'Logged in successfully!');
            } else {
              Alert.alert('Error', verifyData.error);
            }
          }
        );
      } else {
        // No 2FA
        await SecureStore.setItemAsync('sessionToken', data.sessionToken);
        Alert.alert('Success', 'Logged in successfully!');
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button title={loading ? 'Loading...' : 'Sign In'} onPress={handleLogin} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#0f172a' },
  input: { height: 50, borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, backgroundColor: 'white' },
});