import React, { createContext, useState, useContext, useCallback } from 'react';
import { orderService } from '../services/api';

const OrderContext = createContext({});

export const useOrders = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getAllOrders(params);
      const data = response.data || response.orders || response;
      setOrders(Array.isArray(data) ? data : []);
      return { success: true, data: response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.createOrder(orderData);
      const createdOrder = response.order || response.data || response;
      if (createdOrder) {
        setOrders((prev) => [createdOrder, ...prev]);
      }
      return { success: true, data: response };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (id, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.updateOrder(id, updateData);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await orderService.deleteOrder(id);
      setOrders((prev) => prev.filter((order) => order._id !== id));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = async (id) => {
    try {
      const response = await orderService.getOrderById(id);
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      const response = await orderService.updateOrderStatus(id, status);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const requestCancellation = async (id, reason) => {
    try {
      const response = await orderService.requestCancellation(id, reason);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const approveCancellation = async (id, note) => {
    try {
      const response = await orderService.approveCancellation(id, note);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const rejectCancellation = async (id, note) => {
    try {
      const response = await orderService.rejectCancellation(id, note);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const cancelOrder = async (id) => {
    try {
      const response = await orderService.cancelOrder(id);
      const updatedOrder = response.order || response.data || response;
      setOrders((prev) => prev.map((order) =>
        order._id === id ? updatedOrder : order
      ));
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const value = {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    updateOrderStatus,
    requestCancellation,
    approveCancellation,
    rejectCancellation,
    cancelOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
