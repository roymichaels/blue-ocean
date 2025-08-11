const React = require('react');

const View = ({ children, style }) => React.createElement('View', { style }, children);
const Text = ({ children, style }) => React.createElement('Text', { style }, children);
const ScrollView = ({ children, style, contentContainerStyle }) =>
  React.createElement('ScrollView', { style, contentContainerStyle }, children);
const TouchableOpacity = ({ children, onPress, style }) =>
  React.createElement('TouchableOpacity', { onPress, style }, children);
const TextInput = ({ value, onChangeText, placeholder, style, testID }) =>
  React.createElement('TextInput', { value, onChangeText, placeholder, style, testID });
const StyleSheet = { create: (s) => s };

module.exports = { Platform: { OS: 'ios' }, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet };
