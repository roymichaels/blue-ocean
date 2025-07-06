import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, User, Mail, Calendar, Shield, UserCheck, UserX, Filter, X, Save, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import DatabaseService from '../../services/database';
import { User as UserType, CustomerTier } from '../../types';
import { useNotifications } from '../../components/NotificationContext';

export default function UserManagementScreen() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [editedRole, setEditedRole] = useState<'user' | 'driver' | 'admin'>('user');
  const [editedTier, setEditedTier] = useState<CustomerTier>('new');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterKyc, setFilterKyc] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const { isAdmin, isDriver, user } = useAuth();
  const { colors } = useTheme();
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      Alert.alert('גישה מוגבלת', 'רק מנהלים יכולים לגשת לדף זה', [
        { text: 'אישור', onPress: () => router.replace('/') }
      ]);
      return;
    }

    loadUsers();
  }, [isAdmin, isDriver]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filterRole, filterTier, filterKyc]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const allUsers = await db.getAllUserProfiles();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply role filter
    if (filterRole) {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    // Apply tier filter
    if (filterTier) {
      filtered = filtered.filter(user => user.customerTier === filterTier);
    }
    
    // Apply KYC filter
    if (filterKyc) {
      filtered = filtered.filter(user => user.kycStatus === filterKyc);
    }
    
    setFilteredUsers(filtered);
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    setEditedRole(user.role as 'user' | 'driver' | 'admin' || 'user');
    setEditedTier(user.customerTier || 'new');
    setShowEditModal(true);
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      
      // Check if role changed
      if (selectedUser.role !== editedRole) {
        await db.updateUserRole(selectedUser.id, editedRole);
      }
      
      // Check if customer tier changed
      if (selectedUser.customerTier !== editedTier) {
        await db.updateUserCustomerTier(selectedUser.id, editedTier);
      }
      
      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id
          ? { ...u, role: editedRole, isAdmin: editedRole === 'admin', isDriver: editedRole === 'driver', customerTier: editedTier }
          : u
      ));
      
      setShowEditModal(false);
      showNotification(
        'משתמש עודכן',
        `הפרטים של ${selectedUser.displayName} עודכנו בהצלחה`,
        'success'
      );
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעדכון המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCustomerTierLabel = (tier?: CustomerTier) => {
    switch (tier) {
      case 'new': return 'חדש';
      case 'regular': return 'רגיל';
      case 'vip': return 'VIP';
      case 'banned': return 'חסום';
      default: return 'לא ידוע';
    }
  };

  const getCustomerTierColor = (tier?: CustomerTier) => {
    switch (tier) {
      case 'new': return colors.interactive.primary;
      case 'regular': return colors.status.success;
      case 'vip': return colors.gold;
      case 'banned': return colors.status.error;
      default: return colors.text.secondary;
    }
  };

  const getKycStatusLabel = (status?: string) => {
    switch (status) {
      case 'none': return 'לא מאומת';
      case 'pending': return 'ממתין לאימות';
      case 'verified': return 'מאומת';
      case 'rejected': return 'נדחה';
      default: return 'לא ידוע';
    }
  };

  const getKycStatusColor = (status?: string) => {
    switch (status) {
      case 'none': return colors.text.secondary;
      case 'pending': return colors.status.warning;
      case 'verified': return colors.status.success;
      case 'rejected': return colors.status.error;
      default: return colors.text.secondary;
    }
  };

  const clearFilters = () => {
    setFilterRole(null);
    setFilterTier(null);
    setFilterKyc(null);
    setShowFilterModal(false);
  };

  const renderUserCard = (user: UserType) => (
    <TouchableOpacity 
      key={user.id}
      style={[styles.userCard, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary,
        borderLeftColor: getCustomerTierColor(user.customerTier),
        borderLeftWidth: 4
      }]}
      onPress={() => openEditModal(user)}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{user.displayName}</Text>
          <Text style={[styles.userUsername, { color: colors.text.secondary }]}>@{user.username}</Text>
        </View>
        
        <View style={styles.userBadges}>
          {user.role === 'admin' && (
            <View style={[styles.roleBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.roleBadgeText, { color: colors.text.inverse }]}>מנהל</Text>
            </View>
          )}
          {user.role === 'driver' && (
            <View style={[styles.roleBadge, { backgroundColor: colors.status.info }]}>
              <Text style={[styles.roleBadgeText, { color: colors.text.inverse }]}>נהג</Text>
            </View>
          )}
          
          <View style={[styles.tierBadge, { backgroundColor: getCustomerTierColor(user.customerTier) }]}>
            <Text style={[styles.tierBadgeText, { color: colors.text.inverse }]}>
              {getCustomerTierLabel(user.customerTier)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        <View style={styles.userDetailRow}>
          <Mail size={14} color={colors.text.secondary} />
          <Text style={[styles.userDetailText, { color: colors.text.secondary }]}>{user.email || 'אין אימייל'}</Text>
        </View>
        
        <View style={styles.userDetailRow}>
          <Calendar size={14} color={colors.text.secondary} />
          <Text style={[styles.userDetailText, { color: colors.text.secondary }]}>
            הצטרף: {formatDate(user.createdAt)}
          </Text>
        </View>
        
        <View style={styles.userDetailRow}>
          <Shield size={14} color={getKycStatusColor(user.kycStatus)} />
          <Text style={[styles.userDetailText, { color: getKycStatusColor(user.kycStatus) }]}>
            KYC: {getKycStatusLabel(user.kycStatus)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>ניהול משתמשים</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>טוען משתמשים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>ניהול משתמשים</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={[styles.searchContainer, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        }]}>
          <Search size={20} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="חיפוש משתמשים..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
            textAlign="right"
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filterRole || filterTier || filterKyc) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={[styles.activeFiltersTitle, { color: colors.text.secondary }]}>מסננים פעילים:</Text>
          <View style={styles.activeFiltersList}>
            {filterRole && (
              <View style={[styles.activeFilterChip, { backgroundColor: colors.interactive.secondary }]}>
                <Text style={[styles.activeFilterText, { color: colors.text.primary }]}>
                  תפקיד: {filterRole === 'admin' ? 'מנהל' : filterRole === 'driver' ? 'נהג' : 'משתמש'}
                </Text>
                <TouchableOpacity onPress={() => setFilterRole(null)}>
                  <X size={14} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            {filterTier && (
              <View style={[styles.activeFilterChip, { backgroundColor: colors.interactive.secondary }]}>
                <Text style={[styles.activeFilterText, { color: colors.text.primary }]}>
                  דרגה: {getCustomerTierLabel(filterTier as CustomerTier)}
                </Text>
                <TouchableOpacity onPress={() => setFilterTier(null)}>
                  <X size={14} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            {filterKyc && (
              <View style={[styles.activeFilterChip, { backgroundColor: colors.interactive.secondary }]}>
                <Text style={[styles.activeFilterText, { color: colors.text.primary }]}>
                  KYC: {getKycStatusLabel(filterKyc)}
                </Text>
                <TouchableOpacity onPress={() => setFilterKyc(null)}>
                  <X size={14} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.clearFiltersButton, { borderColor: colors.border.primary }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearFiltersText, { color: colors.text.secondary }]}>נקה הכל</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>{users.length}</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>סה"כ משתמשים</Text>
          </View>
          
          <View style={[styles.statCard, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>
              {users.filter(u => u.role === 'admin').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>מנהלים</Text>
          </View>
          <View style={[styles.statCard, {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary
          }]}>
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>
              {users.filter(u => u.role === 'driver').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>נהגים</Text>
          </View>

          <View style={[styles.statCard, {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Text style={[styles.statNumber, { color: colors.text.primary }]}>
              {users.filter(u => u.kycStatus === 'verified').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>מאומתים</Text>
          </View>
        </View>

        <View style={styles.usersList}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(renderUserCard)
          ) : (
            <View style={styles.emptyContainer}>
              <User size={80} color={colors.interactive.disabled} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>לא נמצאו משתמשים</Text>
              <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
                נסה לשנות את הגדרות החיפוש או הסינון
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { 
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>עריכת משתמש</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalContent}>
                <Text style={[styles.userDetailTitle, { color: colors.text.primary }]}>פרטי משתמש</Text>
                
                <View style={[styles.userDetailItem, { borderBottomColor: colors.border.secondary }]}>
                  <Text style={[styles.userDetailLabel, { color: colors.text.secondary }]}>שם מלא:</Text>
                  <Text style={[styles.userDetailValue, { color: colors.text.primary }]}>{selectedUser.displayName}</Text>
                </View>
                
                <View style={[styles.userDetailItem, { borderBottomColor: colors.border.secondary }]}>
                  <Text style={[styles.userDetailLabel, { color: colors.text.secondary }]}>שם משתמש:</Text>
                  <Text style={[styles.userDetailValue, { color: colors.text.primary }]}>@{selectedUser.username}</Text>
                </View>
                
                <View style={[styles.userDetailItem, { borderBottomColor: colors.border.secondary }]}>
                  <Text style={[styles.userDetailLabel, { color: colors.text.secondary }]}>אימייל:</Text>
                  <Text style={[styles.userDetailValue, { color: colors.text.primary }]}>{selectedUser.email || 'לא זמין'}</Text>
                </View>
                
                <View style={[styles.userDetailItem, { borderBottomColor: colors.border.secondary }]}>
                  <Text style={[styles.userDetailLabel, { color: colors.text.secondary }]}>תאריך הצטרפות:</Text>
                  <Text style={[styles.userDetailValue, { color: colors.text.primary }]}>{formatDate(selectedUser.createdAt)}</Text>
                </View>
                
                <View style={[styles.userDetailItem, { borderBottomColor: colors.border.secondary }]}>
                  <Text style={[styles.userDetailLabel, { color: colors.text.secondary }]}>סטטוס KYC:</Text>
                  <Text style={[styles.userDetailValue, { color: getKycStatusColor(selectedUser.kycStatus) }]}>
                    {getKycStatusLabel(selectedUser.kycStatus)}
                  </Text>
                </View>

                <Text style={[styles.userDetailTitle, { color: colors.text.primary, marginTop: 24 }]}>הגדרות תפקיד</Text>
                
                <View style={styles.dropdownContainer}>
                  <Text style={[styles.dropdownLabel, { color: colors.text.primary }]}>תפקיד:</Text>
                  <TouchableOpacity 
                    style={[styles.dropdown, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}
                    onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text.primary }]}>
                      {editedRole === 'admin' ? 'מנהל' : editedRole === 'driver' ? 'נהג' : 'משתמש רגיל'}
                    </Text>
                    <ChevronDown size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                  
                  {showRoleDropdown && (
                    <View style={[styles.dropdownMenu, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          editedRole === 'user' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedRole('user');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>משתמש רגיל</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          editedRole === 'driver' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedRole('driver');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>נהג</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          editedRole === 'admin' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedRole('admin');
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>מנהל</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={[styles.userDetailTitle, { color: colors.text.primary, marginTop: 24 }]}>הגדרות לקוח</Text>
                
                <View style={styles.dropdownContainer}>
                  <Text style={[styles.dropdownLabel, { color: colors.text.primary }]}>דרגת לקוח:</Text>
                  <TouchableOpacity 
                    style={[styles.dropdown, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}
                    onPress={() => setShowTierDropdown(!showTierDropdown)}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text.primary }]}>
                      {getCustomerTierLabel(editedTier)}
                    </Text>
                    <ChevronDown size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                  
                  {showTierDropdown && (
                    <View style={[styles.dropdownMenu, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          editedTier === 'new' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedTier('new');
                          setShowTierDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>חדש</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          editedTier === 'regular' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedTier('regular');
                          setShowTierDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>רגיל</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          editedTier === 'vip' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedTier('vip');
                          setShowTierDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>VIP</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          editedTier === 'banned' && { backgroundColor: colors.interactive.secondary }
                        ]}
                        onPress={() => {
                          setEditedTier('banned');
                          setShowTierDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>חסום</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.gold }]}
                  onPress={saveUserChanges}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.text.inverse} />
                  ) : (
                    <>
                      <Save size={20} color={colors.text.inverse} />
                      <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור שינויים</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.filterModalContainer, { 
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>סינון משתמשים</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent}>
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>סינון לפי תפקיד</Text>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterRole === null && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterRole(null)}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>הכל</Text>
                  {filterRole === null && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterRole === 'user' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterRole('user')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>משתמשים רגילים</Text>
                  {filterRole === 'user' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterRole === 'driver' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterRole('driver')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>נהגים</Text>
                  {filterRole === 'driver' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterRole === 'admin' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterRole('admin')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>מנהלים</Text>
                  {filterRole === 'admin' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>סינון לפי דרגת לקוח</Text>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterTier === null && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterTier(null)}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>הכל</Text>
                  {filterTier === null && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterTier === 'new' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterTier('new')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>חדש</Text>
                  {filterTier === 'new' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterTier === 'regular' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterTier('regular')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>רגיל</Text>
                  {filterTier === 'regular' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterTier === 'vip' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterTier('vip')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>VIP</Text>
                  {filterTier === 'vip' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterTier === 'banned' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterTier('banned')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>חסום</Text>
                  {filterTier === 'banned' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>סינון לפי סטטוס KYC</Text>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterKyc === null && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterKyc(null)}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>הכל</Text>
                  {filterKyc === null && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterKyc === 'none' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterKyc('none')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>לא מאומת</Text>
                  {filterKyc === 'none' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterKyc === 'pending' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterKyc('pending')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>ממתין לאימות</Text>
                  {filterKyc === 'pending' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterKyc === 'verified' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterKyc('verified')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>מאומת</Text>
                  {filterKyc === 'verified' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border.secondary },
                    filterKyc === 'rejected' && { backgroundColor: colors.interactive.secondary }
                  ]}
                  onPress={() => setFilterKyc('rejected')}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>נדחה</Text>
                  {filterKyc === 'rejected' && <View style={[styles.filterSelectedDot, { backgroundColor: colors.gold }]} />}
                </TouchableOpacity>
              </View>

              <View style={styles.filterActions}>
                <TouchableOpacity 
                  style={[styles.clearFiltersBtn, { 
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary
                  }]}
                  onPress={clearFilters}
                >
                  <Text style={[styles.clearFiltersBtnText, { color: colors.text.primary }]}>נקה מסננים</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.applyFiltersBtn, { backgroundColor: colors.gold }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.applyFiltersBtnText, { color: colors.text.inverse }]}>החל מסננים</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'right',
  },
  userUsername: {
    fontSize: 12,
    textAlign: 'right',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  userDetails: {
    gap: 6,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  userDetailText: {
    fontSize: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
  },
  filterModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  filterModalContent: {
    padding: 16,
  },
  userDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  userDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userDetailLabel: {
    fontSize: 14,
  },
  userDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    textAlign: 'right',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
    textAlign: 'right',
  },
  filterSelectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  clearFiltersBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearFiltersBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyFiltersBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});