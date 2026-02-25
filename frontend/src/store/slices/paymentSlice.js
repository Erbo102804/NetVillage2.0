import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { paymentsAPI } from '../../api/endpoints'

export const fetchPaymentHistory = createAsyncThunk('payment/fetchHistory', async (_, { rejectWithValue }) => {
  try {
    const { data } = await paymentsAPI.getHistory()
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка загрузки истории')
  }
})

export const createPayment = createAsyncThunk('payment/create', async (periodMonths, { rejectWithValue }) => {
  try {
    const { data } = await paymentsAPI.create({ period_months: periodMonths })
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка создания платежа')
  }
})

export const checkPaymentStatus = createAsyncThunk('payment/checkStatus', async (paymentId, { rejectWithValue }) => {
  try {
    const { data } = await paymentsAPI.getStatus(paymentId)
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка проверки статуса')
  }
})

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    history: [],
    currentPayment: null,
    loading: false,
    creating: false,
    error: null,
  },
  reducers: {
    clearCurrentPayment: (state) => { state.currentPayment = null },
    updatePaymentStatus: (state, action) => {
      if (state.currentPayment?.id === action.payload.payment_id) {
        state.currentPayment.status = action.payload.status
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentHistory.pending, (state) => { state.loading = true })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.loading = false
        state.history = action.payload
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createPayment.pending, (state) => { state.creating = true; state.error = null })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.creating = false
        state.currentPayment = action.payload.payment
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload
        }
      })
  },
})

export const { clearCurrentPayment, updatePaymentStatus } = paymentSlice.actions
export default paymentSlice.reducer
