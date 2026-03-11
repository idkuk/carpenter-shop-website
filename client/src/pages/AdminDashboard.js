import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaTachometerAlt, FaUsers, FaBox, FaChartBar,
  FaShoppingCart, FaMoneyBillWave, FaCalendarAlt,
  FaExclamationTriangle, FaCheckCircle, FaClock,
  FaUserTie, FaCog, FaBell, FaSearch,
  FaArrowUp, FaArrowDown, FaEye, FaEdit, FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { orderService, inventoryService, reportService, notificationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    lowStockItems: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [stats, orders, lowStock, customers] = await Promise.all([
          reportService.getDashboardStats(),
          orderService.getAllOrders({ limit: 5 }),
          inventoryService.getLowStockItems(),
          reportService.getCustomerReport()
        ]);

        setDashboardStats({
          totalOrders: stats.totalOrders || 0,
          pendingOrders: stats.pendingOrders || 0,
          completedOrders: stats.completedOrders || 0,
          totalRevenue: stats.totalRevenue || 0,
          activeCustomers: stats.activeCustomers || 0,
          lowStockItems: stats.lowStockItems || 0
        });

        setRecentOrders(Array.isArray(orders) ? orders.slice(0, 5) : []);
        setLowStockItems(Array.isArray(lowStock) ? lowStock : []);
        setTopCustomers(Array.isArray(customers) ? customers : []);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const data = await notificationService.getNotifications({ limit: 5 });
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load notifications');
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((note) =>
          note._id === id ? { ...note, readAt: new Date().toISOString() } : note
        )
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const getNotificationOrderId = (note) => {
    if (!note?.orderId) return null;
    if (typeof note.orderId === 'string') return note.orderId;
    if (typeof note.orderId === 'object' && note.orderId._id) return note.orderId._id;
    return null;
  };

  const handleNotificationClick = async (note) => {
    if (!note.readAt) {
      await markNotificationRead(note._id);
    }

    const orderId = getNotificationOrderId(note);
    if (orderId) {
      navigate(`/orders/${orderId}`);
      return;
    }

    navigate('/orders');
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `Rs ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'var(--warning)', bg: 'var(--warning-bg)', text: 'Pending' },
      in_progress: { color: 'var(--brand-primary)', bg: 'var(--info-bg)', text: 'In Progress' },
      completed: { color: 'var(--success)', bg: 'var(--success-bg)', text: 'Completed' },
      cancelled: { color: 'var(--danger)', bg: 'var(--danger-bg)', text: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className="status-badge" style={{
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.text}
      </span>
    );
  };

  const getStockStatus = (current, min) => {
    if (!min) return { color: 'var(--success)', text: 'Adequate' };
    const percentage = (current / min) * 100;
    if (percentage <= 20) return { color: 'var(--danger)', text: 'Critical' };
    if (percentage <= 50) return { color: 'var(--warning)', text: 'Low' };
    return { color: 'var(--success)', text: 'Adequate' };
  };

  const getNotificationIcon = (note) => {
    if (note.title?.toLowerCase().includes('cancel')) return <FaExclamationTriangle />;
    if (note.type === 'order_status') return <FaCheckCircle />;
    return <FaShoppingCart />;
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-left">
          <h1><FaTachometerAlt /> Admin Dashboard</h1>
          <p>Manage your WoodWork Hub operations</p>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Search orders, customers..." />
          </div>
          <button className="btn-primary" onClick={() => toast.info('Report generation coming soon')}>
            <FaChartBar /> Generate Report
          </button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon revenue">
            <FaMoneyBillWave />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(dashboardStats.totalRevenue)}</h3>
            <p>Total Revenue</p>
            <span className="stat-change positive">
              <FaArrowUp /> Updated
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders">
            <FaShoppingCart />
          </div>
          <div className="stat-info">
            <h3>{dashboardStats.totalOrders}</h3>
            <p>Total Orders</p>
            <span className="stat-change positive">
              <FaArrowUp /> Updated
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <FaClock />
          </div>
          <div className="stat-info">
            <h3>{dashboardStats.pendingOrders}</h3>
            <p>Pending Orders</p>
            <span className="stat-change negative">
              <FaArrowDown /> Updated
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon customers">
            <FaUsers />
          </div>
          <div className="stat-info">
            <h3>{dashboardStats.activeCustomers}</h3>
            <p>Active Customers</p>
            <span className="stat-change positive">
              <FaArrowUp /> Updated
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-left">
          <div className="card">
            <div className="card-header">
              <h3><FaShoppingCart /> Recent Orders</h3>
              <Link to="/orders" className="view-all">View All</Link>
            </div>
            <div className="table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7">Loading orders...</td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7">No recent orders</td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order._id}>
                        <td>#{order._id?.substring(0, 6)}</td>
                        <td>{order.customerId?.name || 'Customer'}</td>
                        <td>{order.title}</td>
                        <td className="amount">{formatCurrency(order.budget)}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="actions">
                          <button className="action-btn view" title="View" onClick={() => navigate(`/orders/${order._id}`)}>
                            <FaEye />
                          </button>
                          <button className="action-btn edit" title="Edit" onClick={() => toast.info('Edit coming soon')}>
                            <FaEdit />
                          </button>
                          <button className="action-btn delete" title="Delete" onClick={() => toast.info('Delete from Orders page')}>
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><FaExclamationTriangle /> Low Stock Alert</h3>
              <span className="alert-count">{dashboardStats.lowStockItems} items</span>
            </div>
            <div className="stock-list">
              {loading ? (
                <p>Loading inventory...</p>
              ) : lowStockItems.length === 0 ? (
                <p>No low stock items</p>
              ) : (
                lowStockItems.map((item) => {
                  const status = getStockStatus(item.quantity, item.reorderLevel);
                  return (
                    <div key={item._id} className="stock-item">
                      <div className="stock-info">
                        <h4>{item.itemName}</h4>
                        <p>Current: {item.quantity} {item.unit} | Minimum: {item.reorderLevel} {item.unit}</p>
                      </div>
                      <div className="stock-status">
                        <span className="status" style={{ color: status.color }}>
                          {status.text}
                        </span>
                        <button className="btn-reorder" onClick={() => toast.info('Reorder flow coming soon')}>Reorder</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="card">
            <div className="card-header">
              <h3><FaUserTie /> Top Customers</h3>
            </div>
            <div className="customers-list">
              {loading ? (
                <p>Loading customers...</p>
              ) : topCustomers.length === 0 ? (
                <p>No customer data available</p>
              ) : (
                topCustomers.map((customer) => (
                  <div key={customer.id} className="customer-item">
                    <div className="customer-avatar">
                      {customer.name?.charAt(0) || 'C'}
                    </div>
                    <div className="customer-info">
                      <h4>{customer.name}</h4>
                      <p>{customer.orders} orders | {formatCurrency(customer.totalSpent)} spent</p>
                      <span className="last-order">Last order: {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <button className="btn-contact" onClick={() => toast.info('Contact feature coming soon')}>Contact</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><FaCog /> Quick Actions</h3>
            </div>
            <div className="quick-actions-grid">
              <Link to="/orders/new" className="action-card">
                <FaShoppingCart />
                <span>Create New Order</span>
              </Link>
              <Link to="/inventory" className="action-card">
                <FaBox />
                <span>Inventory List</span>
              </Link>
              <Link to="/orders" className="action-card">
                <FaUsers />
                <span>Customer Orders</span>
              </Link>
              <Link to={isAdmin ? '/admin/services' : '/services'} className="action-card">
                <FaChartBar />
                <span>{isAdmin ? 'Manage Services' : 'Service Catalog'}</span>
              </Link>
              <Link to="/orders" className="action-card">
                <FaCalendarAlt />
                <span>Production Calendar</span>
              </Link>
              <Link to="/dashboard" className="action-card">
                <FaCog />
                <span>Shop Settings</span>
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><FaBell /> Recent Notifications</h3>
            </div>
            <div className="notifications-list">
              {notificationsLoading ? (
                <p>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p>No notifications yet.</p>
              ) : (
                notifications.map((note) => (
                  <div
                    key={note._id}
                    className={`notification-item ${note.readAt ? '' : 'unread'}`}
                    onClick={() => handleNotificationClick(note)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleNotificationClick(note);
                      }
                    }}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(note)}
                    </div>
                    <div className="notification-content">
                      <p>{note.title || 'Order update'}</p>
                      {note.message && <span>{note.message}</span>}
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
