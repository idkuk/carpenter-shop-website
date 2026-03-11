import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCloudUploadAlt, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../services/api';
import './NewOrder.css';

const categories = [
  'bedroom',
  'dining',
  'living',
  'office',
  'storage',
  'custom'
];

const NewOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    dimensions: '',
    material: '',
    budget: '',
    deadline: '',
    customerId: ''
  });
  const [files, setFiles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      if (!isStaff) return;
      try {
        const data = await customerService.getAllCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load customers');
      }
    };
    loadCustomers();
  }, [isStaff]);

  useEffect(() => {
    const serviceName = searchParams.get('serviceName');
    const category = searchParams.get('category');

    if (!serviceName && !category) return;

    setFormData((prev) => ({
      ...prev,
      title: prev.title || (serviceName ? `Custom ${serviceName}` : prev.title),
      category: prev.category || category || '',
      description: prev.description || (serviceName ? `Looking to customize ${serviceName}.` : prev.description)
    }));
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 5) {
      toast.warning('You can upload up to 5 images');
    }
    setFiles(selected.slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Order title is required');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (isStaff && !formData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && value !== null) {
        payload.append(key, value);
      }
    });

    files.forEach((file) => payload.append('images', file));

    setLoading(true);
    try {
      const result = await createOrder(payload);
      if (result.success) {
        toast.success('Order submitted successfully');
        navigate('/orders');
      } else {
        toast.error(result.error || 'Failed to submit order');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-order-page">
      <div className="new-order-card">
        <h1>Place a Custom Order</h1>
        <p>Share your requirements and our team will review the details.</p>

        <form className="new-order-form" onSubmit={handleSubmit}>
          {isStaff && (
            <div className="form-group">
              <label htmlFor="customerId">Customer</label>
              <select
                id="customerId"
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Order Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Custom Bed Frame"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="budget">Estimated Budget (Rs)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Target Deadline</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dimensions">Dimensions</label>
              <input
                type="text"
                id="dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g., 6ft x 4ft"
              />
            </div>

            <div className="form-group">
              <label htmlFor="material">Preferred Material</label>
              <input
                type="text"
                id="material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                placeholder="e.g., Teak, Sheesham"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Order Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your design, finish, or special requests"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Reference Images</label>
            <div className="upload-box">
              <FaCloudUploadAlt className="upload-icon" />
              <p>Upload inspiration images (max 5)</p>
              <input type="file" multiple accept="image/*" onChange={handleFilesChange} />
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((file, index) => (
                  <span key={index} className="file-chip">
                    {file.name}
                    <button type="button" onClick={() => removeFile(index)}>
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="helper-text">
              <FaInfoCircle /> Images help our team understand your style better.
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Order'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/orders')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewOrder;
