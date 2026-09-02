// src/lib/notificationApi.ts

import {
  apiFetch,
  extractResults,
  normalizeNotification,
} from "./api";

// Get all notifications
export const getNotifications = async () => {
  const response = await apiFetch<any>("/notifications/");

  return extractResults(response).map(
    normalizeNotification
  );
};

// Get unread notifications
export const getUnreadNotifications = async () => {
  const response = await apiFetch<any>(
    "/notifications/unread/"
  );

  return extractResults(response).map(
    normalizeNotification
  );
};

// Get recent notifications
export const getRecentNotifications = async () => {
  const response = await apiFetch<any>(
    "/notifications/recent/"
  );

  return extractResults(response).map(
    normalizeNotification
  );
};

// Get unread notification count
export const getNotificationCount = async () => {
  return apiFetch<any>(
    "/notifications/count/"
  );
};

// Mark one notification as read
export const markNotificationAsRead = async (
  id: number | string
) => {
  return apiFetch(
    `/notifications/${id}/read/`,
    {
      method: "PATCH",
    }
  );
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  return apiFetch(
    "/notifications/mark-all-read/",
    {
      method: "PATCH",
    }
  );
};

// Delete one notification
export const deleteNotification = async (
  id: number | string
) => {
  return apiFetch(
    `/notifications/${id}/`,
    {
      method: "DELETE",
    }
  );
};

// Delete all notifications
export const clearAllNotifications = async () => {
  return apiFetch(
    "/notifications/clear-all/",
    {
      method: "DELETE",
    }
  );
};