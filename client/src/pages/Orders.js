import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaPlus, FaSearch, FaDownload, FaPrint,
  FaCalendarAlt, FaUser, FaTag,
  FaCheckCircle, FaClock, FaExclamationTriangle,
  FaEye, FaEdit, FaTrash, FaBan
} from 'react-icons/fa';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { notificationService } from '../services/api';
import './Orders.css';

const Orders = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const { orders, loading, error, fetchOrders, deleteOrder, updateOrderStatus, approveCancellation, updateOrder } = useOrders();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    budget: '',
    status: 'pending',
    deadline: '',
    completedAt: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const data = await notificationService.getNotifications({ limit: 100 });
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load notifications');
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, sortBy]);

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `Rs ${amount.toLocaleString()}`;
  };

  const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (value) => {
    if (!value) return 'Not done';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not done';
    return date.toLocaleDateString();
  };

  const getProjectDoneStatus = (order) => {
    if (!order.completedAt) {
      return { label: 'Not set', className: 'pending' };
    }

    if (!order.deadline) {
      return { label: 'Planned', className: 'on-time' };
    }

    const completedDate = new Date(order.completedAt);
    const deadlineDate = new Date(order.deadline);
    if (Number.isNaN(completedDate.getTime()) || Number.isNaN(deadlineDate.getTime())) {
      return { label: 'Planned', className: 'on-time' };
    }

    if (completedDate <= deadlineDate) {
      return { label: 'Within Deadline', className: 'on-time' };
    }

    return { label: 'Extra Time', className: 'late' };
  };

  const getDeadlineStatus = (order) => {
    if (!order.deadline) {
      return { label: 'Not set', className: 'pending' };
    }

    const deadlineDate = new Date(order.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(deadlineDate.getTime())) {
      return { label: 'Not set', className: 'pending' };
    }

    if (order.completedAt) {
      const doneDate = new Date(order.completedAt);
      if (!Number.isNaN(doneDate.getTime()) && doneDate > deadlineDate) {
        return { label: 'Extended', className: 'late' };
      }
      return { label: 'Customer Date', className: 'on-time' };
    }

    if (!['completed', 'delivered', 'cancelled'].includes(order.status) && new Date() > deadlineDate) {
      return { label: 'Overdue', className: 'late' };
    }

    return { label: 'Customer Date', className: 'on-time' };
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditForm({
      title: order.title || '',
      description: order.description || '',
      budget: order.budget || '',
      status: order.status || 'pending',
      deadline: formatDateInput(order.deadline),
      completedAt: formatDateInput(order.completedAt)
    });
  };

  const closeEditModal = () => {
    setEditingOrder(null);
    setEditSaving(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const matchesSearch =
        order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      const createdAt = new Date(order.createdAt);
      let matchesDate = true;
      if (dateFilter !== 'all' && !Number.isNaN(createdAt.getTime())) {
        const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today') {
          matchesDate = createdAt.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === 'month') {
          matchesDate = diffDays <= 30;
        } else if (dateFilter === 'quarter') {
          matchesDate = diffDays <= 90;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date_asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_desc':
          return (b.budget || 0) - (a.budget || 0);
        case 'amount_asc':
          return (a.budget || 0) - (b.budget || 0);
        default:
          return 0;
      }
    });
  }, [orders, searchTerm, statusFilter, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handlePrintOrder = (order) => {
    const projectDone = formatDateDisplay(order.completedAt);
    const projectStatus = getProjectDoneStatus(order).label;
    const deadlineStatus = getDeadlineStatus(order).label;
    const orderId = `#${order._id?.substring(0, 8)}`;
    const customerName = getCustomerName(order);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Order ${escapeHtml(orderId)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; color: #222; }
            h1 { margin: 0 0 8px; }
            .meta { margin-bottom: 24px; color: #555; }
            .row { margin: 8px 0; }
            .label { font-weight: 700; display: inline-block; min-width: 160px; }
            .box { margin-top: 20px; border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Carpenter Shop Order Summary</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          <div class="row"><span class="label">Order ID:</span> ${escapeHtml(orderId)}</div>
          <div class="row"><span class="label">Title:</span> ${escapeHtml(order.title)}</div>
          <div class="row"><span class="label">Customer:</span> ${escapeHtml(customerName)}</div>
          <div class="row"><span class="label">Status:</span> ${escapeHtml(getStatusText(order.status))}</div>
          <div class="row"><span class="label">Budget:</span> ${escapeHtml(formatCurrency(order.budget))}</div>
          <div class="row"><span class="label">Created Date:</span> ${escapeHtml(new Date(order.createdAt).toLocaleDateString())}</div>
          <div class="row"><span class="label">Deadline:</span> ${escapeHtml(order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not set')} (${escapeHtml(deadlineStatus)})</div>
          <div class="row"><span class="label">Project Done:</span> ${escapeHtml(projectDone)} (${escapeHtml(projectStatus)})</div>
          <div class="box">
            <div class="label">Description:</div>
            <div>${escapeHtml(order.description || 'No description')}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getNotificationOrderId = (note) => {
    if (!note?.orderId) return null;
    if (typeof note.orderId === 'string') return note.orderId;
    if (typeof note.orderId === 'object' && note.orderId._id) return note.orderId._id;
    return null;
  };

  const markNotificationRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((note) => (
          note._id === id ? { ...note, readAt: new Date().toISOString() } : note
        ))
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      const result = await deleteOrder(id);
      if (result.success) {
        toast.success('Order deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete order');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const result = await updateOrderStatus(id, newStatus);
    if (result.success) {
      if (result.data?.emailSent === false && result.data?.emailError) {
        toast.warning(`Status updated but email failed: ${result.data.emailError}`);
      } else if (result.data?.emailSent) {
        toast.success(`Order status updated to ${newStatus} & Email Sent`);
      } else {
        toast.success(`Order status updated to ${newStatus}`);
      }
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleApproveCancellation = async (id) => {
    if (!isStaff) return;
    if (!window.confirm('Approve cancellation and cancel this order?')) return;
    const result = await approveCancellation(id);
    if (result.success) {
      toast.success('Cancellation approved');
    } else {
      toast.error(result.error || 'Failed to approve cancellation');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="status-icon completed" />;
      case 'in_progress':
        return <FaClock className="status-icon in-progress" />;
      case 'pending':
        return <FaExclamationTriangle className="status-icon pending" />;
      default:
        return <FaClock className="status-icon" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const getCustomerName = (order) => {
    return order.customerId?.name || order.customerName || 'N/A';
  };

  const handleSelectAll = (e) => {
    if (!isStaff) return;
    if (e.target.checked) {
      setSelectedOrders(paginatedOrders.map((order) => order._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (id) => {
    if (!isStaff) return;
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter((orderId) => orderId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBulkAction = async (action) => {
    if (!isStaff) return;
    if (selectedOrders.length === 0) {
      toast.warning('Please select orders first');
      return;
    }

    switch (action) {
      case 'delete':
        if (window.confirm(`Delete ${selectedOrders.length} selected orders?`)) {
          await Promise.all(selectedOrders.map((id) => deleteOrder(id)));
          setSelectedOrders([]);
          toast.info(`Deleted ${selectedOrders.length} orders`);
        }
        break;
      case 'export':
        toast.info('Export feature coming soon');
        break;
      default:
        break;
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingOrder) return;

    setEditSaving(true);
    const payload = {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      budget: Number(editForm.budget) || 0,
      status: editForm.status,
      deadline: editForm.deadline || null,
      completedAt: editForm.completedAt || null
    };

    const result = await updateOrder(editingOrder._id, payload);
    if (result.success) {
      toast.success('Order updated successfully');
      closeEditModal();
      fetchOrders();
    } else {
      toast.error(result.error || 'Failed to update order');
      setEditSaving(false);
    }
  };

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <h1><FaTag /> Order Management</h1>
          <p>Manage customer orders and track production progress</p>
        </div>
        <div className="header-actions">
          <Link to="/orders/new" className="btn-primary">
            <FaPlus /> Create New Order
          </Link>
          {isStaff && (
            <button className="btn-secondary" onClick={() => toast.info('Export feature coming soon')}>
              <FaDownload /> Export
            </button>
          )}
        </div>
      </div>

      <div className="orders-notification-panel">
        <h2>Notification History</h2>
        {notificationsLoading ? (
          <p>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <div className="orders-notification-list">
            {notifications.map((note) => (
              <button
                type="button"
                key={note._id}
                className={`orders-notification-item ${note.readAt ? '' : 'unread'}`}
                onClick={() => handleNotificationClick(note)}
              >
                <div className="orders-notification-title">
                  {note.title || 'Order update'}
                </div>
                {note.message && <div className="orders-notification-message">{note.message}</div>}
                <div className="orders-notification-time">{new Date(note.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search orders by ID, title, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {isStaff && (
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {isStaff && selectedOrders.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedOrders.length} orders selected</span>
          <div className="bulk-buttons">
            <button
              className="btn-danger"
              onClick={() => handleBulkAction('delete')}
            >
              <FaTrash /> Delete Selected
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleBulkAction('export')}
            >
              <FaDownload /> Export Selected
            </button>
          </div>
        </div>
      )}

      <div className="orders-table-container">
        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : (
          <>
            <table className="orders-table">
              <thead>
                <tr>
                  {isStaff && (
                    <th>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                      />
                    </th>
                  )}
                  <th>Image</th>
                  <th>Order ID</th>
                  <th>Title</th>
                  {isStaff && <th>Customer</th>}
                  <th>Budget</th>
                  <th>Status</th>
                  {isStaff && <th>Created Date</th>}
                  {isStaff && <th>Deadline</th>}
                  {isStaff && <th>Project Done</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order._id} className={order.status}>
                    {isStaff && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order._id)}
                          onChange={() => handleSelectOrder(order._id)}
                        />
                      </td>
                    )}
                    <td className="order-image-cell">
                      {order.images && order.images.length > 0 ? (
                        <img
                          src={order.images[0].startsWith('http') ? order.images[0] : `http://localhost:5000${order.images[0]}`}
                          alt="Order thumbnail"
                          className="order-thumbnail"
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div className="no-image-placeholder" style={{ width: '50px', height: '50px', background: 'var(--muted-bg)', color: 'var(--text-light)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                          No Img
                        </div>
                      )}
                    </td>
                    <td className="order-id">#{order._id?.substring(0, 8)}</td>
                    <td className="order-title">{order.title}</td>
                    {isStaff && (
                      <td className="customer">
                        <span className="cell-inline">
                          <FaUser /> {getCustomerName(order)}
                        </span>
                      </td>
                    )}
                    <td className="budget">{formatCurrency(order.budget)}</td>
                    <td className="status-cell">
                      <div className="status-indicator">
                        {getStatusIcon(order.status)}
                        {isStaff ? (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="status-select"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span>{getStatusText(order.status)}</span>
                        )}
                      </div>
                      {order.cancellationRequest?.status === 'pending' && (
                        <span className="cancel-requested">Cancellation requested</span>
                      )}
                    </td>
                    {isStaff && (
                      <td className="date">
                        <span className="cell-inline">
                          <FaCalendarAlt /> {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    )}
                    {isStaff && (
                      <td className="deadline">
                        <div className="date-stack">
                          <span className="done-date">
                            <FaCalendarAlt /> {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not set'}
                          </span>
                          <span className={`done-badge ${getDeadlineStatus(order).className}`}>
                            {getDeadlineStatus(order).label}
                          </span>
                        </div>
                      </td>
                    )}
                    {isStaff && (
                      <td className="project-done">
                        <div className="date-stack">
                          <span className="done-date">
                            <FaCalendarAlt /> {formatDateDisplay(order.completedAt)}
                          </span>
                          <span className={`done-badge ${getProjectDoneStatus(order).className}`}>
                            {getProjectDoneStatus(order).label}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="actions">
                      <div className="actions-row">
                        <button className="action-btn view" title="View Details" onClick={() => navigate(`/orders/${order._id}`)}>
                          <FaEye />
                        </button>
                        {isStaff && (
                          <>
                            {order.cancellationRequest?.status === 'pending' && (
                              <button
                                className="action-btn cancel"
                                title="Approve Cancellation"
                                onClick={() => handleApproveCancellation(order._id)}
                              >
                                <FaBan />
                              </button>
                            )}
                            <button className="action-btn edit" title="Edit Order" onClick={() => openEditModal(order)}>
                              <FaEdit />
                            </button>
                            <button
                              className="action-btn delete"
                              title="Delete Order"
                              onClick={() => handleDelete(order._id)}
                            >
                              <FaTrash />
                            </button>
                            <button className="action-btn print" title="Print" onClick={() => handlePrintOrder(order)}>
                              <FaPrint />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedOrders.length === 0 && (
              <div className="no-orders">
                <p>No orders found. {searchTerm && 'Try a different search term.'}</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="order-stats">
        <div className="stat-card">
          <h3>{orders.length}</h3>
          <p>Total Orders</p>
        </div>
        <div className="stat-card">
          <h3>{orders.filter((o) => o.status === 'pending').length}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card">
          <h3>{orders.filter((o) => o.status === 'in_progress').length}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card">
          <h3>{orders.filter((o) => ['completed', 'delivered'].includes(o.status)).length}</h3>
          <p>Completed</p>
        </div>
        <div className="stat-card">
          <h3>{formatCurrency(orders.filter((o) => ['completed', 'delivered'].includes(o.status)).reduce((sum, order) => sum + (order.budget || 0), 0))}</h3>
          <p>Total Revenue</p>
        </div>
      </div>

      {editingOrder && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Edit Order #{editingOrder._id?.substring(0, 8)}</h2>
            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="edit-form-grid">
                <label>
                  Title
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Budget (Rs)
                  <input
                    type="number"
                    name="budget"
                    value={editForm.budget}
                    onChange={handleEditChange}
                    min="0"
                  />
                </label>
                <label>
                  Status
                  <select name="status" value={editForm.status} onChange={handleEditChange}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label>
                  Deadline
                  <input
                    type="date"
                    name="deadline"
                    value={editForm.deadline}
                    onChange={handleEditChange}
                  />
                </label>
                <label>
                  Project Done Date (Final / Revised)
                  <input
                    type="date"
                    name="completedAt"
                    value={editForm.completedAt}
                    onChange={handleEditChange}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  name="description"
                  rows="4"
                  value={editForm.description}
                  onChange={handleEditChange}
                />
              </label>

              <div className="edit-form-actions">
                <button type="submit" className="btn-primary" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
