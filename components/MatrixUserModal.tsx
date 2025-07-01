import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, UserPlus, User } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface MatrixUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (displayName: string) => void;
  username: string;
  loading: boolean;
}

export default function MatrixUserModal({
  visible,
  onClose,
  onSubmit,
  username,
  loading
}: MatrixUserModalProps) {
  const [displayName, setDisplayName] = useState('');
  const { colors } = useTheme();

  const handleSubmit = () => {
    if (!displayName.trim()) {
      setDisplayName(username); // Use username as display name if not provided
    }
    
    onSubmit(displayName || username);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: colors.surface.elevated }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              השלם את הפרופיל שלך
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: colors.interactive.secondary }]}>
                <UserPlus size={40} color={colors.gold} />
              </View>
            </View>
            
            <Text style={[styles.welcomeText, { color: colors.text.primary }]}>
              ברוך הבא, {username}!
            </Text>
            
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              מצאנו את חשבון המטריקס הקיים שלך. אנא ספק פרטים נוספים להשלמת הפרופיל שלך במערכת.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>
                <User size={16} color={colors.text.primary} style={styles.inputIcon} /> שם מלא
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.border.primary,
                    color: colors.text.primary
                  }
                ]}
                placeholder="הכנס את שמך המלא"
                placeholderTextColor={colors.text.tertiary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                textAlign="right"
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.gold },
                loading && { opacity: 0.7 }
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.text.inverse }]}>
                  השלם פרופיל
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border.primary }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>
                ביטול
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalContent: {
    padding: 20
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'right'
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500'
  }
});