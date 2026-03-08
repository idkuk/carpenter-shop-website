import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaTachometerAlt, FaShoppingCart, FaHistory,
  FaUserCircle, FaBell, FaCalendarAlt,
  FaChartLine, FaCog, FaBox, FaClock,
  FaCheckCircle, FaExclamationTriangle, FaSpinner
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';
import './Dashboard.css';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading, fetchOrders } = useOrders();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const data = await notificationService.getNotifications({ limit: 10 });
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load notifications');
      } finally {
        setNotificationsLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `Rs ${amount.toLocaleString()}`;
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [orders]);

  const activeOrders = useMemo(() => {
    const statusProgress = {
      pending: 10,
      confirmed: 25,
      in_progress: 60,
      completed: 100,
      delivered: 100,
      cancelled: 0
    };

    return sortedOrders
      .filter((order) => !['completed', 'delivered', 'cancelled'].includes(order.status))
      .slice(0, 3)
      .map((order) => ({
        ...order,
        progress: statusProgress[order.status] || 0
      }));
  }, [sortedOrders]);

  const recentActivity = useMemo(() => {
    return sortedOrders.slice(0, 4).map((order, index) => ({
      id: order._id || index,
      action: `Status updated to ${order.status}`,
      item: order.title,
      time: new Date(order.updatedAt || order.createdAt).toLocaleDateString()
    }));
  }, [sortedOrders]);

  const unreadCount = useMemo(() => {
    return notifications.filter((note) => !note.readAt).length;
  }, [notifications]);

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

  const upcomingDeadlines = useMemo(() => {
    return sortedOrders
      .filter((order) => order.deadline && !['completed', 'delivered', 'cancelled'].includes(order.status))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 2);
  }, [sortedOrders]);

  const userStats = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => ['completed', 'delivered'].includes(o.status)).length;
    const pendingOrders = orders.filter((o) => !['completed', 'delivered', 'cancelled'].includes(o.status)).length;
    const totalSpent = orders
      .filter((o) => ['completed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (o.budget || 0), 0);

    return { totalOrders, completedOrders, pendingOrders, totalSpent };
  }, [orders]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCheckCircle className="status-icon completed" />;
      case 'in_progress': return <FaSpinner className="status-icon in-progress" />;
      case 'pending': return <FaClock className="status-icon pending" />;
      default: return <FaExclamationTriangle className="status-icon" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1><FaTachometerAlt className="header-icon" /> Dashboard</h1>
          <p>Welcome back{user?.name ? `, ${user.name}` : ''}! Here's what's happening with your furniture orders.</p>
        </div>

        <div className="header-actions">
          <button className="btn-notification">
            <FaBell />
            <span className="notification-count">{unreadCount}</span>
          </button>
          <div className="user-profile">
            <FaUserCircle className="profile-icon" />
            <div className="profile-info">
              <span className="profile-name">{user?.name || 'Customer'}</span>
              <span className="profile-role">Customer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)' }}>
            <FaShoppingCart style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="stat-content">
            <h3>{userStats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>
            <FaCheckCircle style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-content">
            <h3>{userStats.completedOrders}</h3>
            <p>Completed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>
            <FaClock style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-content">
            <h3>{userStats.pendingOrders}</h3>
            <p>Pending</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--muted-bg)' }}>
            <FaChartLine style={{ color: 'var(--brand-secondary)' }} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(userStats.totalSpent)}</h3>
            <p>Total Spent</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2><FaBox className="section-icon" /> Active Orders</h2>
            <Link to="/orders" className="view-all">View All &rarr;</Link>
          </div>

          {loading ? (
            <div className="loading">Loading orders...</div>
          ) : activeOrders.length === 0 ? (
            <div className="no-orders">
              <p>No active orders yet. Start by placing a new order.</p>
            </div>
          ) : (
            <div className="orders-grid">
              {activeOrders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <h3>{order.title}</h3>
                    <div className="order-status">
                      {getStatusIcon(order.status)}
                      <span className={`status-text ${order.status}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="order-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${order.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{order.progress}% Complete</span>
                  </div>

                  <div className="order-details">
                    <div className="detail-row">
                      <span className="detail-label">Assigned Team:</span>
                      <span className="detail-value">Shop Team</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expected Completion:</span>
                      <span className="detail-value">
                        {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'To be confirmed'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Update:</span>
                      <span className="detail-value">
                        {new Date(order.updatedAt || order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button className="btn-track" onClick={() => navigate(`/orders/${order._id}`)}>Track Order</button>
                    <button className="btn-message" onClick={() => toast.info('Messaging coming soon')}>Message Carpenter</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <div className="activity-section" ref={notificationsRef}>
            <h3><FaBell className="section-icon" /> Notifications</h3>
            <div className="activity-list">
              {notificationsLoading ? (
                <p>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p>No notifications yet.</p>
              ) : (
                notifications.map((note) => (
                  <div
                    key={note._id}
                    className={`activity-item notification-item ${note.readAt ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(note)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleNotificationClick(note);
                      }
                    }}
                  >
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <p className="activity-action">{note.title || 'Order update'}</p>
                      <p className="activity-item">{note.message}</p>
                      <span className="activity-time">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="activity-section">
            <h3><FaHistory className="section-icon" /> Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.length === 0 ? (
                <p>No recent activity yet.</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <p className="activity-action">{activity.action}</p>
                      <p className="activity-item">{activity.item}</p>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="quick-actions">
            <h3><FaCog className="section-icon" /> Quick Actions</h3>
            <div className="action-buttons">
              <Link to="/services" className="action-btn">
                <FaShoppingCart />
                <span>Browse Services</span>
              </Link>
              <Link to="/orders/new" className="action-btn">
                <FaBox />
                <span>Place New Order</span>
              </Link>
              <button className="action-btn" onClick={() => toast.info('Scheduling coming soon')}>
                <FaCalendarAlt />
                <span>Schedule Visit</span>
              </button>
              <button className="action-btn" onClick={() => toast.info('Reports coming soon')}>
                <FaChartLine />
                <span>View Reports</span>
              </button>
            </div>
          </div>

          <div className="deadlines-section">
            <h3>Upcoming Deadlines</h3>
            {upcomingDeadlines.length === 0 ? (
              <p>No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((order) => (
                <div key={order._id} className="deadline-item">
                  <div className="deadline-date">
                    {new Date(order.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="deadline-content">
                    <p>{order.title}</p>
                    <span>Due {new Date(order.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
