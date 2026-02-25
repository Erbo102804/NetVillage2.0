import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '../../api/endpoints'

export const login = createAsyncThunk('auth/login', async ({ phone, password }, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(phone, password)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    return data.user
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка входа')
  }
})

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.getProfile()
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Ошибка загрузки профиля')
  }
})

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refresh = localStorage.getItem('refresh_token')
  try {
    await authAPI.logout(refresh)
  } catch {}
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
    setUser: (state, action) => { state.user = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer
