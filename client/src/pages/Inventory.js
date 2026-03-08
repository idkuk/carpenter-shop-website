import React, { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { inventoryService } from '../services/api';
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
  location: ''
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    const payload = {
      itemName: formData.itemName.trim(),
      category: formData.category.trim(),
      quantity: Number(formData.quantity) || 0,
      unit: formData.unit.trim(),
      price: Number(formData.price) || 0,
      supplier: formData.supplier.trim(),
      supplierContact: formData.supplierContact.trim(),
      reorderLevel: Number(formData.reorderLevel) || 0,
      location: formData.location.trim()
    };

    try {
      if (editingId) {
        await inventoryService.updateItem(editingId, payload);
        toast.success('Inventory item updated');
      } else {
        await inventoryService.createItem(payload);
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
      location: item.location || ''
    });
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
