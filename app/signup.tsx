import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { spacing } from '@/ui/tokens';
import { Form, Field, Label, HelperText } from '@/ui/form';
import TextField from '@/ui/primitives/TextField';
import Button from '@/ui/primitives/Button';
import { validateAll } from '@/utils/validation';

export default function SignupScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const newErrors = validateAll({
      username: { value: values.username, rules: { required: t('auth.username') + ' required' } },
      email: {
        value: values.email,
        rules: {
          required: t('auth.email') + ' required',
          pattern: { value: /\S+@\S+\.\S+/, message: t('auth.email') + ' invalid' },
        },
      },
      password: { value: values.password, rules: { required: t('auth.password') + ' required' } },
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // TODO: integrate signup logic
    }
  };

  return (
    <View style={{ flex: 1, padding: spacing.spacer16, backgroundColor: colors.canvas }}>
      <Form>
        <Field>
          <Label>{t('auth.username')}</Label>
          <TextField
            value={values.username}
            onChangeText={(text) => handleChange('username', text)}
            placeholder={t('auth.usernamePlaceholder')}
          />
          {errors.username && <HelperText error>{errors.username}</HelperText>}
        </Field>
        <Field>
          <Label>{t('auth.email')}</Label>
          <TextField
            value={values.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder={t('auth.email')}
          />
          {errors.email && <HelperText error>{errors.email}</HelperText>}
        </Field>
        <Field>
          <Label>{t('auth.password')}</Label>
          <TextField
            value={values.password}
            onChangeText={(text) => handleChange('password', text)}
            placeholder={t('auth.createPasswordPlaceholder')}
            secureTextEntry
          />
          {errors.password && <HelperText error>{errors.password}</HelperText>}
        </Field>
        <Button title={t('auth.signup')} onPress={handleSubmit} />
      </Form>
    </View>
  );
}
