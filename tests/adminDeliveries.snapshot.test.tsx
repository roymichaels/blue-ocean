import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AdminDeliveriesScreen from '@/app/store/[storeId]/admin/_DeliveriesScreen';

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/services', () => ({
  useAppRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      text: { primary: '#111111', secondary: '#666666', inverse: '#ffffff' },
      border: { primary: '#222222' },
      surface: { primary: '#f5f5f5' },
      interactive: { secondary: '#eeeeee' },
      gold: '#daa520',
    },
  }),
}));

const mockDatabase = {
  getAllDeliveryJobs: jest.fn(),
  getAllUserProfiles: jest.fn(),
  createDeliveryJob: jest.fn(),
  updateDeliveryJobStatus: jest.fn(),
};

jest.mock('@/services/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockDatabase,
  },
}));

jest.mock('@/components/FullScreenMediaViewer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/SmartImage', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AdminDeliveriesScreen snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabase.getAllDeliveryJobs.mockResolvedValue([
      {
        id: 'job-1',
        orderId: 'order-123456',
        driverId: 'driver-1',
        status: 'pending',
      },
    ]);
    mockDatabase.getAllUserProfiles.mockResolvedValue([
      { id: 'driver-1', displayName: 'Driver One', role: 'driver' },
    ]);
    mockDatabase.createDeliveryJob.mockResolvedValue(undefined);
    mockDatabase.updateDeliveryJobStatus.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ isStoreOwner: true });
  });

  it('renders delivery jobs without chat control', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<AdminDeliveriesScreen />);
    });
    await act(async () => Promise.resolve());
    expect(root!.toJSON()).toMatchSnapshot();
  });
});
