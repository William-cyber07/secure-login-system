import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatList 
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://secure-login-api-3xrj.onrender.com';

export default function App() {
  const [screen, setScreen] = useState<'login' | '2fa' | 'main'>('login');
  const [activeTab, setActiveTab] = useState<'home' | 'users' | 'reports' | 'settings'>('home');
  
  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [preToken, setPreToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Create User Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (activeTab === 'users' && screen === 'main') fetchUsers();
    if (activeTab === 'reports' && screen === 'main') fetchReport();
  }, [activeTab]);

  const getToken = async () => await SecureStore.getItemAsync('sessionToken');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setUsers(data.users);
      else Alert.alert('Access Denied', data.error);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setReportData(data);
      else Alert.alert('Access Denied', data.error);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingReport(false);
    }
  };

  // --- USER MANAGEMENT ACTIONS ---
  const handleCreateUser = async () => {
    if (!newUsername || !newEmail || !newPassword) return Alert.alert("Error", "All fields required");
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/inputer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Inputer created successfully");
        setShowCreateForm(false);
        setNewUsername(''); setNewEmail(''); setNewPassword('');
        fetchUsers();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = (id: number, name: string) => {
    Alert.alert("Delete User", `Are you sure you want to delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/users/inputer/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
              Alert.alert("Deleted", `${name} has been deleted.`);
              fetchUsers();
            } else throw new Error(data.error);
          } catch (err: any) { Alert.alert("Error", err.message); }
      }}
    ]);
  };

   const handleChangeRole = (id: number, currentRole: string) => {
    const roles = ['inputer', 'manager', 'admin', 'administrator'];
    
    // Build the options array safely
    const options: any[] = roles.map(r => ({
      text: r.toUpperCase(),
      onPress: async () => {
        if (r === currentRole) return;
        try {
          const token = await getToken();
          const res = await fetch(`${API_URL}/api/users/${id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role: r })
          });
          const data = await res.json();
          if (res.ok) { 
            Alert.alert("Updated", `Role changed to ${r}`); 
            fetchUsers(); 
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) { 
          Alert.alert("Error", err.message); 
        }
      }
    }));

    // Add the cancel button at the end
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Change Role", "Select a new role for this user", options);
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      if (data.requires2fa) {
        setPreToken(data.preToken);
        setScreen('2fa');
      } else {
        await SecureStore.setItemAsync('sessionToken', data.sessionToken);
        setUserData(data.user);
        setScreen('main');
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/2fa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preToken, code }),
      });
      const data = await response.json();
      if (response.ok) {
        await SecureStore.setItemAsync('sessionToken', data.sessionToken);
        setUserData(data.user);
        setScreen('main');
        setCode('');
      } else {
        throw new Error(data.error || 'Invalid code');
      }
    } catch (error: any) {
      Alert.alert('2FA Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('sessionToken');
    setUserData(null);
    setUsername('');
    setPassword('');
    setScreen('login');
    setActiveTab('home');
  };

  // --- SCREEN 1: LOGIN ---
  if (screen === 'login') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={50} color="#4f46e5" />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your secure account</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Enter username" value={username} onChangeText={setUsername} autoCapitalize="none" />
            </View>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Enter password" value={password} onChangeText={setPassword} secureTextEntry />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <><Text style={styles.buttonText}>Sign In</Text><Ionicons name="arrow-forward" size={20} color="white" /></>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // --- SCREEN 2: 2FA ---
  if (screen === '2fa') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="key" size={50} color="#d97706" />
            </View>
            <Text style={styles.title}>Two-Factor Auth</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code from your app</Text>
          </View>
          <View style={styles.card}>
            <TextInput style={[styles.input, styles.otpInput]} placeholder="000000" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[styles.button, { backgroundColor: '#d97706' }]} onPress={handleVerify2FA} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Code</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // --- MAIN APP (TABS) ---
  const isAdmin = userData?.role === 'administrator' || userData?.role === 'admin';
  const isTopRole = userData?.role === 'administrator';

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>
          {activeTab === 'home' ? 'Dashboard' : activeTab === 'users' ? 'System Users' : activeTab === 'reports' ? 'System Reports' : 'Settings'}
        </Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{userData?.role}</Text></View>
      </View>

      <View style={{ flex: 1 }}>
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.dashSubtitle}>Welcome back, {userData?.username}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}><Ionicons name="briefcase" size={30} color="#3b82f6" /><Text style={styles.statValue}>{userData?.role.toUpperCase()}</Text><Text style={styles.statLabel}>Role</Text></View>
              <View style={styles.statCard}><Ionicons name="shield-checkmark" size={30} color="#10b981" /><Text style={styles.statValue}>Active</Text><Text style={styles.statLabel}>2FA Status</Text></View>
            </View>
          </ScrollView>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <View style={{ flex: 1, padding: 15 }}>
            
            {/* Collapsible Create Form */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', padding: 12, borderRadius: 10, marginBottom: 15, justifyContent: 'center' }} 
              onPress={() => setShowCreateForm(!showCreateForm)}
            >
              <Ionicons name={showCreateForm ? "close" : "add-circle-outline"} size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>{showCreateForm ? "Cancel" : "Create New Inputer"}</Text>
            </TouchableOpacity>

                        {showCreateForm && (
              <View style={[styles.card, { padding: 15, marginBottom: 15 }]}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 5 }}>Username</Text>
                <TextInput 
                  style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, height: 50, color: '#1e293b' }} 
                  placeholder="e.g. john_doe" 
                  placeholderTextColor="#94a3b8"
                  value={newUsername} 
                  onChangeText={setNewUsername} 
                  autoCapitalize="none" 
                />

                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 5 }}>Email Address</Text>
                <TextInput 
                  style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, height: 50, color: '#1e293b' }} 
                  placeholder="e.g. john@example.com" 
                  placeholderTextColor="#94a3b8"
                  value={newEmail} 
                  onChangeText={setNewEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                />

                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 5 }}>Password</Text>
                <TextInput 
                  style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, height: 50, color: '#1e293b' }} 
                  placeholder="At least 8 characters" 
                  placeholderTextColor="#94a3b8"
                  value={newPassword} 
                  onChangeText={setNewPassword} 
                  secureTextEntry 
                />

                <TouchableOpacity style={[styles.button, { height: 50 }]} onPress={handleCreateUser} disabled={creating}>
                  {creating ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save User</Text>}
                </TouchableOpacity>
              </View>
            )}

            {loadingUsers ? <ActivityIndicator size="large" color="#4f46e5" /> : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.userCard}>
                    <View style={styles.userAvatar}><Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.username}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    
                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {isTopRole && item.id !== userData.id ? (
                        <TouchableOpacity onPress={() => handleChangeRole(item.id, item.role)}>
                           <View style={styles.userRoleBadge}><Text style={styles.userRoleText}>{item.role} ▼</Text></View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.userRoleBadge}><Text style={styles.userRoleText}>{item.role}</Text></View>
                      )}

                      {isAdmin && item.role === 'inputer' && item.id !== userData.id && (
                        <TouchableOpacity onPress={() => handleDeleteUser(item.id, item.username)}>
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* REPORTS TAB (Admin Only) */}
        {activeTab === 'reports' && isAdmin && (
          <ScrollView style={{ padding: 20 }}>
            {loadingReport ? <ActivityIndicator size="large" color="#4f46e5" /> : (
              <>
                <View style={styles.card}>
                  <Text style={styles.label}>Security Logic</Text>
                  <Text style={{ color: '#10b981', fontWeight: 'bold', marginBottom: 5 }}>Pepper: {reportData?.pepper}</Text>
                  <Text style={{ color: '#64748b', marginBottom: 15 }}>Salt: {reportData?.saltLogic}</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.button, { flex: 1, height: 40, backgroundColor: '#3b82f6' }]} onPress={() => Alert.alert("Backup", "Triggering server backup...")}>
                      <Text style={styles.buttonText}>Backup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { flex: 1, height: 40, backgroundColor: '#f59e0b' }]} onPress={() => Alert.alert("Restore", "Triggering server restore...")}>
                      <Text style={styles.buttonText}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.label, { marginTop: 10, marginBottom: 10, fontSize: 18 }]}>Password Hashes</Text>
                {reportData?.users.map((u: any) => (
                  <View key={u.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={styles.userName}>{u.username}</Text>
                      <Text style={styles.userRoleText}>{u.role}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }} numberOfLines={3}>
                      {u.password_hash}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <View style={{ padding: 20 }}>
             <View style={styles.card}>
                <Text style={styles.label}>Account Security</Text>
                <Text style={{ color: '#64748b', marginBottom: 15 }}>2FA is currently enabled.</Text>
                <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Log Out</Text>
                </TouchableOpacity>
             </View>
          </View>
        )}
      </View>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={24} color={activeTab === 'home' ? '#4f46e5' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('users')}>
          <Ionicons name={activeTab === 'users' ? 'people' : 'people-outline'} size={24} color={activeTab === 'users' ? '#4f46e5' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'users' && styles.navTextActive]}>Users</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('reports')}>
            <Ionicons name={activeTab === 'reports' ? 'document-text' : 'document-text-outline'} size={24} color={activeTab === 'reports' ? '#4f46e5' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'reports' && styles.navTextActive]}>Reports</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('settings')}>
          <Ionicons name={activeTab === 'settings' ? 'settings' : 'settings-outline'} size={24} color={activeTab === 'settings' ? '#4f46e5' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 2, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 55, color: '#1e293b', fontSize: 16 },
  button: { flexDirection: 'row', backgroundColor: '#4f46e5', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 2 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  otpInput: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, height: 70, fontSize: 32, textAlign: 'center', letterSpacing: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  topHeaderTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  badge: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  dashSubtitle: { fontSize: 16, color: '#64748b', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 10 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 5 },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', paddingBottom: 30, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  navTextActive: { color: '#4f46e5' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 18 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b' },
  userRoleBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  userRoleText: { fontSize: 11, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  dangerButton: { flexDirection: 'row', backgroundColor: '#ef4444', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
});