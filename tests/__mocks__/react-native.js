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

const FlatList = ({
  data = [],
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  style,
  contentContainerStyle,
}) => {
  const children = [];
  if (ListHeaderComponent) {
    children.push(
      typeof ListHeaderComponent === 'function'
        ? ListHeaderComponent()
        : ListHeaderComponent
    );
  }
  if (data && renderItem) {
    data.forEach((item, index) => {
      const element = renderItem({ item, index });
      children.push(
        React.cloneElement(element, {
          key: keyExtractor ? keyExtractor(item, index) : String(index),
        })
      );
    });
  }
  if (data.length === 0 && ListEmptyComponent) {
    children.push(
      typeof ListEmptyComponent === 'function'
        ? ListEmptyComponent()
        : ListEmptyComponent
    );
  }
  return React.createElement('FlatList', { style, contentContainerStyle }, children);
};

const I18nManager = { isRTL: false };

module.exports = {
  Platform: { OS: 'ios' },
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  I18nManager,
};
