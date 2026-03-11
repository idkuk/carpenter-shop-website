import React, { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { inventoryService } from '../services/api';
import { getAssetUrl } from '../utils/url';
import './Inventory.css';

const emptyForm = {
  itemName: '',
  category: '',
  quantity: '',
  unit: '',
  price: '',
  supplier: '',
  supplierContact: '',
  reorderLevel: '',
  location: '',
  image: ''
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAllItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setImageFile(file);
  };

  const clearImageFile = () => {
    setImageFile(null);
    setFileInputKey((prev) => prev + 1);
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setFileInputKey((prev) => prev + 1);
  };

  const buildPayload = (data) => ({
    itemName: data.itemName.trim(),
    category: data.category.trim(),
    quantity: Number(data.quantity) || 0,
    unit: data.unit.trim(),
    price: Number(data.price) || 0,
    supplier: data.supplier.trim(),
    supplierContact: data.supplierContact.trim(),
    reorderLevel: Number(data.reorderLevel) || 0,
    location: data.location.trim(),
    image: data.image.trim()
  });

  const buildFormData = (data, file) => {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, value);
    });
    form.append('image', file);
    return form;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    const payload = buildPayload(formData);
    const requestPayload = imageFile ? buildFormData(payload, imageFile) : payload;

    try {
      if (editingId) {
        await inventoryService.updateItem(editingId, requestPayload);
        toast.success('Inventory item updated');
      } else {
        await inventoryService.createItem(requestPayload);
        toast.success('Inventory item created');
      }

      resetForm();
      loadItems();
    } catch (error) {
      toast.error('Failed to save inventory item');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      itemName: item.itemName || '',
      category: item.category || '',
      quantity: item.quantity || '',
      unit: item.unit || '',
      price: item.price || '',
      supplier: item.supplier || '',
      supplierContact: item.supplierContact || '',
      reorderLevel: item.reorderLevel || '',
      location: item.location || '',
      image: item.image || ''
    });
    setImageFile(null);
    setFileInputKey((prev) => prev + 1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await inventoryService.deleteItem(id);
      toast.success('Inventory item deleted');
      loadItems();
    } catch (error) {
      toast.error('Failed to delete inventory item');
    }
  };

  const isLowStock = (item) => {
    if (item.reorderLevel === undefined || item.reorderLevel === null) return false;
    return item.quantity <= item.reorderLevel;
  };

  const previewSrc = imagePreview || (formData.image ? getAssetUrl(formData.image) : '');

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Track materials, quantities, and reorder levels</p>
        </div>
      </div>

      <div className="inventory-grid">
        <div className="inventory-form-card">
          <h2>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
          <form className="inventory-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  placeholder="e.g., Teak Wood Planks"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., Wood, Hardware"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="e.g., pieces, sheets"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price (Rs)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Reorder Level</label>
                <input
                  type="number"
                  name="reorderLevel"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Supplier</label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  placeholder="Supplier name"
                />
              </div>
              <div className="form-group">
                <label>Supplier Contact</label>
                <input
                  type="text"
                  name="supplierContact"
                  value={formData.supplierContact}
                  onChange={handleChange}
                  placeholder="Phone or email"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Storage location"
                />
              </div>
              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Upload Image</label>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                />
                {imageFile && (
                  <button type="button" className="btn-secondary btn-small" onClick={clearImageFile}>
                    Remove Upload
                  </button>
                )}
              </div>
              <div className="form-group">
                <label>Preview</label>
                <div className="inventory-image-preview">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Inventory preview"
                    />
                  ) : (
                    <span>No image selected</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <FaPlus /> {editingId ? 'Update Item' : 'Add Item'}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="inventory-list-card">
          <h2>Inventory Items</h2>
          {loading ? (
            <p>Loading inventory...</p>
          ) : items.length === 0 ? (
            <p>No inventory items yet.</p>
          ) : (
            <div className="table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Reorder</th>
                    <th>Unit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className={isLowStock(item) ? 'low-stock-row' : ''}>
                      <td className="inventory-image-cell">
                        {item.image ? (
                          <img
                            src={getAssetUrl(item.image)}
                            alt={item.itemName}
                            className="inventory-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="inventory-image-placeholder">No Img</div>
                        )}
                      </td>
                      <td>{item.itemName}</td>
                      <td>{item.category || '-'}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {isLowStock(item) && (
                          <span className="low-stock">
                            <FaExclamationTriangle /> Low
                          </span>
                        )}
                        {!isLowStock(item) && (item.reorderLevel || 0)}
                      </td>
                      <td>{item.unit || '-'}</td>
                      <td className="actions">
                        <button className="action-btn edit" onClick={() => handleEdit(item)}>
                          <FaEdit />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(item._id)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
