import { configureStore } from '@reduxjs/toolkit';
import investigationsReducer from './investigationsSlice';
import uiReducer from './uiSlice';
import aiReducer from './aiSlice';

export const store = configureStore({
  reducer: {
    investigations: investigationsReducer,
    ui: uiReducer,
    ai: aiReducer,
  },
});
