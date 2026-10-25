import { createSlice } from '@reduxjs/toolkit';

/**
 * UI state slice — controls navigation, modals, toasts, sidebar.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeNav: 'Overview',
    modalOpen: false,
    workspaceIncidentId: null,
    sidebarOpen: false,
    showSampleData: false,
    search: '',
    filter: 'All incidents',
    toast: null, // { message, type: 'info'|'success'|'error' }
    helpModalOpen: false,
    guideModalOpen: false,
    notificationsOpen: false,
    readNotificationIds: [],
  },
  reducers: {
    setActiveNav(state, action) {
      state.activeNav = action.payload;
      state.workspaceIncidentId = null;
      state.sidebarOpen = false;
    },
    openModal(state) {
      state.modalOpen = true;
    },
    closeModal(state) {
      state.modalOpen = false;
    },
    openWorkspace(state, action) {
      state.workspaceIncidentId = action.payload;
      state.activeNav = 'Investigations';
      state.sidebarOpen = false;
    },
    closeWorkspace(state, action) {
      state.workspaceIncidentId = null;
      state.activeNav = action?.payload || 'Investigations';
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    toggleSampleData(state) {
      state.showSampleData = !state.showSampleData;
    },
    setSearch(state, action) {
      state.search = action.payload;
    },
    setFilter(state, action) {
      state.filter = action.payload;
    },
    showToast(state, action) {
      state.toast = { message: action.payload.message, type: action.payload.type || 'info' };
    },
    clearToast(state) {
      state.toast = null;
    },
    setHelpModalOpen(state, action) {
      state.helpModalOpen = Boolean(action.payload);
    },
    setGuideModalOpen(state, action) {
      state.guideModalOpen = Boolean(action.payload);
    },
    setNotificationsOpen(state, action) {
      state.notificationsOpen = Boolean(action.payload);
    },
    markNotificationRead(state, action) {
      const id = action.payload;
      if (id && !state.readNotificationIds.includes(id)) {
        state.readNotificationIds.push(id);
      }
    },
    markAllNotificationsRead(state, action) {
      const ids = action.payload || [];
      state.readNotificationIds = Array.from(new Set([...state.readNotificationIds, ...ids]));
    },
  },
});

export const {
  setActiveNav,
  openModal,
  closeModal,
  openWorkspace,
  closeWorkspace,
  setSidebarOpen,
  toggleSampleData,
  setSearch,
  setFilter,
  showToast,
  clearToast,
  setHelpModalOpen,
  setGuideModalOpen,
  setNotificationsOpen,
  markNotificationRead,
  markAllNotificationsRead,
} = uiSlice.actions;

// Selectors
export const selectActiveNav = state => state.ui.activeNav;
export const selectModalOpen = state => state.ui.modalOpen;
export const selectWorkspaceIncidentId = state => state.ui.workspaceIncidentId;
export const selectSidebarOpen = state => state.ui.sidebarOpen;
export const selectShowSampleData = state => state.ui.showSampleData;
export const selectSearch = state => state.ui.search;
export const selectFilter = state => state.ui.filter;
export const selectToast = state => state.ui.toast;
export const selectHelpModalOpen = state => state.ui.helpModalOpen;
export const selectGuideModalOpen = state => state.ui.guideModalOpen;
export const selectNotificationsOpen = state => state.ui.notificationsOpen;
export const selectReadNotificationIds = state => state.ui.readNotificationIds;

export default uiSlice.reducer;

