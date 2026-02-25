import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminAPI } from '../../api/endpoints'

export const fetchClients = createAsyncThunk('admin/fetchClients', async (params, { rejectWithValue }) => {
  try {
    const { data } = await adminAPI.getClients(params)
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка загрузки клиентов')
  }
})

export const fetchStatistics = createAsyncThunk('admin/fetchStatistics', async (_, { rejectWithValue }) => {
  try {
    const { data } = await adminAPI.getStatistics()
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка загрузки статистики')
  }
})

export const fetchAdminPayments = createAsyncThunk('admin/fetchPayments', async (_, { rejectWithValue }) => {
  try {
    const { data } = await adminAPI.getPayments()
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка загрузки платежей')
  }
})

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    clients: [],
    statistics: null,
    payments: [],
    loading: false,
    error: null,
  },
  reducers: {
    removeClient: (state, action) => {
      state.clients = state.clients.filter(c => c.id !== action.payload)
    },
    updateClient: (state, action) => {
      const idx = state.clients.findIndex(c => c.id === action.payload.id)
      if (idx !== -1) state.clients[idx] = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => { state.loading = true })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false
        state.clients = action.payload
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload
      })
      .addCase(fetchAdminPayments.fulfilled, (state, action) => {
        state.payments = action.payload
      })
  },
})

export const { removeClient, updateClient } = adminSlice.actions
export default adminSlice.reducer
