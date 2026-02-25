import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import paymentReducer from './slices/paymentSlice'
import adminReducer from './slices/adminSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    payment: paymentReducer,
    admin: adminReducer,
  },
})
