import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBed, FaChair, FaTable, FaDoorClosed,
  FaSearch, FaFilter, FaStar, FaClock,
  FaShoppingCart, FaEye, FaCartPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { serviceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Services.css';

const Services = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  const categories = [
    { id: 'all', name: 'All Categories', icon: <FaFilter /> },
    { id: 'bedroom', name: 'Bedroom', icon: <FaBed /> },
    { id: 'dining', name: 'Dining', icon: <FaTable /> },
    { id: 'living', name: 'Living Room', icon: <FaChair /> },
    { id: 'office', name: 'Office', icon: <FaDoorClosed /> },
    { id: 'storage', name: 'Storage', icon: <FaDoorClosed /> }
  ];

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await serviceService.getAllServices();
        setServices(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedService(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedService]);

  const formatPrice = (price) => {
    if (price === undefined || price === null || price === '') return 'Rs 0';
    if (typeof price === 'number') return `Rs ${price.toLocaleString()}`;
    return String(price);
  };

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const serverBase = apiBase.replace(/\/api$/, '');
  const placeholderImage = 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600';

  const resolveImage = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${serverBase}${url}`;
  };

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const name = service.name || '';
      const description = service.description || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  const handleViewDetails = (service) => {
    setSelectedService(service);
  };

  const closeModal = () => {
    setSelectedService(null);
  };

  const handleAddToCart = (service) => {
    if (!isLoggedIn) {
      toast.info('Please login to add items to your cart');
      navigate('/login');
      return;
    }

    addToCart({
      _id: service._id || service.id || `${service.name}-${service.category}`,
      name: service.name,
      category: service.category,
      price: formatPrice(service.price),
      image: resolveImage(service.image) || placeholderImage
    });
  };

  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const handleOrderNow = (service) => {
    if (!isLoggedIn) {
      navigate('/register');
      return;
    }
    if (isStaff) {
      navigate('/custom-order');
      return;
    }
    handleAddToCart(service);
    navigate('/cart');
  };

  return (
    <div className="services-container">
      <div className="services-hero">
        <h1>Our Carpentry Services</h1>
        <p>Custom furniture crafted with precision, care, and years of expertise</p>
      </div>

      <div className="search-filter-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="services-grid">
        {loading ? (
          <div className="no-results">
            <h3>Loading services...</h3>
          </div>
        ) : filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div key={service._id || service.id} className="service-card">
              <div className="service-image">
                <img src={resolveImage(service.image) || placeholderImage} alt={service.name} />
                <div className="service-badge">{service.category || 'custom'}</div>
              </div>

              <div className="service-content">
                <div className="service-header">
                  <h3>{service.name}</h3>
                  <div className="service-rating">
                    <FaStar className="star-icon" />
                    <span>{service.rating ? service.rating.toFixed(1) : '4.5'}</span>
                  </div>
                </div>

                <p className="service-description">{service.description}</p>

                <div className="service-features">
                  {(Array.isArray(service.features) ? service.features : service.features ? [service.features] : []).map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>

                <div className="service-details">
                  <div className="detail-item">
                    <FaClock className="detail-icon" />
                    <span>{service.timeline || '2-4 weeks'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="price">{formatPrice(service.price)}</span>
                  </div>
                </div>

                <div className="service-actions">
                  <button
                    type="button"
                    className="btn-order"
                    onClick={() => handleOrderNow(service)}
                  >
                    <FaShoppingCart />
                    <span>{isLoggedIn ? 'Order Now' : 'Register to Order'}</span>
                  </button>
                  <button className="btn-cart" onClick={() => handleAddToCart(service)}>
                    <FaCartPlus />
                    <span>Add to Cart</span>
                  </button>
                  <button className="btn-view" onClick={() => handleViewDetails(service)}>
                    <FaEye />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <h3>No services found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Browse & Select</h3>
            <p>Explore our services and choose what you need</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Customize</h3>
            <p>Specify dimensions, materials, and design preferences</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get Quote</h3>
            <p>Receive a detailed quotation for your project</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Track Progress</h3>
            <p>Monitor your order through every production stage</p>
          </div>
        </div>
      </div>

      {selectedService && (
        <div className="service-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="service-modal" onClick={(event) => event.stopPropagation()}>
            <div className="service-modal-image">
              <img
                src={resolveImage(selectedService.image) || placeholderImage}
                alt={selectedService.name}
              />
            </div>
            <div className="service-modal-content">
              <div className="service-modal-header">
                <div>
                  <h2>{selectedService.name}</h2>
                </div>
                <span className="service-modal-badge">{selectedService.category || 'custom'}</span>
              </div>

              <div className="service-modal-meta">
                <span><strong>Price:</strong> {formatPrice(selectedService.price)}</span>
                <span><strong>Timeline:</strong> {selectedService.timeline || '2-4 weeks'}</span>
                <span><strong>Rating:</strong> {selectedService.rating ? selectedService.rating.toFixed(1) : '4.5'}</span>
              </div>

              <p className="service-description">{selectedService.description}</p>

              <div className="service-features">
                {(Array.isArray(selectedService.features) ? selectedService.features : selectedService.features ? [selectedService.features] : [])
                  .map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
              </div>

              <div className="service-modal-actions">
                <button
                  type="button"
                  className="btn-order"
                  onClick={() => {
                    handleOrderNow(selectedService);
                    closeModal();
                  }}
                >
                  <FaShoppingCart />
                  <span>{isLoggedIn ? 'Order Now' : 'Register to Order'}</span>
                </button>
                <button
                  className="btn-cart"
                  onClick={() => {
                    handleAddToCart(selectedService);
                    closeModal();
                  }}
                >
                  <FaCartPlus />
                  <span>Add to Cart</span>
                </button>
                <button className="service-modal-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
