import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaMagic, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { serviceService } from '../services/api';
import { getServiceAdditionalMediaList, getServiceMediaList, isVideoAsset, resolveServiceMediaAsset } from '../utils/serviceMedia';
import { SERVICE_OFFERING_OPTIONS, getOfferingLabel, normalizeOfferings } from '../utils/serviceOfferings';
import './ServiceManagement.css';

const emptyForm = {
  name: '',
  category: '',
  description: '',
  price: '',
  timeline: '',
  rating: '',
  image: '',
  features: '',
  offerings: [],
  active: true
};

const MAX_SERVICE_MEDIA = 5;

const starterServices = [
  {
    name: 'Modular Kitchen Setup',
    category: 'kitchen',
    description: 'Custom modular kitchen units with storage optimization and finish options.',
    price: 'Starting at Rs 1000 / sq ft',
    timeline: '10-20 days',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
    features: ['Site measurement', 'Material options', 'Hardware fitting', 'Final polish'],
    active: true
  },
  {
    name: 'Wardrobe Installation',
    category: 'storage',
    description: 'Sliding and hinged wardrobe solutions for bedroom storage.',
    price: 'Starting at Rs 800 / sq ft',
    timeline: '7-14 days',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80',
    features: ['2D layout', 'Shelf planning', 'Soft-close options', 'On-site install'],
    active: true
  },
  {
    name: 'Custom TV Unit',
    category: 'living',
    description: 'Wall-mounted and floor TV units with cable channels and storage.',
    price: 'Starting at Rs 12000',
    timeline: '5-10 days',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1616627561839-074385245ff6?auto=format&fit=crop&w=900&q=80',
    features: ['Design consultation', 'Wire management', 'Laminate finish', 'Installation'],
    active: true
  },
  {
    name: 'Sofa / Bed Repairs',
    category: 'repairs',
    description: 'On-site carpentry fixes for beds, sofas, doors, and furniture joints.',
    price: 'Starting visit Rs 499',
    timeline: 'Same day - 2 days',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    features: ['Inspection', 'Minor parts replacement', 'Polish touch-up', 'Quick completion'],
    active: true
  },
  {
    name: 'Office Workstation Desk',
    category: 'office',
    description: 'Commercial and home office workstations with custom cable routing.',
    price: 'Starting at Rs 750 / sq ft',
    timeline: '6-12 days',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
    features: ['Ergonomic layout', 'Storage drawers', 'Wire tray', 'Custom finish'],
    active: true
  },
  {
    name: 'Wooden Door Work',
    category: 'renovation',
    description: 'Door frame repair, lock fitting, and custom door fabrication.',
    price: 'Repair starts Rs 249 | New install from Rs 1000',
    timeline: '2-5 days',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80',
    features: ['Door alignment', 'Lock installation', 'Frame correction', 'Polish options'],
    active: true
  }
];

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [existingMedia, setExistingMedia] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await serviceService.getAllServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (mediaFiles.length === 0) {
      setMediaPreviews([]);
      return undefined;
    }

    const previews = mediaFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/')
    }));
    setMediaPreviews(previews);

    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [mediaFiles]);

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [services]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setExistingMedia([]);
    setMediaFiles([]);
    setMediaPreviews([]);
    setFileInputKey((prev) => prev + 1);
  };

  const toPayload = (data) => {
    const features = data.features
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description.trim(),
      price: data.price.trim(),
      timeline: data.timeline.trim(),
      rating: data.rating ? Number(data.rating) : undefined,
      image: data.image.trim(),
      media: existingMedia,
      offerings: data.offerings,
      features,
      active: data.active
    };
  };

  const toFormData = (data, files) => {
    const payload = toPayload(data);
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
        return;
      }
      form.append(key, value);
    });
    files.forEach((file) => form.append('mediaFiles', file));
    return form;
  };

  const handleMediaFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remainingSlots = MAX_SERVICE_MEDIA - existingMedia.length - mediaFiles.length;

    if (remainingSlots <= 0) {
      toast.warning(`Only ${MAX_SERVICE_MEDIA} extra images or videos are allowed per service`);
      event.target.value = '';
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more media file${remainingSlots === 1 ? '' : 's'} can be added`);
    }

    setMediaFiles((prev) => [...prev, ...selectedFiles.slice(0, remainingSlots)]);
    event.target.value = '';
  };

  const removeExistingMedia = (index) => {
    setExistingMedia((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const removePendingMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleOffering = (id) => {
    setFormData((prev) => {
      const set = new Set(prev.offerings || []);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return { ...prev, offerings: Array.from(set) };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    setSaving(true);
    const payload = mediaFiles.length > 0 ? toFormData(formData, mediaFiles) : toPayload(formData);
    try {
      if (editingId) {
        await serviceService.updateService(editingId, payload);
        toast.success('Service updated');
      } else {
        await serviceService.createService(payload);
        toast.success('Service created');
      }
      resetForm();
      await loadServices();
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service._id);
    setFormData({
      name: service.name || '',
      category: service.category || '',
      description: service.description || '',
      price: service.price || '',
      timeline: service.timeline || '',
      rating: service.rating || '',
      image: service.image || '',
      features: Array.isArray(service.features) ? service.features.join(', ') : '',
      offerings: normalizeOfferings(service.offerings),
      active: service.active !== false
    });
    setExistingMedia(getServiceAdditionalMediaList(service));
    setMediaFiles([]);
    setMediaPreviews([]);
    setFileInputKey((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await serviceService.deleteService(id);
      toast.success('Service deleted');
      await loadServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const seedStarterServices = async () => {
    setSeeding(true);
    try {
      const existingNames = new Set(
        services.map((service) => (service.name || '').trim().toLowerCase())
      );
      const toCreate = starterServices.filter(
        (service) => !existingNames.has(service.name.toLowerCase())
      );

      if (toCreate.length === 0) {
        toast.info('Starter services are already added');
        return;
      }

      for (const service of toCreate) {
        await serviceService.createService(service);
      }

      toast.success(`Added ${toCreate.length} starter services`);
      await loadServices();
    } catch (error) {
      toast.error('Failed to add starter services');
    } finally {
      setSeeding(false);
    }
  };

  const renderMediaPreview = (src, label) => {
    if (isVideoAsset(src)) {
      return (
        <video
          src={resolveServiceMediaAsset(src)}
          controls
          muted
          playsInline
        />
      );
    }

    return <img src={resolveServiceMediaAsset(src)} alt={label} />;
  };

  return (
    <div className="service-admin-page">
      <div className="service-admin-header">
        <div>
          <h1><FaTools /> Service Management</h1>
          <p>Add, update, and publish customer-facing services</p>
        </div>
        <button
          className="btn-secondary"
          onClick={seedStarterServices}
          disabled={seeding}
          type="button"
        >
          <FaMagic /> {seeding ? 'Adding...' : 'Add Starter Services'}
        </button>
      </div>

      <p className="service-note">
        Starter prices are market-style estimates for Mumbai/Thane and are fully editable for your shop.
      </p>

      <div className="service-admin-grid">
        <div className="service-form-card">
          <h2>{editingId ? 'Edit Service' : 'Add New Service'}</h2>
          <form className="service-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Modular Kitchen Setup"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="kitchen, living, office..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Short service summary"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price</label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Starting at Rs 1200 / sq ft"
                />
              </div>
              <div className="form-group">
                <label>Timeline</label>
                <input
                  type="text"
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleChange}
                  placeholder="7-14 days"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Rating</label>
                <input
                  type="number"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="4.7"
                />
              </div>
              <div className="form-group">
                <label>Primary Media URL</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://... (image or video)"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Additional Images / Videos</label>
              <input
                key={fileInputKey}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaFilesChange}
              />
              <small>
                Add up to {MAX_SERVICE_MEDIA} extra images or videos for the service gallery.
              </small>
            </div>

            <div className="media-counter">
              Additional gallery media: {existingMedia.length + mediaFiles.length}/{MAX_SERVICE_MEDIA}
            </div>

            {(formData.image || existingMedia.length > 0 || mediaPreviews.length > 0) && (
              <div className="form-group">
                <label>Media Preview</label>
                <div className="service-media-preview-stack">
                  {formData.image && (
                    <div className="service-media-section">
                      <span className="service-media-label">Primary media</span>
                      <div className="service-media-grid single">
                        <div className="service-media-card">
                          {renderMediaPreview(formData.image, 'Primary service media')}
                        </div>
                      </div>
                    </div>
                  )}

                  {existingMedia.length > 0 && (
                    <div className="service-media-section">
                      <span className="service-media-label">Existing gallery items</span>
                      <div className="service-media-grid">
                        {existingMedia.map((mediaItem, index) => (
                          <div key={`${mediaItem}-${index}`} className="service-media-card removable">
                            {renderMediaPreview(mediaItem, `Existing service media ${index + 1}`)}
                            <button
                              type="button"
                              className="remove-media-btn"
                              onClick={() => removeExistingMedia(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mediaPreviews.length > 0 && (
                    <div className="service-media-section">
                      <span className="service-media-label">New uploads</span>
                      <div className="service-media-grid">
                        {mediaPreviews.map((mediaItem, index) => (
                          <div key={`${mediaItem.name}-${index}`} className="service-media-card removable">
                            {mediaItem.isVideo ? (
                              <video src={mediaItem.url} controls muted playsInline />
                            ) : (
                              <img src={mediaItem.url} alt={mediaItem.name} />
                            )}
                            <button
                              type="button"
                              className="remove-media-btn"
                              onClick={() => removePendingMedia(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Features (comma separated)</label>
              <input
                type="text"
                name="features"
                value={formData.features}
                onChange={handleChange}
                placeholder="Measurement, installation, polish"
              />
            </div>

            <div className="form-group">
              <label>Service Offerings</label>
              <div className="offerings-grid">
                {SERVICE_OFFERING_OPTIONS.map((option) => (
                  <label key={option.id} className="offerings-option">
                    <input
                      type="checkbox"
                      checked={formData.offerings.includes(option.id)}
                      onChange={() => toggleOffering(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <small>These selections power the customer tabs on the Services page.</small>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <span>Active and visible on services page</span>
            </label>

            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={saving}>
                <FaPlus /> {saving ? 'Saving...' : editingId ? 'Update Service' : 'Create Service'}
              </button>
              {editingId && (
                <button className="btn-light" type="button" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="service-list-card">
          <h2>All Services</h2>
          {loading ? (
            <p>Loading services...</p>
          ) : sortedServices.length === 0 ? (
            <p>No services yet. Add your first one above.</p>
          ) : (
            <div className="service-list">
              {sortedServices.map((service) => (
                <div className="service-row" key={service._id}>
                  {getServiceMediaList(service)[0] ? (
                    <div className="service-row-media">
                      {isVideoAsset(getServiceMediaList(service)[0]) ? (
                        <video
                          src={resolveServiceMediaAsset(getServiceMediaList(service)[0])}
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img
                          src={resolveServiceMediaAsset(getServiceMediaList(service)[0])}
                          alt={service.name}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="service-row-media placeholder">No media</div>
                  )}
                  <div className="service-row-content">
                    <h3>{service.name}</h3>
                    <p>{service.description || 'No description'}</p>
                    <div className="service-meta">
                      <span>{service.category || 'uncategorized'}</span>
                      <span>{service.price || 'Price on request'}</span>
                      <span>{service.timeline || 'Timeline TBA'}</span>
                      <span>{getServiceMediaList(service).length} media</span>
                      {normalizeOfferings(service.offerings).length > 0 && (
                        <span>{normalizeOfferings(service.offerings).length} offerings</span>
                      )}
                      <span>{service.active === false ? 'Inactive' : 'Active'}</span>
                    </div>
                    {normalizeOfferings(service.offerings).length > 0 && (
                      <div className="service-offerings-row">
                        {normalizeOfferings(service.offerings).map((item) => (
                          <span key={item} className="offer-tag">
                            {getOfferingLabel(item)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="service-row-actions">
                    <button
                      type="button"
                      className="action-btn edit"
                      onClick={() => handleEdit(service)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={() => handleDelete(service._id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-links">
        <Link to="/inventory">Need to add material items? Open Inventory Management.</Link>
      </div>
    </div>
  );
};

export default ServiceManagement;
