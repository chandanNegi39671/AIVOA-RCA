import { createSlice } from '@reduxjs/toolkit';

/**
 * AI extraction slice.
 * Tracks the status of AI extraction requests.
 * When backend is connected, the real LangGraph/Groq response populates `extraction`.
 * In offline/demo mode, extraction is simulated client-side with placeholder logic.
 */
const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    status: 'idle', // 'idle' | 'loading' | 'done' | 'error'
    extraction: null,
    error: null,
    backendAvailable: false, // Updated to true when API health check succeeds
  },
  reducers: {
    aiExtractionStart(state) {
      state.status = 'loading';
      state.extraction = null;
      state.error = null;
    },
    aiExtractionSuccess(state, action) {
      state.status = 'done';
      state.extraction = action.payload;
    },
    aiExtractionError(state, action) {
      state.status = 'error';
      state.error = action.payload;
    },
    aiExtractionReset(state) {
      state.status = 'idle';
      state.extraction = null;
      state.error = null;
    },
    setBackendAvailable(state, action) {
      state.backendAvailable = action.payload;
    },
  },
});

export const {
  aiExtractionStart,
  aiExtractionSuccess,
  aiExtractionError,
  aiExtractionReset,
  setBackendAvailable,
} = aiSlice.actions;

export const selectAiStatus = state => state.ai.status;
export const selectAiExtraction = state => state.ai.extraction;
export const selectAiError = state => state.ai.error;
export const selectBackendAvailable = state => state.ai.backendAvailable;

export default aiSlice.reducer;
