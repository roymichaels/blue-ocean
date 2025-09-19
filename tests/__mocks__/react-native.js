const React = require('react');

const View = ({ children, style }) => React.createElement('View', { style }, children);
const Text = ({ children, style }) => React.createElement('Text', { style }, children);
const ScrollView = ({ children, style, contentContainerStyle }) =>
  React.createElement('ScrollView', { style, contentContainerStyle }, children);
const TouchableOpacity = ({ children, onPress, style }) =>
  React.createElement('TouchableOpacity', { onPress, style }, children);
const Pressable = ({ children, onPress, style, onKeyDown }) =>
  React.createElement('Pressable', { onPress, style, onKeyDown }, children);
const RefreshControl = ({ refreshing, onRefresh, tintColor }) =>
  React.createElement('RefreshControl', { refreshing, onRefresh, tintColor });
const TextInput = ({ value, onChangeText, placeholder, style, testID }) =>
  React.createElement('TextInput', { value, onChangeText, placeholder, style, testID });
const ActivityIndicator = (props) => React.createElement('ActivityIndicator', props);
const Modal = ({ children, transparent }) => React.createElement('Modal', { transparent }, children);
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

const I18nManager = { isRTL: false, allowRTL: () => {}, forceRTL: () => {} };
const Touchable = { Mixin: {} };
const Dimensions = { get: () => ({ width: 1024, height: 768, scale: 2, fontScale: 2 }) };
const useWindowDimensions = () => Dimensions.get();
const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  addEventListener: (_event, _handler) => ({ remove: () => {} }),
};

module.exports = {
  Platform: { OS: 'ios', select: (obj) => (obj && (obj.ios ?? obj.native ?? obj.default ?? obj.web ?? obj)) },
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  I18nManager,
  Touchable,
  Dimensions,
  useWindowDimensions,
  AccessibilityInfo,
  Animated: {
    View: ({ children, style }) => React.createElement('AnimatedView', { style }, children),
    Value: function (v) { this._v = v; this.setValue = () => {}; },
    spring: () => ({ start: (cb) => cb && cb() }),
  },
};


