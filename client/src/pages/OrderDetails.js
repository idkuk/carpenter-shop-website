import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBox, FaUser, FaClock, FaTags, FaMoneyBillWave, FaEdit, FaExclamationTriangle, FaBan, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { getAssetUrl } from '../utils/url';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const {
    getOrderById,
    updateOrderStatus,
    requestCancellation,
    approveCancellation,
    rejectCancellation,
    loading
  } = useOrders();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  useEffect(() => {
    const fetchOrder = async () => {
      const result = await getOrderById(id);
      if (result.success) {
        setOrder(result.data);
        setStatus(result.data.status);
      } else {
        toast.error('Failed to fetch order details');
        navigate('/orders');
      }
    };
    fetchOrder();
  }, [id, getOrderById, navigate]);

  useEffect(() => {
    if (!user?.address) {
      setAddressInput('');
      return;
    }
    setAddressInput(user.address);
  }, [user?.address]);

  const handleStatusChange = async () => {
    if (!isStaff) return;
    setIsUpdating(true);
    const result = await updateOrderStatus(id, status);
    if (result.success) {
      if (result.data?.emailSent === false && result.data?.emailError) {
        toast.warning(`Status updated but email failed: ${result.data.emailError}`);
      } else if (result.data?.emailSent) {
        toast.success(`Order status updated to ${status} & Email Sent`);
      } else {
        toast.success(`Order status updated to ${status}`);
      }
      setOrder(prev => ({ ...prev, status }));
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setIsUpdating(false);
  };

  const cancellationStatus = order?.cancellationRequest?.status || 'none';
  const paymentStatus = order?.payment?.status || 'pending';
  const canRequestCancellation = !isStaff && order && !['completed', 'delivered', 'cancelled'].includes(order.status) && cancellationStatus !== 'pending';
  const canApproveCancellation = isStaff && cancellationStatus === 'pending';

  const handleEmailAwareSuccess = (message, data) => {
    if (data?.emailSent === false && data?.emailError) {
      toast.warning(`${message}, but email failed: ${data.emailError}`);
      return;
    }

    if (data?.emailSent) {
      toast.success(`${message} & Email Sent`);
      return;
    }

    toast.success(message);
  };

  const handleRequestCancellation = async () => {
    if (!window.confirm('Send a cancellation request to admin?')) {
      return;
    }
    setIsSubmittingCancel(true);
    const result = await requestCancellation(id);
    if (result.success) {
      const updatedOrder = result.data?.order || result.data;
      toast.success('Cancellation request sent');
      setOrder(updatedOrder);
      setStatus(updatedOrder.status);
    } else {
      toast.error(result.error || 'Failed to request cancellation');
    }
    setIsSubmittingCancel(false);
  };

  const handleApproveCancellation = async () => {
    if (!window.confirm('Approve cancellation and cancel this order?')) {
      return;
    }
    const note = window.prompt('Optional note for the customer (leave blank to skip):', '');
    if (note === null) {
      return;
    }
    setIsSubmittingCancel(true);
    const result = await approveCancellation(id, note.trim());
    if (result.success) {
      const updatedOrder = result.data?.order || result.data;
      handleEmailAwareSuccess('Cancellation approved', result.data);
      setOrder(updatedOrder);
      setStatus(updatedOrder.status);
    } else {
      toast.error(result.error || 'Failed to approve cancellation');
    }
    setIsSubmittingCancel(false);
  };

  const handleRejectCancellation = async () => {
    if (!window.confirm('Reject this cancellation request?')) {
      return;
    }
    const note = window.prompt('Optional note for the customer (recommended):', '');
    if (note === null) {
      return;
    }
    setIsSubmittingCancel(true);
    const result = await rejectCancellation(id, note.trim());
    if (result.success) {
      const updatedOrder = result.data?.order || result.data;
      handleEmailAwareSuccess('Cancellation rejected', result.data);
      setOrder(updatedOrder);
      setStatus(updatedOrder.status);
    } else {
      toast.error(result.error || 'Failed to reject cancellation');
    }
    setIsSubmittingCancel(false);
  };

  const handleSaveAddress = async () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      toast.error('Please enter your address');
      return;
    }
    setIsSavingAddress(true);
    const result = await updateProfile({ address: trimmed });
    if (result.success) {
      toast.success('Address saved');
    } else {
      toast.error(result.error || 'Failed to save address');
    }
    setIsSavingAddress(false);
  };

  if (loading && !order) return <div className="loading">Loading order details...</div>;
  if (!order) return <div className="error">Order not found</div>;

  const displayAddress = order.customerId?.address || user?.address || '';

  return (
    <div className="order-details-container">
      <Link to="/orders" className="back-link">
        <FaArrowLeft /> Back to Orders
      </Link>

      <div className="order-header">
        <div className="order-title">
          <h1>Order #{order._id.substring(0, 8)}</h1>
          {isStaff && (
            <div className="order-meta">
              Created on {new Date(order.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="status-wrapper">
          <div className={`status-badge ${order.status}`}>
            {order.status.replace('_', ' ')}
          </div>
          {cancellationStatus === 'pending' && (
            <div className="status-sub-badge">Cancellation Requested</div>
          )}
          {cancellationStatus === 'rejected' && (
            <div className="status-sub-badge rejected">Cancellation Rejected</div>
          )}
        </div>
      </div>

      <div className="order-content">
        <div className="main-info">
          <h2>{order.title}</h2>

          <div className="description-section">
            <h3 className="section-title"><FaBox /> Description</h3>
            <p className="description-text">{order.description}</p>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span className="label"><FaTags /> Category:</span>
              <span className="value">{order.category || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label"><FaBox /> Dimensions:</span>
              <span className="value">{order.dimensions || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label"><FaBox /> Material:</span>
              <span className="value">{order.material || 'N/A'}</span>
            </div>
          </div>

          {order.images && order.images.length > 0 && (
            <div className="images-section">
              <h3>Images</h3>
              <div className="images-grid">
                {order.images.map((img, index) => {
                  return <img key={index} src={getAssetUrl(img)} alt={`Order attachment ${index + 1}`} className="order-image" />;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-info">
          <div className="info-card">
            <h3><FaMoneyBillWave /> Financials</h3>
            <div className="info-row">
              <span className="info-label">Budget:</span>
              <span className="info-value">Rs {order.budget?.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment:</span>
              <span className={`info-value payment-status ${paymentStatus}`}>
                {paymentStatus.replace('_', ' ')}
              </span>
            </div>
            {order.payment?.paidAt && (
              <div className="info-row">
                <span className="info-label">Paid On:</span>
                <span className="info-value">{new Date(order.payment.paidAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {isStaff && (
            <div className="info-card">
              <h3><FaUser /> Customer Info</h3>
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{order.customerId?.name || 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{order.customerId?.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">{order.customerId?.phone || 'N/A'}</span>
              </div>
              <div className="info-row address-row">
                <span className="info-label">Address:</span>
                <span className="info-value">{order.customerId?.address || 'Not provided'}</span>
              </div>
              {!order.customerId?.address && (
                <p className="address-warning">Customer has not added an address yet.</p>
              )}
            </div>
          )}

          {!isStaff && (
            <div className="info-card">
              <h3>Delivery Address</h3>
              {displayAddress ? (
                <div className="info-row address-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{displayAddress}</span>
                </div>
              ) : (
                <p className="address-warning">
                  Please add your address before we process this order.
                </p>
              )}
              <div className="address-form">
                <label htmlFor="addressInput">Update address</label>
                <textarea
                  id="addressInput"
                  rows="3"
                  placeholder="Enter your full address"
                  value={addressInput}
                  onChange={(event) => setAddressInput(event.target.value)}
                />
                <button
                  type="button"
                  className="address-save-btn"
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          )}

          {isStaff && (
            <div className="info-card">
              <h3><FaClock /> Timeline</h3>
              <div className="info-row">
                <span className="info-label">Deadline:</span>
                <span className="info-value">{order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not Set'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{new Date(order.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {!isStaff && (
            <div className="info-card">
              <h3>Cancellation</h3>
              {order.status === 'cancelled' ? (
                <p className="cancel-note">This order has already been cancelled.</p>
              ) : cancellationStatus === 'pending' ? (
                <p className="cancel-note">Cancellation request is pending admin approval.</p>
              ) : cancellationStatus === 'rejected' ? (
                <>
                  <p className="cancel-note">
                    Your last cancellation request was declined.
                    {order.cancellationRequest?.resolutionNote ? ` Note: ${order.cancellationRequest.resolutionNote}` : ''}
                  </p>
                  <button
                    className="cancel-btn full-width"
                    onClick={handleRequestCancellation}
                    disabled={!canRequestCancellation || isSubmittingCancel}
                  >
                    {isSubmittingCancel ? 'Sending...' : <><FaBan /> Request Cancellation Again</>}
                  </button>
                </>
              ) : !['completed', 'delivered'].includes(order.status) ? (
                <button
                  className="cancel-btn full-width"
                  onClick={handleRequestCancellation}
                  disabled={!canRequestCancellation || isSubmittingCancel}
                >
                  {isSubmittingCancel ? 'Sending...' : <><FaBan /> Request Cancellation</>}
                </button>
              ) : (
                <p className="cancel-note">Cancellation is not available for this order.</p>
              )}
            </div>
          )}

          {isStaff && cancellationStatus === 'pending' && (
            <div className="info-card">
              <h3>Cancellation Request</h3>
              <div className="info-row">
                <span className="info-label">Requested:</span>
                <span className="info-value">
                  {order.cancellationRequest?.requestedAt ? new Date(order.cancellationRequest.requestedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {order.cancellationRequest?.reason && (
                <p className="cancel-note">Reason: {order.cancellationRequest.reason}</p>
              )}
              {order.cancellationRequest?.resolutionNote && (
                <p className="cancel-note">Team note: {order.cancellationRequest.resolutionNote}</p>
              )}
              <div className="decision-actions">
                <button
                  className="approve-btn full-width"
                  onClick={handleApproveCancellation}
                  disabled={!canApproveCancellation || isSubmittingCancel}
                >
                  {isSubmittingCancel ? 'Approving...' : <><FaCheckCircle /> Approve Cancellation</>}
                </button>
                <button
                  className="reject-btn full-width"
                  onClick={handleRejectCancellation}
                  disabled={!canApproveCancellation || isSubmittingCancel}
                >
                  {isSubmittingCancel ? 'Rejecting...' : <><FaTimes /> Reject Cancellation</>}
                </button>
              </div>
            </div>
          )}

          {isStaff && (
            <div className="info-card">
              <h3><FaEdit /> Manage Status</h3>
              <div className="status-actions">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  className="update-btn"
                  onClick={handleStatusChange}
                  disabled={isUpdating || status === order.status}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
              <p className="status-note">
                <FaExclamationTriangle /> Updating status will notify the customer via email.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
